import { NextResponse } from "next/server";
import { LANGUAGES, translateBatch } from "@/lib/i18n/server-translate";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const texts: unknown = body.texts ?? (typeof body.text === "string" ? [body.text] : null);
    if (!LANGUAGES.includes(body.targetLang) || !Array.isArray(texts) || !texts.length || texts.length > 48 || texts.some((text) => typeof text !== "string" || text.length > 6000) || texts.join("").length > 40000) return NextResponse.json({ error: "Geçersiz çeviri isteği." }, { status: 400 });
    const sources = texts.map((text, index) => {
      const supplied = body.sourceLangs?.[index];
      if (LANGUAGES.includes(supplied)) return supplied;
      return /[ığşİĞŞ]|\b(ve|için|başkanı|oldu|dedi)\b/i.test(text) ? "tr" : "en";
    });
    const result = await translateBatch(texts, body.targetLang, sources);
    return NextResponse.json({ ...result, translatedText: result.translations[0] });
  } catch { return NextResponse.json({ error: "Çeviri servisine ulaşılamadı." }, { status: 502 }); }
}
