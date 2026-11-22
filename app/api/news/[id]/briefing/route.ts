import { NextResponse } from "next/server";
import { getStory } from "@/lib/news/feed";
import { generateArticleBriefing } from "@/lib/news/briefing";
import { LANGUAGES } from "@/lib/i18n/server-translate";
import { readJson, RequestBodyError } from "@/lib/http/request";

export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[a-f0-9]{40}$/.test(id)) return NextResponse.json({ error: "Haber bulunamadı." }, { status: 404 });
    const body = await readJson(request, 1024);
    const language = body.language;
    const mode = body.mode ?? "concise";
    if (!LANGUAGES.some((value) => value === language) || typeof language !== "string" || (mode !== "concise" && mode !== "detailed")) {
      return NextResponse.json({ error: "Geçersiz dil veya brifing modu." }, { status: 400 });
    }
    const story = await getStory(id);
    if (!story) return NextResponse.json({ error: "Haber güncel akışta bulunamadı." }, { status: 404 });
    return NextResponse.json(await generateArticleBriefing(story, mode), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof RequestBodyError ? error.status : 502;
    return NextResponse.json({ error: "Özet hazırlanamadı." }, { status });
  }
}
