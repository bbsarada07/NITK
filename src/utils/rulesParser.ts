import { RuleRecord, RuleTier, EvaluationResult } from '../types/types';

interface RawSource {
  id: string;
  name: string;
  year: number | null;
  link: string | null;
  status: string;
}

interface RawRangeDef {
  min: number | null;
  minInclusive: boolean;
  max: number | null;
  maxInclusive: boolean;
}

interface RawTierCutoff {
  id: string;
  label: string;
  ranges: RawRangeDef[];
  sourceIds: string[];
  status: string;
}

interface RawSymptomTrigger {
  id: string;
  label: string;
  sourceId: string;
}

interface RawCaveat {
  text: string;
  sourceId: string | null;
}

interface RawRuleItem {
  marker: string;
  population: {
    description: string;
    sex: string;
    pregnant: boolean | null;
    minAgeYears: number | null;
    maxAgeYears: number | null;
  };
  unit: {
    canonical: string;
    conversions: Array<{ from: string; multiplier: number }>;
  };
  tierCutoffs: RawTierCutoff[];
  symptomTriggers: RawSymptomTrigger[];
  minSymptoms: {
    value: number;
    reason: string;
  };
  flagMessage: {
    pattern: string;
    valueOnly: string;
  };
  doctorQuestions: string[];
  caveats: RawCaveat[];
  sources: RawSource[];
  lastVerified: string | null;
}

interface RawRulesJson {
  schemaVersion: string;
  rules: RawRuleItem[];
}

/**
 * Normalizes symptom strings for comparison (e.g. "hair loss" -> "hair_loss" or exact match)
 */
export function normalizeSymptomKey(symptom: string): string {
  return symptom.toLowerCase().trim().replace(/[\s-]+/g, '_');
}

/**
 * Parses raw JSON rules object into typed RuleRecord[]
 */
export function parseRulesJson(rawJson: unknown): RuleRecord[] {
  if (!rawJson || typeof rawJson !== 'object') {
    throw new Error('Invalid rules.json data format');
  }

  const typedJson = rawJson as RawRulesJson;
  const rawRules = typedJson.rules || [];

  return rawRules.map((rawRule: RawRuleItem): RuleRecord => {
    const sourcesMap = new Map<string, string>();
    rawRule.sources.forEach(src => {
      const yearStr = src.year ? ` (${src.year})` : '';
      sourcesMap.set(src.id, `${src.name}${yearStr}`);
    });

    const symptomTriggerIds = rawRule.symptomTriggers.map(s => s.id);

    const guidelineTiers: RuleTier[] = rawRule.tierCutoffs.map(tier => {
      const conditionParts: string[] = [];
      tier.ranges.forEach(range => {
        if (range.min === null && range.max !== null) {
          conditionParts.push(`< ${range.max} ${rawRule.unit.canonical}`);
        } else if (range.min !== null && range.max !== null) {
          conditionParts.push(`${range.min} - <${range.max} ${rawRule.unit.canonical}`);
        } else if (range.min !== null && range.max === null) {
          conditionParts.push(`>= ${range.min} ${rawRule.unit.canonical}`);
        }
      });

      const sourceNames = tier.sourceIds
        .map(id => sourcesMap.get(id) || id)
        .join('; ');

      const cutoffCondition = conditionParts.join(' or ') || tier.label;

      return {
        tier_name: `Tier ${tier.id}: ${tier.label}`,
        cutoff_condition: cutoffCondition,
        symptom_triggers: symptomTriggerIds,
        min_symptoms_required: rawRule.minSymptoms?.value ?? 2,
        warning_message: rawRule.flagMessage?.pattern || 'Marker value meets clinical review threshold.',
        source_citation: sourceNames || 'Clinical Practice Guidelines'
      };
    });

    const caveatsText = rawRule.caveats.map(c => c.text).join(' ');

    return {
      marker: rawRule.marker,
      population: rawRule.population?.description || 'adult, female, non-pregnant',
      unit: rawRule.unit?.canonical || '',
      guideline_tiers: guidelineTiers,
      caveats: caveatsText
    };
  });
}

/**
 * Checks if a given number matches any range in a tier cutoff condition
 */
export function testValueInTier(value: number, tierCutoffStr: string, marker: string): boolean {
  if (marker === 'ferritin') {
    if (tierCutoffStr.includes('Tier A') || tierCutoffStr.includes('<15')) {
      return value < 15;
    }
    if (tierCutoffStr.includes('Tier B') || tierCutoffStr.includes('15 to <30')) {
      return value >= 15 && value < 30;
    }
  }

  if (marker === 'hemoglobin') {
    if (tierCutoffStr.includes('Tier A') || tierCutoffStr.includes('<12') || tierCutoffStr.includes('< 12')) {
      return value < 12.0;
    }
  }

  if (marker === 'tsh') {
    if (tierCutoffStr.includes('Tier A') || tierCutoffStr.includes('<0.4 or >=4.0') || tierCutoffStr.includes('< 0.4') || tierCutoffStr.includes('>= 4')) {
      return value < 0.4 || value >= 4.0;
    }
    if (tierCutoffStr.includes('Tier B') || tierCutoffStr.includes('2.5 to <4.0') || tierCutoffStr.includes('2.5 - <4')) {
      return value >= 2.5 && value < 4.0;
    }
  }

  return false;
}

export interface MarkerEvalInput {
  marker: string;
  value: number;
  unit: string;
  labRange: string;
}

/**
 * Evaluates markers against parsed RuleRecords and patient symptoms
 */
export function evaluateLabInputs(
  rules: RuleRecord[],
  inputs: MarkerEvalInput[],
  selectedSymptoms: string[]
): EvaluationResult[] {
  const results: EvaluationResult[] = [];
  const normalizedLoggedSymptoms = selectedSymptoms.map(normalizeSymptomKey);

  for (const input of inputs) {
    if (typeof input.value !== 'number' || isNaN(input.value)) continue;

    const matchedRule = rules.find(
      r => r.marker.toLowerCase() === input.marker.toLowerCase()
    );

    if (!matchedRule) continue;

    for (const tier of matchedRule.guideline_tiers) {
      const isMatched = testValueInTier(input.value, tier.tier_name, matchedRule.marker);

      if (isMatched) {
        // Find symptoms relevant to this marker that the patient selected
        const matchedSymptoms = selectedSymptoms.filter(sym => {
          const norm = normalizeSymptomKey(sym);
          return tier.symptom_triggers.some(trig => {
            const normTrig = normalizeSymptomKey(trig);
            return norm === normTrig || norm.includes(normTrig) || normTrig.includes(norm);
          });
        });

        // Determine if clinical flag applies:
        // Tier A represents definitive out-of-range / deficiency cutoffs (flags even with 0 or 1 symptom).
        // Tier B represents borderline / debated patterns which are clinically significant when paired with symptoms or value review.
        const isTierA = tier.tier_name.includes('Tier A');
        const meetsSymptomThreshold = matchedSymptoms.length >= tier.min_symptoms_required;

        if (isTierA || meetsSymptomThreshold || matchedSymptoms.length > 0) {
          results.push({
            marker: matchedRule.marker,
            value: input.value,
            unit: input.unit || matchedRule.unit,
            labRange: input.labRange,
            matchedTier: tier,
            matchedSymptoms
          });
          // Match the most specific tier first per marker
          break;
        }
      }
    }
  }

  return results;
}
