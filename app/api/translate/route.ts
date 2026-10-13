import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const translationCache = new Map<string, string>();

function isTurkishText(text: string): boolean {
  return /[ığüşöçİĞÜŞÖÇ]/.test(text) || /\b(ve|bir|için|ile|bu|da|de|oldu|dedi|başkanı|hakkında|haber|son|dakika)\b/i.test(text);
}

export async function POST(request: Request) {
  try {
    const { text, targetLang } = await request.json();
    if (!text || typeof text !== "string" || !targetLang) {
      return NextResponse.json({ translatedText: text });
    }

    const isTr = isTurkishText(text);
    if (targetLang === "tr" && isTr) return NextResponse.json({ translatedText: text });
    if (targetLang === "en" && !isTr && !/[^\x00-\x7F]/.test(text)) return NextResponse.json({ translatedText: text });

    const sourceLang = isTr ? "tr" : "en";
    if (sourceLang === targetLang) return NextResponse.json({ translatedText: text });

    const cacheKey = `${sourceLang}:${targetLang}:${text.slice(0, 100)}`;
    if (translationCache.has(cacheKey)) {
      return NextResponse.json({ translatedText: translationCache.get(cacheKey) });
    }

    // Try MyMemory
    try {
      const pair = `${sourceLang}|${targetLang}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 300))}&langpair=${pair}`;
      const res = await fetch(url, { headers: { "User-Agent": "IntelMatrixBot/4.0" } });
      if (res.ok) {
        const data = await res.json();
        const translated = data?.responseData?.translatedText;
        if (translated && typeof translated === "string" && !translated.includes("MYMEMORY WARNING")) {
          translationCache.set(cacheKey, translated);
          return NextResponse.json({ translatedText: translated });
        }
      }
    } catch {
      // ignore
    }

    // Fallback: Try Lingva public translate
    try {
      const url = `https://lingva.ml/api/v1/${sourceLang}/${targetLang}/${encodeURIComponent(text.slice(0, 300))}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data?.translation) {
          translationCache.set(cacheKey, data.translation);
          return NextResponse.json({ translatedText: data.translation });
        }
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ translatedText: text });
  } catch {
    return NextResponse.json({ translatedText: "" });
  }
}
