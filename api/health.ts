import type { ApiRequest, ApiResponse } from './_lib/http.js';

/** Reports only whether an AI key is configured. Never reveals the key, model or any env value; makes no AI call. */
export function healthStatus(): { ai: 'configured' | 'not_configured' } {
  return { ai: process.env.GEMINI_API_KEY?.trim() ? 'configured' : 'not_configured' };
}

export default function handler(req: ApiRequest, res: ApiResponse): void {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }
  res.status(200).json(healthStatus());
}
