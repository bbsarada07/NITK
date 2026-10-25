import {
  RuleRecord,
  RulesFile,
  EvaluatorMode,
  GateVerificationCheck,
  RangeDef,
  TierCutoff,
  SymptomTrigger,
  Caveat,
  Source
} from '../types/rules';

export class RuleValidationError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'RuleValidationError';
  }
}

export class GateBlockedError extends Error {
  constructor(public readonly marker: string, public readonly reasons: string[]) {
    super(`Rule for '${marker}' is blocked in prod mode due to incomplete verification:\n- ${reasons.join('\n- ')}`);
    this.name = 'GateBlockedError';
  }
}

/**
 * Gate check function: blocks any rule with null link, null year, or null lastVerified in prod mode.
 */
export function checkRuleGate(rule: RuleRecord): GateVerificationCheck {
  const reasons: string[] = [];

  if (rule.lastVerified === null || rule.lastVerified === undefined) {
    reasons.push(`lastVerified is null (rule has not been verified for production)`);
  }

  for (const src of rule.sources) {
    if (src.link === null || src.link === undefined) {
      reasons.push(`source '${src.id}' (${src.name}) has null link`);
    }
    if (src.year === null || src.year === undefined) {
      reasons.push(`source '${src.id}' (${src.name}) has null year`);
    }
  }

  return {
    isBlocked: reasons.length > 0,
    reasons
  };
}

/**
 * Validates a single range definition
 */
function validateRange(range: unknown, index: number, tierId: string): RangeDef {
  if (!range || typeof range !== 'object') {
    throw new RuleValidationError(`Tier '${tierId}' range[${index}] must be an object`);
  }
  const r = range as Record<string, unknown>;

  if (r.min !== null && typeof r.min !== 'number') {
    throw new RuleValidationError(`Tier '${tierId}' range[${index}].min must be number or null`);
  }
  if (typeof r.minInclusive !== 'boolean') {
    throw new RuleValidationError(`Tier '${tierId}' range[${index}].minInclusive must be boolean`);
  }
  if (r.max !== null && typeof r.max !== 'number') {
    throw new RuleValidationError(`Tier '${tierId}' range[${index}].max must be number or null`);
  }
  if (typeof r.maxInclusive !== 'boolean') {
    throw new RuleValidationError(`Tier '${tierId}' range[${index}].maxInclusive must be boolean`);
  }

  return {
    min: r.min as number | null,
    minInclusive: r.minInclusive as boolean,
    max: r.max as number | null,
    maxInclusive: r.maxInclusive as boolean
  };
}

/**
 * Validates a single RuleRecord structure
 */
export function validateRuleRecord(raw: unknown, mode: EvaluatorMode = 'dev'): RuleRecord {
  if (!raw || typeof raw !== 'object') {
    throw new RuleValidationError('Rule record must be a valid non-null object');
  }

  const r = raw as Record<string, unknown>;

  if (typeof r.marker !== 'string' || !r.marker.trim()) {
    throw new RuleValidationError('Rule missing required string field: marker');
  }
  const marker = r.marker.trim();

  // Validate population
  if (!r.population || typeof r.population !== 'object') {
    throw new RuleValidationError(`Rule '${marker}' missing required object field: population`);
  }
  const pop = r.population as Record<string, unknown>;
  if (typeof pop.description !== 'string') {
    throw new RuleValidationError(`Rule '${marker}' population.description must be string`);
  }
  if (typeof pop.sex !== 'string') {
    throw new RuleValidationError(`Rule '${marker}' population.sex must be string`);
  }
  if (pop.pregnant !== null && typeof pop.pregnant !== 'boolean') {
    throw new RuleValidationError(`Rule '${marker}' population.pregnant must be boolean or null`);
  }
  if (pop.minAgeYears !== null && typeof pop.minAgeYears !== 'number') {
    throw new RuleValidationError(`Rule '${marker}' population.minAgeYears must be number or null`);
  }
  if (pop.maxAgeYears !== null && typeof pop.maxAgeYears !== 'number') {
    throw new RuleValidationError(`Rule '${marker}' population.maxAgeYears must be number or null`);
  }

  // Validate unit
  if (!r.unit || typeof r.unit !== 'object') {
    throw new RuleValidationError(`Rule '${marker}' missing required object field: unit`);
  }
  const unit = r.unit as Record<string, unknown>;
  if (typeof unit.canonical !== 'string' || !unit.canonical.trim()) {
    throw new RuleValidationError(`Rule '${marker}' unit.canonical must be non-empty string`);
  }
  if (!Array.isArray(unit.conversions)) {
    throw new RuleValidationError(`Rule '${marker}' unit.conversions must be array`);
  }
  for (let i = 0; i < unit.conversions.length; i++) {
    const conv = unit.conversions[i];
    if (!conv || typeof conv !== 'object' || typeof conv.from !== 'string' || typeof conv.multiplier !== 'number') {
      throw new RuleValidationError(`Rule '${marker}' unit.conversions[${i}] must have 'from' string and 'multiplier' number`);
    }
  }

  // Validate tierCutoffs
  if (!Array.isArray(r.tierCutoffs) || r.tierCutoffs.length === 0) {
    throw new RuleValidationError(`Rule '${marker}' tierCutoffs must be a non-empty array`);
  }
  const tierCutoffs: TierCutoff[] = [];
  for (let i = 0; i < r.tierCutoffs.length; i++) {
    const t = r.tierCutoffs[i];
    if (!t || typeof t !== 'object') {
      throw new RuleValidationError(`Rule '${marker}' tierCutoffs[${i}] must be an object`);
    }
    if (typeof t.id !== 'string' || !t.id) {
      throw new RuleValidationError(`Rule '${marker}' tierCutoffs[${i}].id must be string`);
    }
    if (typeof t.label !== 'string') {
      throw new RuleValidationError(`Rule '${marker}' tierCutoffs[${i}].label must be string`);
    }
    if (!Array.isArray(t.ranges) || t.ranges.length === 0) {
      throw new RuleValidationError(`Rule '${marker}' tier '${t.id}' ranges must be a non-empty array`);
    }
    const ranges = t.ranges.map((rg: unknown, idx: number) => validateRange(rg, idx, t.id));
    if (!Array.isArray(t.sourceIds)) {
      throw new RuleValidationError(`Rule '${marker}' tier '${t.id}'.sourceIds must be an array`);
    }
    if (typeof t.status !== 'string') {
      throw new RuleValidationError(`Rule '${marker}' tier '${t.id}'.status must be string`);
    }
    tierCutoffs.push({
      id: t.id,
      label: t.label,
      ranges,
      sourceIds: t.sourceIds,
      status: t.status
    });
  }

  // Validate symptomTriggers
  if (!Array.isArray(r.symptomTriggers)) {
    throw new RuleValidationError(`Rule '${marker}' symptomTriggers must be array`);
  }
  const symptomTriggers: SymptomTrigger[] = [];
  for (let i = 0; i < r.symptomTriggers.length; i++) {
    const s = r.symptomTriggers[i];
    if (!s || typeof s !== 'object' || typeof s.id !== 'string' || typeof s.label !== 'string' || typeof s.sourceId !== 'string') {
      throw new RuleValidationError(`Rule '${marker}' symptomTriggers[${i}] invalid structure`);
    }
    symptomTriggers.push({ id: s.id, label: s.label, sourceId: s.sourceId });
  }

  // Validate minSymptoms
  if (!r.minSymptoms || typeof r.minSymptoms !== 'object') {
    throw new RuleValidationError(`Rule '${marker}' missing minSymptoms`);
  }
  const minSym = r.minSymptoms as Record<string, unknown>;
  if (typeof minSym.value !== 'number' || typeof minSym.reason !== 'string') {
    throw new RuleValidationError(`Rule '${marker}' minSymptoms must have numeric value and string reason`);
  }

  // Validate flagMessage
  if (!r.flagMessage || typeof r.flagMessage !== 'object') {
    throw new RuleValidationError(`Rule '${marker}' missing flagMessage`);
  }
  const fm = r.flagMessage as Record<string, unknown>;
  if (typeof fm.pattern !== 'string' || typeof fm.valueOnly !== 'string') {
    throw new RuleValidationError(`Rule '${marker}' flagMessage must contain pattern and valueOnly templates`);
  }

  // Validate doctorQuestions
  if (!Array.isArray(r.doctorQuestions) || !r.doctorQuestions.every(q => typeof q === 'string')) {
    throw new RuleValidationError(`Rule '${marker}' doctorQuestions must be an array of strings`);
  }

  // Validate caveats
  if (!Array.isArray(r.caveats)) {
    throw new RuleValidationError(`Rule '${marker}' caveats must be an array`);
  }
  const caveats: Caveat[] = [];
  for (let i = 0; i < r.caveats.length; i++) {
    const c = r.caveats[i];
    if (!c || typeof c !== 'object' || typeof c.text !== 'string' || (c.sourceId !== null && typeof c.sourceId !== 'string')) {
      throw new RuleValidationError(`Rule '${marker}' caveats[${i}] invalid format`);
    }
    caveats.push({ text: c.text, sourceId: c.sourceId });
  }

  // Validate sources
  if (!Array.isArray(r.sources) || r.sources.length === 0) {
    throw new RuleValidationError(`Rule '${marker}' sources must be a non-empty array`);
  }
  const sources: Source[] = [];
  for (let i = 0; i < r.sources.length; i++) {
    const s = r.sources[i];
    if (!s || typeof s !== 'object' || typeof s.id !== 'string' || typeof s.name !== 'string' || typeof s.status !== 'string') {
      throw new RuleValidationError(`Rule '${marker}' sources[${i}] missing required fields`);
    }
    if (s.year !== null && typeof s.year !== 'number') {
      throw new RuleValidationError(`Rule '${marker}' sources[${i}].year must be number or null`);
    }
    if (s.link !== null && typeof s.link !== 'string') {
      throw new RuleValidationError(`Rule '${marker}' sources[${i}].link must be string or null`);
    }
    sources.push({
      id: s.id,
      name: s.name,
      year: s.year,
      link: s.link,
      status: s.status
    });
  }

  // Validate lastVerified
  if (r.lastVerified !== null && typeof r.lastVerified !== 'string') {
    throw new RuleValidationError(`Rule '${marker}' lastVerified must be string or null`);
  }

  const validatedRule: RuleRecord = {
    marker,
    population: {
      description: pop.description as string,
      sex: pop.sex as string,
      pregnant: pop.pregnant as boolean | null,
      minAgeYears: pop.minAgeYears as number | null,
      maxAgeYears: pop.maxAgeYears as number | null
    },
    unit: {
      canonical: unit.canonical as string,
      conversions: unit.conversions as Array<{ from: string; multiplier: number }>
    },
    tierCutoffs,
    symptomTriggers,
    minSymptoms: {
      value: minSym.value as number,
      reason: minSym.reason as string
    },
    flagMessage: {
      pattern: fm.pattern as string,
      valueOnly: fm.valueOnly as string
    },
    doctorQuestions: r.doctorQuestions as string[],
    caveats,
    sources,
    lastVerified: r.lastVerified as string | null
  };

  // Gate enforcement in prod mode
  if (mode === 'prod') {
    const gate = checkRuleGate(validatedRule);
    if (gate.isBlocked) {
      throw new GateBlockedError(marker, gate.reasons);
    }
  }

  return validatedRule;
}

/**
 * Validates the full rules.json file contents
 */
export function validateRulesFile(raw: unknown, mode: EvaluatorMode = 'dev'): RulesFile {
  if (!raw || typeof raw !== 'object') {
    throw new RuleValidationError('Rules file content must be a non-null object');
  }
  const f = raw as Record<string, unknown>;
  if (typeof f.schemaVersion !== 'string' || !f.schemaVersion.trim()) {
    throw new RuleValidationError('Missing or invalid schemaVersion in rules file');
  }
  if (!Array.isArray(f.rules)) {
    throw new RuleValidationError('Rules file must contain a rules array');
  }

  const rules: RuleRecord[] = [];
  for (let i = 0; i < f.rules.length; i++) {
    rules.push(validateRuleRecord(f.rules[i], mode));
  }

  return {
    schemaVersion: f.schemaVersion,
    rules
  };
}

