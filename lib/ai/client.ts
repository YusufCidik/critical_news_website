import { GoogleGenAI, ThinkingLevel } from "@google/genai";

// Only models with a documented free tier may be selected. Provider billing
// still depends on the API key's project/tier; use a free-tier project key.
export const FREE_TIER_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"] as const;
export function resolveFreeTierModel(value: string | undefined, fallback: string) {
  const model = value?.trim().replace(/^models\//, "");
  return model && (FREE_TIER_MODELS as readonly string[]).includes(model) ? model : fallback;
}
export const TRANSLATION_MODEL = resolveFreeTierModel(process.env.GEMINI_TRANSLATION_MODEL, "gemini-3.5-flash-lite");
export const SELECTION_MODEL = resolveFreeTierModel(process.env.GEMINI_SELECTION_MODEL, TRANSLATION_MODEL);
export const ASSISTANT_MODEL = resolveFreeTierModel(process.env.GEMINI_ASSISTANT_MODEL, "gemini-3.8-flash");
export function assistantThinking(model = ASSISTANT_MODEL) {
  return /^gemini-3/.test(model) ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {};
}
export function getAIClient(timeoutMs = 25_000) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  return apiKey ? new GoogleGenAI({ apiKey, httpOptions: { timeout: timeoutMs } }) : null;
}

// Both attempts stay within the documented free-tier model list.
export async function generateEditorialContent(ai: GoogleGenAI, params: Parameters<GoogleGenAI["models"]["generateContent"]>[0]) {
  let lastError: unknown;
  for (const model of new Set([ASSISTANT_MODEL, "gemini-3.5-flash-lite"])) {
    try {
      const response = await ai.models.generateContent({ ...params, model, config: { ...params.config, ...assistantThinking(model) } });
      if (!response.text?.trim()) throw new Error("Empty editorial response");
      return { response, model };
    } catch (error) { lastError = error; }
  }
  throw lastError;
}
