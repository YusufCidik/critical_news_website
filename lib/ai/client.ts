import { GoogleGenAI } from "@google/genai";

export const AI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

export function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  return apiKey ? new GoogleGenAI({ apiKey, httpOptions: { timeout: 25_000 } }) : null;
}
