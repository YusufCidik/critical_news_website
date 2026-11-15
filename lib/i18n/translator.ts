import type { SupportedLanguage } from "@/lib/store/language-store";
const cache = new Map<string, string>();
export async function translateText(text: string, targetLang: SupportedLanguage): Promise<string> {
  if (!text.trim()) return text;
  const key = `${targetLang}:${text}`;
  if (cache.has(key)) return cache.get(key)!;
  try {
    const response = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texts: [text], targetLang }), signal: AbortSignal.timeout(35000) });
    if (!response.ok) return text;
    const data = await response.json();
    if (data.complete && data.translations?.[0]) { cache.set(key, data.translations[0]); return data.translations[0]; }
  } catch { /* Keep original and allow retry. */ }
  return text;
}
