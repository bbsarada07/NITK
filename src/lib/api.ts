import type { ExtractionResult } from '../../api/_lib/extractSchema';
import { passesGuard, templateExplanation, type ExplainItem } from '../../api/_lib/guard';
import type { EvaluatedMarker } from './evaluate';

export const AI_UNAVAILABLE = 'AI features are unavailable right now, manual entry works fully.';
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
export const UPLOAD_MIME = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

async function postJson(path: string, body: unknown): Promise<{ status: number; data: Record<string, unknown> | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    let data: Record<string, unknown> | null = null;
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      data = null;
    }
    return { status: res.status, data };
  } catch {
    return { status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

export type AiHealth = 'configured' | 'not_configured' | 'unknown';

/** GET /api/health. Anything other than a clear answer is 'unknown' (AI calls then fail gracefully). */
export async function checkAiHealth(): Promise<AiHealth> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch('/api/health', { signal: controller.signal });
    if (!res.ok) return 'unknown';
    const data = (await res.json()) as { ai?: unknown };
    return data.ai === 'configured' || data.ai === 'not_configured' ? data.ai : 'unknown';
  } catch {
    return 'unknown';
  } finally {
    clearTimeout(timer);
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('read_failed'));
    reader.readAsDataURL(file);
  });
}

export type ExtractOutcome = { ok: true; result: ExtractionResult } | { ok: false; message: string };

const EXTRACT_ERRORS: Record<string, string> = {
  too_large: 'That file is larger than 3 MB. Try a smaller scan or a photo of just the results page.',
  unsupported_type: 'Please upload a PDF, PNG, JPEG or WebP file.',
  rate_limited: 'Too many uploads in a short time. Please wait a minute and try again.',
  timeout: 'Reading the report took too long. Please try again or enter values by hand.',
  unreadable: 'We could not read values from this file. Please enter them by hand.'
};

export async function extractReport(file: File): Promise<ExtractOutcome> {
  if (!UPLOAD_MIME.includes(file.type)) return { ok: false, message: EXTRACT_ERRORS.unsupported_type };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, message: EXTRACT_ERRORS.too_large };
  let data: string;
  try {
    data = await fileToBase64(file);
  } catch {
    return { ok: false, message: EXTRACT_ERRORS.unreadable };
  }
  const { status, data: json } = await postJson('/api/extract', { mimeType: file.type, data });
  if (status === 200 && json?.ok && Array.isArray(json.rows) && Array.isArray(json.notCovered)) {
    return { ok: true, result: { rows: json.rows as ExtractionResult['rows'], notCovered: json.notCovered as string[] } };
  }
  const code = typeof json?.error === 'string' ? json.error : '';
  return { ok: false, message: EXTRACT_ERRORS[code] ?? AI_UNAVAILABLE };
}

export function toExplainItems(results: EvaluatedMarker[]): ExplainItem[] {
  return results.map(e => ({
    marker: e.result.displayName,
    value: e.input.value,
    unit: e.input.unit,
    tierLabel: e.result.tierDisplayLabel,
    flagType: e.result.flagType,
    labRange: e.labRangeText,
    labPosition: e.labPosition,
    matchedSymptoms: e.result.flagType === 'pattern' ? e.result.matchedSymptoms.map(s => s.label) : []
  }));
}

export type ExplainOutcome = { source: 'ai' | 'template'; text: string; notice: string | null };

/** AI explanation with a deterministic fallback. The browser re-checks the banned-phrase filter too. */
export async function explainResults(results: EvaluatedMarker[]): Promise<ExplainOutcome> {
  const items = toExplainItems(results);
  const fallback = templateExplanation(items);
  const { status, data } = await postJson('/api/explain', { items });
  const text = typeof data?.text === 'string' ? data.text : '';
  if (status === 200 && passesGuard(text)) return { source: 'ai', text, notice: null };
  const notice = status === 422 ? 'The AI summary did not pass our safety filter, so a fixed template is shown instead.' : AI_UNAVAILABLE;
  return { source: 'template', text: fallback, notice };
}
