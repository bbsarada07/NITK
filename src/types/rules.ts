/**
 * Type definitions and schemas for HerChart Rules and Evaluation
 */

export interface Population {
  description: string;
  sex: 'female' | 'male' | 'all' | string;
  pregnant: boolean | null;
  minAgeYears: number | null;
  maxAgeYears: number | null;
}

export interface UnitConversion {
  from: string;
  multiplier: number;
}

export interface UnitConfig {
  canonical: string;
  conversions: UnitConversion[];
}

export interface RangeDef {
  min: number | null;
  minInclusive: boolean;
  max: number | null;
  maxInclusive: boolean;
}

export interface TierCutoff {
  id: string;
  label: string;
  ranges: RangeDef[];
  sourceIds: string[];
  status: 'VERIFIED' | 'VERIFIED_RECHECK_ORIGINAL' | string;
}

export interface SymptomTrigger {
  id: string;
  label: string;
  sourceId: string;
}

export interface MinSymptoms {
  value: number;
  reason: string;
}

export interface FlagMessageTemplate {
  pattern: string;
  valueOnly: string;
}

export interface Caveat {
  text: string;
  sourceId: string | null;
}

export interface Source {
  id: string;
  name: string;
  year: number | null;
  link: string | null;
  status: string;
}

export interface RuleRecord {
  marker: string;
  population: Population;
  unit: UnitConfig;
  tierCutoffs: TierCutoff[];
  symptomTriggers: SymptomTrigger[];
  minSymptoms: MinSymptoms;
  flagMessage: FlagMessageTemplate;
  doctorQuestions: string[];
  caveats: Caveat[];
  sources: Source[];
  lastVerified: string | null;
}

export interface RulesFile {
  schemaVersion: string;
  rules: RuleRecord[];
}

export type EvaluatorMode = 'dev' | 'prod';

export interface GateVerificationCheck {
  isBlocked: boolean;
  reasons: string[];
}

export interface DemographicContext {
  sex?: 'female' | 'male' | string;
  pregnant?: boolean;
  ageYears?: number;
}

export interface EvaluateMarkerInput {
  marker: string;
  value: number;
  unit: string;
  symptoms?: string[];
  labRange?: string;
  demographics?: DemographicContext;
  mode?: EvaluatorMode;
}

export interface TierEvaluationResult {
  marker: string;
  rawInputValue: number;
  rawInputUnit: string;
  normalizedValue: number;
  canonicalUnit: string;
  matchedTier: TierCutoff | null;
  isFlagged: boolean;
  flagType: 'pattern' | 'valueOnly' | 'none';
  flagMessage: string;
  matchedSymptoms: Array<{ id: string; label: string }>;
  symptomThresholdMet: boolean;
  doctorQuestions: string[];
  caveats: Caveat[];
  sourcesUsed: Source[];
  demographicsWarning?: string;
  gateCheck: GateVerificationCheck;
  /** Human-readable marker name (e.g. "TSH"). */
  displayName: string;
  /** Tier label adjusted for direction on two-range tiers; null when no tier matched. */
  tierDisplayLabel: string | null;
  /** Which side of the guideline cutoffs the value fell on; null when no tier matched. */
  direction: 'below' | 'above' | 'within' | null;
  minSymptoms: MinSymptoms;
}
