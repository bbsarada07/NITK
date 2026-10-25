/**
 * Strict validation of the model's extraction output. The uploaded report is untrusted input:
 * the model may only return these fields, and anything else is dropped or rejected.
 */
export interface ExtractedRow {
  marker: 'ferritin' | 'hemoglobin' | 'tsh';
  value: number;
  unit: string | null;
  labRangeLow: number | null;
  labRangeHigh: number | null;
  collectionDate: string | null;
  confidence: number;
}

export interface ExtractionResult {
  rows: ExtractedRow[];
  notCovered: string[];
}

const SUPPORTED: Record<string, ExtractedRow['marker']> = {
  ferritin: 'ferritin',
  'serum ferritin': 'ferritin',
  hemoglobin: 'hemoglobin',
  haemoglobin: 'hemoglobin',
  hb: 'hemoglobin',
  hgb: 'hemoglobin',
  tsh: 'tsh',
  'thyroid stimulating hormone': 'tsh',
  thyrotropin: 'tsh'
};

const ALLOWED_KEYS = new Set(['marker', 'value', 'unit', 'labRangeLow', 'labRangeHigh', 'collectionDate', 'confidence']);

function finiteOrNull(v: unknown): number | null | undefined {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 100000) return v;
  return undefined;
}

function cleanName(v: string): string {
  return v.replace(/[^\p{L}\p{N} ()\-+/.,%]/gu, '').trim().slice(0, 40);
}

/** Returns null when the payload is malformed; otherwise the validated rows. */
export function validateExtraction(payload: unknown): ExtractionResult | null {
  if (!payload || typeof payload !== 'object') return null;
  const markers = (payload as { markers?: unknown }).markers;
  if (!Array.isArray(markers) || markers.length > 40) return null;

  const rows: ExtractedRow[] = [];
  const notCovered: string[] = [];
  for (const raw of markers) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const r = raw as Record<string, unknown>;
    if (Object.keys(r).some(k => !ALLOWED_KEYS.has(k))) return null;
    if (typeof r.marker !== 'string' || r.marker.length > 80) return null;

    const key = r.marker.trim().toLowerCase();
    const marker = SUPPORTED[key];
    if (!marker) {
      const name = cleanName(r.marker);
      if (name && !notCovered.includes(name) && notCovered.length < 20) notCovered.push(name);
      continue;
    }

    const value = finiteOrNull(r.value);
    const low = finiteOrNull(r.labRangeLow);
    const high = finiteOrNull(r.labRangeHigh);
    if (value === undefined || value === null || low === undefined || high === undefined) return null;
    if (typeof r.confidence !== 'number' || !Number.isFinite(r.confidence) || r.confidence < 0 || r.confidence > 1) return null;
    if (r.unit !== null && r.unit !== undefined && (typeof r.unit !== 'string' || r.unit.length > 16)) return null;
    // A date in an unexpected format is dropped (the user can type it), not trusted or guessed.
    if (r.collectionDate !== null && r.collectionDate !== undefined && typeof r.collectionDate !== 'string') return null;
    const collectionDate =
      typeof r.collectionDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.collectionDate) ? r.collectionDate : null;
    if (rows.some(x => x.marker === marker)) continue;
    rows.push({
      marker,
      value,
      unit: typeof r.unit === 'string' && r.unit.trim() ? r.unit.trim() : null,
      labRangeLow: low,
      labRangeHigh: high,
      collectionDate,
      confidence: r.confidence
    });
  }
  return { rows, notCovered };
}
