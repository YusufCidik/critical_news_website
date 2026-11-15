import { NextResponse } from "next/server";
import { getStory } from "@/lib/news/feed";
import { generateArticleBriefing } from "@/lib/news/briefing";
import { LANGUAGES } from "@/lib/i18n/server-translate";
export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[a-f0-9]{40}$/.test(id)) return NextResponse.json({ error: "Haber bulunamadı." }, { status: 404 });
    const body = await request.json();
    if (!LANGUAGES.includes(body.language)) return NextResponse.json({ error: "Geçersiz dil." }, { status: 400 });
    const story = await getStory(id);
    if (!story) return NextResponse.json({ error: "Haber güncel akışta bulunamadı." }, { status: 404 });
    return NextResponse.json(await generateArticleBriefing(story, body.language));
  } catch { return NextResponse.json({ error: "Özet hazırlanamadı." }, { status: 502 }); }
}

