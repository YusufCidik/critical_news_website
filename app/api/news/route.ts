import { matchesNewsCategory } from "@/lib/news/categories";
import { FEEDS } from "@/lib/news/sources";
import { newsSourceLanguage } from "@/lib/i18n/news-language";
import { cachedTranslation, LANGUAGES } from "@/lib/i18n/server-translate";
import type { SupportedLanguage } from "@/lib/store/language-store";
import { localizeNewsTitles } from "@/lib/news/localization";
import { compareNewsPriority, groupNewsByEvent, matchesCountry, matchesNewsSearch, MAX_SEARCH_LENGTH } from "@/lib/news/discovery";
import { NextResponse } from "next/server";
import { getStories, publicStory } from "@/lib/news/feed";
export const maxDuration = 60;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const language = LANGUAGES.includes(params.get("language") as SupportedLanguage) ? params.get("language") as SupportedLanguage : null;
  const country = params.get("country") || "world";
  const category = params.get("category") || "all";
  const search = (params.get("q") || "").trim().slice(0, MAX_SEARCH_LENGTH);
  const cursor = Math.max(0, Number.parseInt(params.get("cursor") || "0", 10) || 0);
  const limit = Math.min(24, Math.max(1, Number.parseInt(params.get("limit") || "12", 10) || 12));

  try {
    const result = await getStories();
    if (!result.stories.length) return NextResponse.json({ error: "Haber kaynaklarına ulaşılamıyor." }, { status: 502 });
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const filtered = result.stories.filter((story) => {
      const publishedTime = Date.parse(story.published_at);
      const matchesScope = country === "world" || matchesCountry(story, country);
      const matchesCategory = matchesNewsCategory(story, category);
      if (publishedTime < sevenDaysAgo || !matchesScope || !matchesCategory) return false;
      if (matchesNewsSearch(story, search)) return true;
      if (!language) return false;
      const from = newsSourceLanguage(story.source);
      return matchesNewsSearch({
        ...story,
        translated_title: cachedTranslation(story.original_title, language, from),
        executive_summary: cachedTranslation(story.executive_summary, language, from) ?? story.executive_summary,
      }, search);
    });
    filtered.sort((a, b) => compareNewsPriority(a, b, params.get("sort") || "importance", category));
    const eventFor = (story: typeof filtered[number]) => result.events.badge(story.id);
    const grouped = groupNewsByEvent(filtered, eventFor);
    const itemsForPage = grouped.slice(cursor, cursor + limit).map((story) => ({ ...publicStory(story), event: eventFor(story) }));
    const localized = await localizeNewsTitles(itemsForPage, language);
    const items = localized.items;
    const nextCursor = cursor + items.length;

    return NextResponse.json(
      {
        items,
        total: grouped.length,
        nextCursor: nextCursor < grouped.length ? nextCursor : null,
        sources: [...new Set(filtered.map((story) => story.source))],
        publishers: [...new Set(filtered.map(story => story.publisher || story.source))],
        coverage: { configuredFeeds: FEEDS.length, configuredPublishers: new Set(FEEDS.map(feed => feed.publisher)).size, activeFeeds: result.sourceHealth.filter(feed => feed.status === "active").length, activePublishers: new Set(result.sourceHealth.filter(feed => feed.status === "active").map(feed => feed.publisher)).size, totalArticles: result.stories.length },
        updatedAt: result.updatedAt,
      },
      { headers: localized.complete && !search ? { "Cache-Control": "public, max-age=15", "Vercel-CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" } : { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("News aggregation failed:", error);
    return NextResponse.json({ error: "Haber kaynaklarına şu anda ulaşılamıyor." }, { status: 502 });
  }
}
