import { evaluateTier } from '../evaluator/tierEvaluator';
import type { TierEvaluationResult } from '../types/rules';
import { getRule, unitMultiplier, type MarkerId } from './rules';
import { formatLabRange, labPosition, type ValidMarkerInput } from './input';

export interface EvaluatedMarker {
  marker: MarkerId;
  input: ValidMarkerInput;
  result: TierEvaluationResult;
  labRangeText: string | null;
  labPosition: 'below' | 'inside' | 'above' | null;
  /** Lab range converted to the rule's canonical unit (for the gauge). */
  labLowCanonical: number | null;
  labHighCanonical: number | null;
}

/** Runs the deterministic evaluator. This is the only place tiers and flags are decided. */
export function evaluateMarkers(inputs: ValidMarkerInput[], symptoms: string[]): EvaluatedMarker[] {
  return inputs.map(input => {
    const labRangeText = formatLabRange(input.labLow, input.labHigh, input.unit);
    const result = evaluateTier(
      {
        marker: input.marker,
        value: input.value,
        unit: input.unit,
        symptoms,
        labRange: labRangeText ?? undefined
      },
      getRule(input.marker),
      'dev'
    );
    const m = unitMultiplier(input.marker, input.unit) ?? 1;
    return {
      marker: input.marker,
      input,
      result,
      labRangeText,
      labPosition: labPosition(input.value, input.labLow, input.labHigh),
      labLowCanonical: input.labLow !== null ? Number((input.labLow * m).toFixed(6)) : null,
      labHighCanonical: input.labHigh !== null ? Number((input.labHigh * m).toFixed(6)) : null
    };
  });
}

export function tierRank(e: EvaluatedMarker): number {
  if (!e.result.matchedTier) return 2;
  return e.result.matchedTier.id === 'A' ? 0 : 1;
}

/** Doctor questions from all results, de-duplicated, flagged markers first. */
export function prioritizedQuestions(results: EvaluatedMarker[]): Array<{ marker: string; text: string }> {
  const seen = new Set<string>();
  const out: Array<{ marker: string; text: string }> = [];
  for (const e of [...results].sort((a, b) => tierRank(a) - tierRank(b))) {
    for (const q of e.result.doctorQuestions) {
      const key = q.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ marker: e.result.displayName, text: q });
    }
  }
  return out;
}
