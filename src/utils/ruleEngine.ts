import rawRulesData from '../../rules.json';
import { ExtractedLabData, EvaluationResult, RuleTier, RuleRecord } from '../types/types';

interface RawRuleRange {
  min: number | null;
  minInclusive: boolean;
  max: number | null;
  maxInclusive: boolean;
}

interface RawRuleTier {
  id: string;
  label: string;
  ranges: RawRuleRange[];
  sourceIds: string[];
  status?: string;
}

interface RawRuleSource {
  id: string;
  name: string;
  year: number | null;
  link: string | null;
  status: string;
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
  tierCutoffs: RawRuleTier[];
  symptomTriggers: Array<{ id: string; label: string; sourceId: string }>;
  minSymptoms: {
    value: number;
    reason: string;
  };
  flagMessage: {
    pattern: string;
    valueOnly: string;
  };
  doctorQuestions: string[];
  caveats: Array<{ text: string; sourceId: string | null }>;
  sources: RawRuleSource[];
}

/**
 * Normalizes symptom strings for loose matching (e.g., "hair loss" matches "hair_loss")
 */
export function normalizeSymptom(s: string): string {
  return s.toLowerCase().trim().replace(/[\s_-]+/g, '');
}

/**
 * Determines whether a numeric value falls within a defined RangeDef.
 */
function isWithinRange(val: number, range: RawRuleRange): boolean {
  if (range.min !== null) {
    if (range.minInclusive ? val < range.min : val <= range.min) {
      return false;
    }
  }

  if (range.max !== null) {
    if (range.maxInclusive ? val > range.max : val >= range.max) {
      return false;
    }
  }

  return true;
}

/**
 * Converts raw rules.json data into typed RuleRecord instances
 */
export function loadAndParseRules(): RuleRecord[] {
  const rawList = (rawRulesData as { rules: RawRuleItem[] }).rules || [];

  return rawList.map(raw => {
    const sourceMap = new Map<string, string>();
    raw.sources.forEach(s => {
      const yr = s.year ? ` (${s.year})` : '';
      sourceMap.set(s.id, `${s.name}${yr}`);
    });

    const guideline_tiers: RuleTier[] = raw.tierCutoffs.map(tier => {
      const conditionStrings: string[] = [];
      tier.ranges.forEach(r => {
        if (r.min === null && r.max !== null) {
          conditionStrings.push(`< ${r.max} ${raw.unit.canonical}`);
        } else if (r.min !== null && r.max !== null) {
          conditionStrings.push(`${r.min} to <${r.max} ${raw.unit.canonical}`);
        } else if (r.min !== null && r.max === null) {
          conditionStrings.push(`>= ${r.min} ${raw.unit.canonical}`);
        }
      });

      const citations = tier.sourceIds
        .map(id => sourceMap.get(id) || id)
        .join('; ');

      return {
        tier_name: `Tier ${tier.id}: ${tier.label}`,
        cutoff_condition: conditionStrings.join(' or ') || tier.label,
        symptom_triggers: raw.symptomTriggers.map(st => st.id),
        min_symptoms_required: raw.minSymptoms?.value ?? 2,
        warning_message: raw.flagMessage.pattern,
        source_citation: citations || 'Clinical Practice Guidelines'
      };
    });

    return {
      marker: raw.marker,
      population: raw.population.description,
      unit: raw.unit.canonical,
      guideline_tiers,
      caveats: raw.caveats.map(c => c.text).join(' ')
    };
  });
}

/**
 * Core Evaluation Engine: Evaluates extracted lab values against multi-tier clinical guidelines
 * and correlates with patient-reported symptoms.
 * 
 * @param extractedLabs Extracted numeric values & units for ferritin, hemoglobin, tsh
 * @param selectedSymptoms List of symptoms reported by the patient
 * @returns Array of matched EvaluationResult objects
 */
export function evaluateLabsAndSymptoms(
  extractedLabs: ExtractedLabData,
  selectedSymptoms: string[]
): EvaluationResult[] {
  const rules = (rawRulesData as { rules: RawRuleItem[] }).rules || [];
  const results: EvaluationResult[] = [];

  const markersToCheck: Array<{
    key: 'ferritin' | 'hemoglobin' | 'tsh';
    data: { value: number | null; unit: string | null; labRange?: string | null };
  }> = [
    { key: 'ferritin', data: extractedLabs.ferritin },
    { key: 'hemoglobin', data: extractedLabs.hemoglobin },
    { key: 'tsh', data: extractedLabs.tsh }
  ];

  for (const { key, data } of markersToCheck) {
    if (data.value === null || typeof data.value !== 'number' || isNaN(data.value)) {
      continue;
    }

    const rule = rules.find(r => r.marker.toLowerCase() === key.toLowerCase());
    if (!rule) continue;

    const sourceMap = new Map<string, string>();
    rule.sources.forEach(s => {
      const yr = s.year ? ` (${s.year})` : '';
      sourceMap.set(s.id, `${s.name}${yr}`);
    });

    // Check each tier cutoff
    for (const tier of rule.tierCutoffs) {
      const matchesValue = tier.ranges.some(r => isWithinRange(data.value as number, r));

      if (matchesValue) {
        // Correlate with patient's reported symptoms
        const ruleSymptomKeys = rule.symptomTriggers.map(st => st.id);
        const matchedSymptoms = selectedSymptoms.filter(sym => {
          const normSym = normalizeSymptom(sym);
          return ruleSymptomKeys.some(trig => {
            const normTrig = normalizeSymptom(trig);
            return normSym === normTrig || normSym.includes(normTrig) || normTrig.includes(normSym);
          });
        });

        const minRequired = rule.minSymptoms?.value ?? 2;
        const isTierA = tier.id === 'A';
        const hasEnoughSymptoms = matchedSymptoms.length >= minRequired;

        // Flags are triggered if it's Tier A (clear deficiency cutoff) OR if symptoms correlate
        if (isTierA || hasEnoughSymptoms || matchedSymptoms.length > 0) {
          const conditionParts: string[] = [];
          tier.ranges.forEach(r => {
            if (r.min === null && r.max !== null) {
              conditionParts.push(`< ${r.max} ${rule.unit.canonical}`);
            } else if (r.min !== null && r.max !== null) {
              conditionParts.push(`${r.min} to <${r.max} ${rule.unit.canonical}`);
            } else if (r.min !== null && r.max === null) {
              conditionParts.push(`>= ${r.min} ${rule.unit.canonical}`);
            }
          });

          const citations = tier.sourceIds
            .map(id => sourceMap.get(id) || id)
            .join('; ');

          const warningMessage = matchedSymptoms.length > 0
            ? rule.flagMessage.pattern
                .replace('{value}', String(data.value))
                .replace('{unit}', data.unit || rule.unit.canonical)
                .replace('{tierLabel}', tier.label)
                .replace('{source}', citations)
                .replace('{year}', '')
                .replace('{labRange}', data.labRange || 'Standard Lab Reference')
                .replace('{symptomSource}', 'Clinical Guideline Reviews')
                .replace('{matchedSymptoms}', matchedSymptoms.join(', '))
                .replace('{caveat}', rule.caveats[0]?.text || '')
            : rule.flagMessage.valueOnly
                .replace('{value}', String(data.value))
                .replace('{unit}', data.unit || rule.unit.canonical)
                .replace('{tierLabel}', tier.label)
                .replace('{source}', citations)
                .replace('{year}', '')
                .replace('{labRange}', data.labRange || 'Standard Lab Reference')
                .replace('{caveat}', rule.caveats[0]?.text || '');

          const ruleTier: RuleTier = {
            tier_name: `Tier ${tier.id}: ${tier.label}`,
            cutoff_condition: conditionParts.join(' or ') || tier.label,
            symptom_triggers: ruleSymptomKeys,
            min_symptoms_required: minRequired,
            warning_message: warningMessage,
            source_citation: citations || 'WHO & Endocrine Society Guidelines'
          };

          const defaultRange = key === 'ferritin' ? '15 - 150 ug/L' : key === 'hemoglobin' ? '12.0 - 15.5 g/dL' : '0.4 - 4.0 mIU/L';

          results.push({
            marker: rule.marker,
            value: data.value,
            unit: data.unit || rule.unit.canonical,
            labRange: data.labRange || defaultRange,
            matchedTier: ruleTier,
            matchedSymptoms
          });

          // Match the primary/most urgent tier per marker
          break;
        }
      }
    }
  }

  return results;
}
