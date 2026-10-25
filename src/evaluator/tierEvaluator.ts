import {
  RuleRecord,
  TierCutoff,
  RangeDef,
  EvaluateMarkerInput,
  TierEvaluationResult,
  EvaluatorMode,
  Source
} from '../types/rules';
import { checkRuleGate, GateBlockedError } from '../rules/validate';

/**
 * Normalizes input value to the rule's canonical unit.
 */
export function normalizeUnit(
  value: number,
  inputUnit: string,
  rule: RuleRecord
): { normalizedValue: number; canonicalUnit: string } {
  const canonical = rule.unit.canonical.trim();
  const trimmedInput = inputUnit.trim();

  // Exact match or case-insensitive match
  if (trimmedInput.toLowerCase() === canonical.toLowerCase()) {
    return { normalizedValue: value, canonicalUnit: canonical };
  }

  // Check conversions table
  for (const conv of rule.unit.conversions) {
    if (conv.from.trim().toLowerCase() === trimmedInput.toLowerCase()) {
      return {
        normalizedValue: Number((value * conv.multiplier).toFixed(6)),
        canonicalUnit: canonical
      };
    }
  }

  throw new Error(
    `Unsupported unit '${inputUnit}' for marker '${rule.marker}'. Supported units: ${canonical}, ${rule.unit.conversions.map(c => c.from).join(', ')}`
  );
}

/**
 * Checks if a value satisfies a specific RangeDef
 */
export function isValueInRange(val: number, range: RangeDef): boolean {
  // Check lower bound
  if (range.min !== null) {
    if (range.minInclusive) {
      if (val < range.min) return false;
    } else {
      if (val <= range.min) return false;
    }
  }

  // Check upper bound
  if (range.max !== null) {
    if (range.maxInclusive) {
      if (val > range.max) return false;
    } else {
      if (val >= range.max) return false;
    }
  }

  return true;
}

/**
 * Evaluates which tier cutoff matches the normalized value
 */
export function findMatchingTier(normalizedVal: number, rule: RuleRecord): TierCutoff | null {
  for (const tier of rule.tierCutoffs) {
    // If any range in the tier matches, the tier matches
    const matches = tier.ranges.some(range => isValueInRange(normalizedVal, range));
    if (matches) {
      return tier;
    }
  }
  return null;
}

/**
 * Checks demographic applicability and returns any warnings
 */
export function checkDemographics(rule: RuleRecord, input: EvaluateMarkerInput): string | undefined {
  if (!input.demographics) return undefined;

  const warnings: string[] = [];
  const { sex, pregnant, ageYears } = input.demographics;

  if (rule.population.sex && sex && sex.toLowerCase() !== rule.population.sex.toLowerCase()) {
    warnings.push(`Rule is designed for ${rule.population.sex}, but profile sex is ${sex}`);
  }

  if (rule.population.pregnant === false && pregnant === true) {
    warnings.push(`Rule excludes pregnancy by design. Trimester-specific reference ranges apply during pregnancy.`);
  }

  if (rule.population.minAgeYears !== null && ageYears !== undefined && ageYears < rule.population.minAgeYears) {
    warnings.push(`Age ${ageYears} is below guideline minimum age ${rule.population.minAgeYears}`);
  }

  if (rule.population.maxAgeYears !== null && ageYears !== undefined && ageYears > rule.population.maxAgeYears) {
    warnings.push(`Age ${ageYears} is above guideline maximum age ${rule.population.maxAgeYears}`);
  }

  return warnings.length > 0 ? warnings.join('; ') : undefined;
}

/** Human-readable marker names; rule ids stay internal. */
export const MARKER_DISPLAY_NAMES: Record<string, string> = {
  ferritin: 'Ferritin',
  hemoglobin: 'Hemoglobin',
  tsh: 'TSH'
};

export function markerDisplayName(marker: string): string {
  return MARKER_DISPLAY_NAMES[marker.toLowerCase()] ?? marker;
}

/**
 * Formats template strings by replacing {token} placeholders.
 * A null token is removed together with its surrounding " ({token})" so that
 * unknown values (e.g. a source with no recorded year) are omitted, never printed.
 */
export function interpolateTemplate(template: string, vars: Record<string, string | number | null>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    if (val === null || val === '') {
      result = result.split(` ({${key}})`).join('');
      result = result.split(`({${key}})`).join('');
      result = result.split(`{${key}}`).join('');
    } else {
      result = result.split(`{${key}}`).join(String(val));
    }
  }
  return result.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Finds which range of a tier matched and whether it lies below, above or within the
 * tier's cutoffs. Used for direction-aware wording on tiers with two ranges (TSH tier A).
 */
export function describeMatchedRange(
  normalizedVal: number,
  tier: TierCutoff,
  canonicalUnit: string
): { range: RangeDef | null; direction: 'below' | 'above' | 'within' | null; label: string } {
  const range = tier.ranges.find(r => isValueInRange(normalizedVal, r)) ?? null;
  if (!range) return { range: null, direction: null, label: tier.label };
  const direction = range.min === null ? 'below' : range.max === null ? 'above' : 'within';
  if (tier.ranges.length < 2) return { range, direction, label: tier.label };

  const base = tier.label.split(' (')[0].trim();
  let detail = '';
  if (direction === 'below' && range.max !== null) {
    detail = `below ${range.maxInclusive ? 'or at ' : ''}${range.max} ${canonicalUnit} (lower end)`;
  } else if (direction === 'above' && range.min !== null) {
    detail = `${range.minInclusive ? 'at or above' : 'above'} ${range.min} ${canonicalUnit} (upper end)`;
  } else if (range.min !== null && range.max !== null) {
    detail = `${range.min} to <${range.max} ${canonicalUnit}`;
  }
  return { range, direction, label: detail ? `${base}: ${detail}` : tier.label };
}

/**
 * Evaluates a single lab marker against a validated RuleRecord.
 * 
 * Implements strict logic:
 * - Code decides flags deterministically (LLM only reads the generated report).
 * - Gate enforcement: In 'prod' mode, blocks any rule with null link/year/lastVerified.
 * - Unit normalization.
 * - Tier cutoff matching.
 * - Symptom trigger threshold check.
 * - Standardized flag messages, caveats, and doctor discussion questions.
 */
export function evaluateTier(
  input: EvaluateMarkerInput,
  rule: RuleRecord,
  mode: EvaluatorMode = 'dev'
): TierEvaluationResult {
  const effectiveMode = input.mode || mode;

  // Gate enforcement in production mode
  const gateCheck = checkRuleGate(rule);
  if (effectiveMode === 'prod' && gateCheck.isBlocked) {
    throw new GateBlockedError(rule.marker, gateCheck.reasons);
  }

  // 1. Unit Normalization
  const { normalizedValue, canonicalUnit } = normalizeUnit(input.value, input.unit, rule);

  // 2. Demographics applicability
  const demographicsWarning = checkDemographics(rule, input);

  // 3. Tier Cutoff evaluation
  const matchedTier = findMatchingTier(normalizedValue, rule);

  // 4. Symptom Matching
  const inputSymptomSet = new Set((input.symptoms || []).map(s => s.trim().toLowerCase()));
  const matchedSymptoms: Array<{ id: string; label: string }> = [];

  for (const trigger of rule.symptomTriggers) {
    if (inputSymptomSet.has(trigger.id.toLowerCase()) || inputSymptomSet.has(trigger.label.toLowerCase())) {
      matchedSymptoms.push({ id: trigger.id, label: trigger.label });
    }
  }

  const symptomThresholdMet = matchedSymptoms.length >= rule.minSymptoms.value;

  // 5. Sources Resolution
  const sourceMap = new Map<string, Source>();
  for (const s of rule.sources) {
    sourceMap.set(s.id, s);
  }

  let primarySource: Source | undefined;
  if (matchedTier && matchedTier.sourceIds.length > 0) {
    primarySource = sourceMap.get(matchedTier.sourceIds[0]);
  }
  if (!primarySource && rule.sources.length > 0) {
    primarySource = rule.sources[0];
  }

  const sourcesUsed: Source[] = [];
  if (primarySource) sourcesUsed.push(primarySource);

  // Symptom source resolution
  let symptomSource: Source | undefined;
  if (matchedSymptoms.length > 0) {
    const triggerDef = rule.symptomTriggers.find(t => t.id === matchedSymptoms[0].id);
    if (triggerDef) {
      symptomSource = sourceMap.get(triggerDef.sourceId);
      if (symptomSource && !sourcesUsed.some(s => s.id === symptomSource?.id)) {
        sourcesUsed.push(symptomSource);
      }
    }
  }

  // 6. Flag Decision (Code decides flags deterministically)
  const isFlagged = matchedTier !== null;
  let flagType: 'pattern' | 'valueOnly' | 'none' = 'none';
  let flagMessage = '';

  const displayName = markerDisplayName(rule.marker);
  const labRangeStr = input.labRange && input.labRange.trim() ? input.labRange.trim() : 'not provided';
  const primaryCaveat = rule.caveats.length > 0 ? rule.caveats[0].text : '';
  const rangeInfo = matchedTier ? describeMatchedRange(normalizedValue, matchedTier, canonicalUnit) : null;

  if (isFlagged && matchedTier && rangeInfo) {
    const sourceName = primarySource ? primarySource.name : null;
    const sourceYear = primarySource && primarySource.year ? primarySource.year : null;
    const symSourceName = symptomSource ? symptomSource.name : null;
    const matchedSymptomsStr = matchedSymptoms.map(s => s.label).join(', ');
    const baseVars = {
      value: input.value,
      unit: input.unit,
      tierLabel: rangeInfo.label,
      source: sourceName,
      year: sourceYear,
      labRange: labRangeStr,
      caveat: primaryCaveat
    };

    if (symptomThresholdMet) {
      flagType = 'pattern';
      flagMessage = interpolateTemplate(rule.flagMessage.pattern, {
        ...baseVars,
        symptomSource: symSourceName,
        matchedSymptoms: matchedSymptomsStr
      });
    } else {
      flagType = 'valueOnly';
      flagMessage = interpolateTemplate(rule.flagMessage.valueOnly, baseVars);
    }
    // Templates start with "Your ferritin"; use the display name instead of the rule id.
    flagMessage = flagMessage.replace(`Your ${rule.marker} (`, `Your ${displayName} (`);
  } else {
    flagType = 'none';
    flagMessage = `Your ${displayName} (${input.value} ${input.unit}) is within standard guideline limits used here, so there is no guideline flag. Lab range: ${labRangeStr}. Symptoms that bother you are still worth discussing with a doctor.`;
  }

  return {
    marker: rule.marker,
    rawInputValue: input.value,
    rawInputUnit: input.unit,
    normalizedValue,
    canonicalUnit,
    matchedTier,
    isFlagged,
    flagType,
    flagMessage,
    matchedSymptoms,
    symptomThresholdMet,
    doctorQuestions: rule.doctorQuestions,
    caveats: rule.caveats,
    sourcesUsed,
    demographicsWarning,
    gateCheck,
    displayName,
    tierDisplayLabel: rangeInfo ? rangeInfo.label : null,
    direction: rangeInfo ? rangeInfo.direction : null,
    minSymptoms: rule.minSymptoms
  };
}
