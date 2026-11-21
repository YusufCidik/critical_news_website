import { NextResponse } from "next/server";
import { LANGUAGES, translateBatch } from "@/lib/i18n/server-translate";
import { readJson, RequestBodyError } from "@/lib/http/request";
import { workBudget } from "@/lib/http/work-budget";

const allowTranslation = workBudget(40, 60);
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const body = await readJson(request, 240 * 1024);
    const target = LANGUAGES.find((value) => value === body.targetLang);
    const suppliedSources = Array.isArray(body.sourceLangs) ? body.sourceLangs : [];
    const texts: unknown = body.texts ?? (typeof body.text === "string" ? [body.text] : null);
    if (!target || !Array.isArray(texts) || !texts.length || texts.length > 48 || texts.some((text) => typeof text !== "string" || text.length > 6000) || texts.join("").length > 40000) return NextResponse.json({ error: "Geçersiz çeviri isteği." }, { status: 400 });
    const sources = texts.map((text, index) => {
      const supplied = suppliedSources[index];
      if (LANGUAGES.includes(supplied)) return supplied;
      return /[ığşİĞŞ]|\b(ve|için|başkanı|oldu|dedi)\b/i.test(text) ? "tr" : "en";
    });
    if (!allowTranslation()) return NextResponse.json({ error: "Try again shortly." }, { status: 429, headers: { "Retry-After": "5" } });
    const result = await translateBatch(texts, target, sources);
    return NextResponse.json({ ...result, translatedText: result.translations[0] });
  } catch (error) {
    return NextResponse.json({ error: "Çeviri servisine ulaşılamadı." }, { status: error instanceof RequestBodyError ? error.status : 502 });
  }
}
