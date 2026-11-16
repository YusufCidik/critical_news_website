import { GoogleGenAI, ThinkingLevel } from "@google/genai";

// Separate latency-sensitive translation/retrieval from editorial reasoning.
export const TRANSLATION_MODEL = process.env.GEMINI_TRANSLATION_MODEL || "gemini-3.5-flash-lite";
export const SELECTION_MODEL = process.env.GEMINI_SELECTION_MODEL || TRANSLATION_MODEL;
export const ASSISTANT_MODEL = process.env.GEMINI_ASSISTANT_MODEL || "gemini-4-hydrogen";
export const AI_MODEL = process.env.GEMINI_MODEL || TRANSLATION_MODEL;
export function assistantThinking(model = ASSISTANT_MODEL) {
  return /^gemini-[34]/.test(model) ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {};
}
export function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  return apiKey ? new GoogleGenAI({ apiKey, httpOptions: { timeout: 25_000 } }) : null;
}
