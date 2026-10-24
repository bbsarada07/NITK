import { GoogleGenAI } from '@google/genai';
import { ExtractedLabData } from '../types/types';

/**
 * Converts a File object into a base64 encoded string.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1] || result;
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Stable, officially supported production models in order of priority.
 * gemini-2.0-flash is current generation; gemini-1.5-flash provides backwards compatibility.
 */
const SUPPORTED_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];

/**
 * Extracts lab values (ferritin, hemoglobin, tsh) from an uploaded image or PDF using Google Gemini API.
 * 
 * Enforces secure retrieval of the API key exclusively via import.meta.env.VITE_GEMINI_API_KEY.
 * Includes multi-model fallback and bulletproof error handling with user-friendly diagnostics.
 */
export async function extractLabValues(file: File): Promise<ExtractedLabData> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // Defensive check: validate API key presence before performing network/model calls
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new Error('VITE_GEMINI_API_KEY is missing. Please check your root .env file.');
  }

  const base64Data = await fileToBase64(file);
  const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = 
    "You are a clinical diagnostic lab report parser specializing in women's health. " +
    "Extract the patient's numeric lab values, measurement units, and printed reference ranges for three specific biomarkers: " +
    "1. Ferritin (Serum ferritin) " +
    "2. Hemoglobin (Hb / Hgb) " +
    "3. TSH (Thyroid Stimulating Hormone / Thyrotropin). " +
    "Search through tables, headers, and lab notes. If a marker is not found or unreadable, return null for its value, unit, and labRange. " +
    "Output strictly valid JSON matching the requested structure.";

  const promptText = 
    "Please parse this lab report and extract the values for ferritin, hemoglobin, and tsh in JSON format: " +
    "{" +
    "  \"ferritin\": { \"value\": number | null, \"unit\": string | null, \"labRange\": string | null }," +
    "  \"hemoglobin\": { \"value\": number | null, \"unit\": string | null, \"labRange\": string | null }," +
    "  \"tsh\": { \"value\": number | null, \"unit\": string | null, \"labRange\": string | null }" +
    "}";

  let responseText = '';
  let lastError: unknown = null;

  // Attempt extraction with stable production models (primary: gemini-2.0-flash, fallback: gemini-1.5-flash)
  for (const modelName of SUPPORTED_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${systemInstruction}\n\n${promptText}` },
              {
                inlineData: {
                  mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      if (response && response.text) {
        responseText = response.text;
        break; // Successfully generated content
      }
    } catch (err: unknown) {
      lastError = err;
      console.warn(`[HerChart] Gemini model ${modelName} call failed, attempting fallback if available:`, err);
    }
  }

  // Robust error handling: Format clean, human-friendly error messages rather than raw JSON or 404 objects
  if (!responseText) {
    const rawError = lastError instanceof Error ? lastError.message : String(lastError || '');

    if (rawError.includes('404') || rawError.toLowerCase().includes('not found')) {
      throw new Error('AI Parsing Failed: The requested Gemini model was not found. Please verify the model version or API key configuration.');
    }
    if (rawError.includes('401') || rawError.includes('403') || rawError.toLowerCase().includes('api key')) {
      throw new Error('AI Parsing Failed: Invalid or unauthorized Gemini API key. Please check your VITE_GEMINI_API_KEY.');
    }
    if (rawError.includes('429') || rawError.toLowerCase().includes('quota') || rawError.toLowerCase().includes('resource exhausted')) {
      throw new Error('AI Parsing Failed: Gemini API rate limit or quota exceeded. Please wait a moment and try again.');
    }

    throw new Error('AI Parsing Failed: Please verify the model version or API key configuration.');
  }

  try {
    const parsed = JSON.parse(responseText) as Partial<ExtractedLabData>;

    return {
      ferritin: {
        value: typeof parsed.ferritin?.value === 'number' ? parsed.ferritin.value : null,
        unit: parsed.ferritin?.unit || null,
        labRange: parsed.ferritin?.labRange || null
      },
      hemoglobin: {
        value: typeof parsed.hemoglobin?.value === 'number' ? parsed.hemoglobin.value : null,
        unit: parsed.hemoglobin?.unit || null,
        labRange: parsed.hemoglobin?.labRange || null
      },
      tsh: {
        value: typeof parsed.tsh?.value === 'number' ? parsed.tsh.value : null,
        unit: parsed.tsh?.unit || null,
        labRange: parsed.tsh?.labRange || null
      }
    };
  } catch (parseError) {
    console.error('[HerChart] JSON parsing failed for response:', responseText, parseError);
    throw new Error('AI Parsing Failed: Model output could not be parsed into structured lab data.');
  }
}
