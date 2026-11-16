import { LANGUAGES } from "@/lib/i18n/server-translate";
import type { SupportedLanguage } from "@/lib/store/language-store";
import { localizeNewsTitles } from "@/lib/news/localization";
import { uniqueNews } from "@/lib/news/unique";
import { NextResponse } from "next/server";
import { getStories, matchesCountry } from "@/lib/news/feed";
export const maxDuration = 60;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const language = LANGUAGES.includes(params.get("language") as SupportedLanguage) ? params.get("language") as SupportedLanguage : null;
  const country = params.get("country") || "world";
  const category = params.get("category") || "all";
  const cursor = Math.max(0, Number.parseInt(params.get("cursor") || "0", 10) || 0);
  const limit = Math.min(24, Math.max(1, Number.parseInt(params.get("limit") || "12", 10) || 12));

  try {
    const result = await getStories();
    if (!result.stories.length) return NextResponse.json({ error: "Haber kaynaklarına ulaşılamıyor." }, { status: 502 });
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const filtered = result.stories.filter((story) => {
      const publishedTime = Date.parse(story.published_at);
      const matchesScope = country === "world" || matchesCountry(story, country);
      const matchesCategory = category === "all" || story.category === category;
      return publishedTime >= sevenDaysAgo && matchesScope && matchesCategory;
    });
    filtered.sort((a, b) => params.get("sort") === "latest"
      ? Date.parse(b.published_at) - Date.parse(a.published_at)
      : b.impact_score - a.impact_score || Date.parse(b.published_at) - Date.parse(a.published_at));
    const unique = uniqueNews(filtered);
    const localized = await localizeNewsTitles(unique.slice(cursor, cursor + limit), language);
    const items = localized.items;
    const nextCursor = cursor + items.length;

    return NextResponse.json(
      {
        items,
        total: unique.length,
        nextCursor: nextCursor < unique.length ? nextCursor : null,
        sources: [...new Set(filtered.map((story) => story.source))],
        updatedAt: new Date().toISOString(),
      },
      { headers: localized.complete ? { "Cache-Control": "public, max-age=15", "Vercel-CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" } : { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("News aggregation failed:", error);
    return NextResponse.json({ error: "Haber kaynaklarına şu anda ulaşılamıyor." }, { status: 502 });
  }
}
