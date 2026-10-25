import { GoogleGenAI } from '@google/genai';
import { parseExplainItems, passesGuard } from './_lib/guard.js';
import { generateWithFallback, rateLimited, sendError, withTimeout, type ApiRequest, type ApiResponse } from './_lib/http.js';

const SYSTEM_INSTRUCTION = [
  'You rewrite a structured lab-result comparison into plain language for an adult woman, at about a',
  'Class 8 (age 13-14) reading level, in 3 to 5 short sentences and under 110 words.',
  'Use ONLY the facts in the JSON. Do not add any new medical facts, numbers, causes, conditions or advice.',
  'Never diagnose. Never suggest treatment, medicines, supplements, diet or doses.',
  'Never use the words normal, healthy, abnormal, disease, diagnosis, or the phrase "you have".',
  'Say "inside your lab\'s range" or "below the guideline cutoff" style phrases instead.',
  'End by saying this is worth discussing with a doctor. Plain text only, no lists, no markdown.'
].join(' ');

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') return sendError(res, 405, 'method_not_allowed');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return sendError(res, 503, 'ai_unavailable');
  if (rateLimited(req, 12)) return sendError(res, 429, 'rate_limited');

  const items = parseExplainItems(req.body);
  if (!items) return sendError(res, 400, 'bad_request');

  const { signal, done } = withTimeout();
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await generateWithFallback(
      model =>
        ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: JSON.stringify({ results: items }) }] }],
          config: { systemInstruction: SYSTEM_INSTRUCTION, abortSignal: signal }
        }),
      signal
    );
    const text = (response.text ?? '').replace(/[*#_`]/g, '').trim().slice(0, 900);
    if (!passesGuard(text)) return sendError(res, 422, 'filtered');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: true, text });
  } catch {
    return sendError(res, signal.aborted ? 504 : 502, signal.aborted ? 'timeout' : 'ai_failed');
  } finally {
    done();
  }
}
