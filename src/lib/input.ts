import type { MarkerId } from './rules';
import { unitMultiplier } from './rules';

/**
 * Input sanity checks, not clinical limits: they only catch typos (e.g. an extra zero).
 * Bounds are in each marker's canonical unit.
 */
export const SANITY_MAX: Record<MarkerId, number> = {
  ferritin: 5000,
  hemoglobin: 25,
  tsh: 500
};

/** Parses a non-negative decimal; accepts a comma as the decimal separator ("11,8"). */
export function parseDecimal(raw: string): number | null {
  const s = raw.trim().replace(/\s+/g, '');
  if (!s) return null;
  let normalized = s;
  if (s.includes(',') && !s.includes('.')) {
    if ((s.match(/,/g) || []).length > 1) return null;
    normalized = s.replace(',', '.');
  }
  if (!/^(\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export interface MarkerFormValue {
  value: string;
  unit: string;
  low: string;
  high: string;
  collectionDate: string;
}

export interface ValidMarkerInput {
  marker: MarkerId;
  value: number;
  unit: string;
  labLow: number | null;
  labHigh: number | null;
  collectionDate: string | null;
}

export interface MarkerErrors {
  value?: string;
  range?: string;
  unit?: string;
}

export type MarkerValidation =
  | { status: 'empty' }
  | { status: 'invalid'; errors: MarkerErrors }
  | { status: 'ok'; input: ValidMarkerInput };

export function validateMarker(marker: MarkerId, form: MarkerFormValue): MarkerValidation {
  const errors: MarkerErrors = {};
  const nothingEntered = !form.value.trim() && !form.low.trim() && !form.high.trim();
  if (nothingEntered) return { status: 'empty' };

  const multiplier = unitMultiplier(marker, form.unit);
  if (multiplier === null) errors.unit = 'Choose the unit printed on your report.';

  const value = parseDecimal(form.value);
  if (!form.value.trim()) errors.value = 'Enter your result, or clear the lab range to skip this test.';
  else if (value === null || value <= 0) errors.value = 'Enter a positive number, for example 11.8 or 11,8.';
  else if (multiplier !== null && value * multiplier > SANITY_MAX[marker]) {
    errors.value = 'That number looks too large. Please check it against your report (input sanity check, not a clinical limit).';
  }

  const lowRaw = form.low.trim();
  const highRaw = form.high.trim();
  let labLow: number | null = null;
  let labHigh: number | null = null;
  if (lowRaw || highRaw) {
    labLow = lowRaw ? parseDecimal(lowRaw) : null;
    labHigh = highRaw ? parseDecimal(highRaw) : null;
    if ((lowRaw && labLow === null) || (highRaw && labHigh === null)) {
      errors.range = 'Lab range values must be numbers.';
    } else if (labLow === null || labHigh === null) {
      errors.range = 'Enter both ends of the lab range, or leave both empty.';
    } else if (labLow >= labHigh) {
      errors.range = 'The lower end must be smaller than the upper end. Check if they are swapped.';
    }
  }

  if (Object.keys(errors).length > 0) return { status: 'invalid', errors };
  return {
    status: 'ok',
    input: {
      marker,
      value: value as number,
      unit: form.unit,
      labLow,
      labHigh,
      collectionDate: form.collectionDate || null
    }
  };
}

export function formatLabRange(low: number | null, high: number | null, unit: string): string | null {
  if (low === null || high === null) return null;
  return `${low}–${high} ${unit}`;
}

/** Position of the value relative to the user's own lab range (same unit as entered). */
export function labPosition(value: number, low: number | null, high: number | null): 'below' | 'inside' | 'above' | null {
  if (low === null || high === null) return null;
  if (value < low) return 'below';
  if (value > high) return 'above';
  return 'inside';
}

export interface Eligibility {
  eligible: boolean;
  reason: 'missing_age' | 'invalid_age' | 'under_18' | 'pregnant' | 'missing_pregnancy' | null;
}

/** Population gate from rules.json: adult (minAgeYears), non-pregnant. */
export function checkEligibility(ageRaw: string, pregnant: '' | 'yes' | 'no', minAgeYears = 18): Eligibility {
  if (!ageRaw.trim()) return { eligible: false, reason: 'missing_age' };
  const age = parseDecimal(ageRaw);
  if (age === null || age > 120) return { eligible: false, reason: 'invalid_age' };
  if (age < minAgeYears) return { eligible: false, reason: 'under_18' };
  if (pregnant === 'yes') return { eligible: false, reason: 'pregnant' };
  if (pregnant === '') return { eligible: false, reason: 'missing_pregnancy' };
  return { eligible: true, reason: null };
}
