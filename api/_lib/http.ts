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

export function modelId(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
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
