/** Minimal shapes of the Vercel Node.js request/response helpers we use. */
export interface ApiRequest {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

export const DEFAULT_MODEL = 'gemini-3.8-flash';
export const TIMEOUT_MS = 20_000;

/**
 * Fallback for one retry. The brief asked for `gemini-3.7-flash`, but that id is not listed on
 * ai.google.dev/gemini-api/docs/models (checked 25 Oct 2026), so it would always 404.
 * `gemini-3.6-flash` is listed as stable. Override with GEMINI_FALLBACK_MODEL (see DECISIONS.md).
 */
export const DEFAULT_FALLBACK_MODEL = 'gemini-3.6-flash';

export function modelId(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

export function fallbackModelId(): string {
  return process.env.GEMINI_FALLBACK_MODEL?.trim() || DEFAULT_FALLBACK_MODEL;
}

const RETRYABLE_STATUS = new Set([401, 403, 404, 429]);
const RETRYABLE_TEXT = /PERMISSION_DENIED|RESOURCE_EXHAUSTED|NOT_FOUND|UNAUTHENTICATED|quota|rate limit/i;

/** Authorization, quota, rate-limit or model-not-found errors are worth one retry on another model. */
export function isRetryableModelError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const status = (err as { status?: unknown }).status;
  if (typeof status === 'number' && RETRYABLE_STATUS.has(status)) return true;
  const message = (err as { message?: unknown }).message;
  return typeof message === 'string' && RETRYABLE_TEXT.test(message);
}

/**
 * Calls the configured model; on a retryable error, retries exactly once with the fallback model.
 * Any other error, an abort, or a second failure is thrown to the caller's generic error path.
 */
export async function generateWithFallback<T>(call: (model: string) => Promise<T>, signal?: AbortSignal): Promise<T> {
  const primary = modelId();
  try {
    return await call(primary);
  } catch (err) {
    const fallback = fallbackModelId();
    if (signal?.aborted || fallback === primary || !isRetryableModelError(err)) throw err;
    return await call(fallback);
  }
}

export function sendError(res: ApiResponse, status: number, code: string): void {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json({ ok: false, error: code });
}

/** Best-effort per-IP rate limit. In-memory, so it resets on cold starts and is per instance. */
const hits = new Map<string, number[]>();

export function rateLimited(req: ApiRequest, limit: number, windowMs = 60_000): boolean {
  const fwd = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter(t => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > limit;
}

export function withTimeout(): { signal: AbortSignal; done: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}
