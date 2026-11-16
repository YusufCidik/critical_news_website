import { uniqueNews } from "@/lib/news/unique";
import { NextResponse } from "next/server";
import { getStories, matchesCountry } from "@/lib/news/feed";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
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
    const items = unique.slice(cursor, cursor + limit);
    const nextCursor = cursor + items.length;

    return NextResponse.json(
      {
        items,
        total: unique.length,
        nextCursor: nextCursor < unique.length ? nextCursor : null,
        sources: [...new Set(filtered.map((story) => story.source))],
        updatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=240" } }
    );
  } catch (error) {
    console.error("News aggregation failed:", error);
    return NextResponse.json({ error: "Haber kaynaklarına şu anda ulaşılamıyor." }, { status: 502 });
  }
}
