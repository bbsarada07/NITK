/**
 * HerChart Core TypeScript Interfaces
 * Clinical types for biomarker rule records, guideline tiers, and evaluation results.
 */

export type BiomarkerValue = number | '';

export interface RuleTier {
  tier_name: string;
  cutoff_condition: string;
  symptom_triggers: string[];
  min_symptoms_required: number;
  warning_message: string;
  source_citation: string;
}

export interface RuleRecord {
  marker: string;
  population: string;
  unit: string;
  guideline_tiers: RuleTier[];
  caveats: string;
}

export interface EvaluationResult {
  marker: string;
  value: number;
  unit: string;
  labRange: string;
  matchedTier: RuleTier;
  matchedSymptoms: string[];
}

export interface BiomarkerEntry {
  marker: string;
  label: string;
  value: BiomarkerValue;
  unit: string;
  labRange: string;
  description: string;
}

export interface MarkerInput {
  marker: string;
  displayName: string;
  value: BiomarkerValue;
  unit: string;
  labRange: string;
  standardLow: number;
  standardHigh: number;
  guidelineThreshold: string;
}

export interface ExtractedMarker {
  value: number | null;
  unit: string | null;
  labRange?: string | null;
}

export interface ExtractedLabData {
  ferritin: ExtractedMarker;
  hemoglobin: ExtractedMarker;
  tsh: ExtractedMarker;
}
