import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import Parser from "rss-parser";

export const dynamic = "force-dynamic";

type NewsCategory = "AI" | "Teknoloji" | "Jeopolitik" | "Ekonomi" | "Bilim" | "Spor" | "Kültür" | "Sağlık" | "İklim" | "Savunma" | "Enerji" | "Seyahat" | "Dünya";

interface FeedDefinition {
  name: string;
  url: string;
  category: NewsCategory;
}

interface NewsStory {
  id: string;
  original_title: string;
  translated_title: string;
  executive_summary: string;
  impact_score: number;
  category: NewsCategory;
  multi_perspective: {
    western_narrative: string;
    eastern_narrative: string;
    synthesis: string;
  };
  butterfly_effect: Array<{ timeline: "short_term" | "long_term"; impact: string }>;
  source: string;
  source_url: string;
  image_url: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
  is_breaking: boolean;
}

const FEEDS: FeedDefinition[] = [
  { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "Dünya" },
  { name: "BBC Türkçe", url: "https://feeds.bbci.co.uk/turkce/rss.xml", category: "Dünya" },
  { name: "BBC Technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", category: "Teknoloji" },
  { name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml", category: "Spor" },
  { name: "BBC Science", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", category: "Bilim" },
  { name: "BBC Health", url: "https://feeds.bbci.co.uk/news/health/rss.xml", category: "Sağlık" },
  { name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", category: "Ekonomi" },
  { name: "The Guardian Culture", url: "https://www.theguardian.com/culture/rss", category: "Kültür" },
  { name: "The Guardian Sport", url: "https://www.theguardian.com/sport/rss", category: "Spor" },
  { name: "The Guardian Environment", url: "https://www.theguardian.com/environment/rss", category: "İklim" },
  { name: "Daily Sabah", url: "https://www.dailysabah.com/rssFeed/turkey", category: "Dünya" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "Dünya" },
  { name: "The Guardian World", url: "https://www.theguardian.com/world/rss", category: "Dünya" },
  { name: "The Guardian Technology", url: "https://www.theguardian.com/technology/rss", category: "Teknoloji" },
  { name: "NPR World", url: "https://feeds.npr.org/1004/rss.xml", category: "Dünya" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "Teknoloji" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "Teknoloji" },
  { name: "Deutsche Welle", url: "https://rss.dw.com/rdf/rss-en-world", category: "Dünya" },
];

const COUNTRY_TERMS: Record<string, string[]> = {
  turkey: ["turkey", "türkiye", "turkish", "türk", "ankara", "istanbul", "erdogan", "erdoğan", "cumhurbaşkanı", "tbmm", "kurdish"],
  us: ["united states", "u.s.", "us", "america", "american", "washington", "trump", "congress", "pentagon"],
  uk: ["united kingdom", "britain", "british", "uk", "london", "starmer"],
  china: ["china", "chinese", "beijing", "xi jinping", "taiwan", "hong kong"],
  israel: ["israel", "israeli", "gaza", "palestine", "palestinian", "west bank", "jerusalem", "hamas"],
  ukraine: ["ukraine", "ukrainian", "kyiv", "zelensky", "donbas"],
  russia: ["russia", "russian", "moscow", "putin", "kremlin"],
  iran: ["iran", "iranian", "tehran", "ayatollah"],
  france: ["france", "french", "paris", "macron"],
  germany: ["germany", "german", "berlin", "merz"],
  india: ["india", "indian", "new delhi", "modi"],
  japan: ["japan", "japanese", "tokyo"],
};

const CATEGORY_TERMS: Record<Exclude<NewsCategory, "Dünya">, string[]> = {
  AI: ["artificial intelligence", "generative ai", "machine learning", "openai", "anthropic", "chatgpt", "ai model", "yapay zeka", "yapay zekâ"],
  Teknoloji: ["technology", "tech", "software", "semiconductor", "chip", "cyber", "data center", "smartphone", "robot", "teknoloji", "siber", "yarı iletken", "çip", "yazılım"],
  Jeopolitik: ["war", "conflict", "military", "sanction", "diplomacy", "election", "government", "minister", "security", "iran", "israel", "ukraine", "savaş", "çatışma", "askeri", "yaptırım", "diplomasi", "seçim", "hükümet", "güvenlik"],
  Ekonomi: ["economy", "economic", "markets", "market", "inflation", "trade", "business", "bank", "finance", "oil price", "ekonomi", "enflasyon", "piyasa", "ticaret", "finans", "faiz"],
  Bilim: ["science", "research", "study", "scientist", "climate", "space", "health", "medical", "bilim", "araştırma", "iklim", "uzay", "sağlık"],
  Spor: ["sport", "football", "soccer", "olympic", "tennis", "basketball", "spor", "futbol", "şampiyona"],
  Kültür: ["culture", "arts", "art", "film", "music", "book", "culture", "kültür", "sanat", "sinema", "müzik"],
  Sağlık: ["health", "medical", "medicine", "hospital", "disease", "healthcare", "sağlık", "hastane", "tedavi"],
  İklim: ["climate", "weather", "emissions", "carbon", "flood", "wildfire", "iklim", "sel", "yangın", "kuraklık"],
  Savunma: ["defense", "defence", "military", "army", "navy", "missile", "weapon", "savunma", "ordu", "füze", "silah"],
  Enerji: ["energy", "oil", "gas", "renewable", "solar", "nuclear", "enerji", "petrol", "doğalgaz", "güneş"],
  Seyahat: ["travel", "tourism", "tourist", "airport", "airline", "turizm", "seyahat", "havaalanı", "uçuş"],
};

const parser = new Parser({
  timeout: 5_000,
  customFields: {
    item: ["media:content", "media:thumbnail"],
  },
});

let cache: { expiresAt: number; stories: NewsStory[]; sources: string[] } | null = null;
let inFlight: Promise<{ expiresAt: number; stories: NewsStory[]; sources: string[] }> | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_STORIES = 180;

function stripMarkup(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractImage(item: Record<string, unknown>): string | null {
  const enclosure = item.enclosure as { url?: string; type?: string } | undefined;
  const mediaContent = item["media:content"] as { $?: { url?: string }; url?: string } | undefined;
  const mediaThumbnail = item["media:thumbnail"] as { $?: { url?: string }; url?: string } | undefined;
  const html = [item.content, item["content:encoded"], item.summary, item.description]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  const htmlImage = html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
  const image = enclosure?.url || mediaContent?.$?.url || mediaContent?.url || mediaThumbnail?.$?.url || mediaThumbnail?.url || htmlImage;

  if (!image) return null;
  try {
    const parsed = new URL(image);
    if (parsed.hostname.endsWith("guim.co.uk")) {
      parsed.searchParams.set("width", "1200");
      parsed.searchParams.set("quality", "90");
    }
    if (parsed.hostname.endsWith("bbci.co.uk")) {
      parsed.pathname = parsed.pathname.replace(/\/\d+(?=\/cpsprodpb|\/cpsprodpb)/, "/1200");
    }
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function inferCategory(text: string, feedCategory: NewsCategory): NewsCategory {
  const normalized = text.toLowerCase();
  if (CATEGORY_TERMS.AI.some((term) => normalized.includes(term))) return "AI";
  if (CATEGORY_TERMS.Jeopolitik.some((term) => normalized.includes(term))) return "Jeopolitik";
  if (CATEGORY_TERMS.Ekonomi.some((term) => normalized.includes(term))) return "Ekonomi";
  if (CATEGORY_TERMS.Bilim.some((term) => normalized.includes(term))) return "Bilim";
  if (CATEGORY_TERMS.Teknoloji.some((term) => normalized.includes(term))) return "Teknoloji";
  return feedCategory;
}

function getSummary(item: Record<string, unknown>, title: string): string {
  const raw = stripMarkup(item.contentSnippet || item.summary || item.description || item.content || item["content:encoded"]);
  if (!raw || raw.toLowerCase() === title.toLowerCase()) return `${title} Haberin ayrıntıları ve gelişmeler için yayıncı kaynağını takip edin.`;
  const sentences = raw.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [raw];
  const concise = sentences.slice(0, 2).join(" ").trim();
  return concise.length > 360 ? `${concise.slice(0, 357).trimEnd()}...` : concise;
}

function normalizeItem(item: Record<string, unknown>, feed: FeedDefinition): NewsStory | null {
  const title = stripMarkup(item.title);
  const url = typeof item.link === "string" ? item.link : "";
  if (!title || !url) return null;

  const publishedAt = item.isoDate || item.pubDate;
  const date = typeof publishedAt === "string" && !Number.isNaN(Date.parse(publishedAt))
    ? new Date(publishedAt)
    : new Date();
  const text = `${title} ${stripMarkup(item.contentSnippet || item.summary || item.description)}`;
  const category = inferCategory(text, feed.category);
  const id = createHash("sha1").update(url).digest("hex");
  const ageHours = Math.max(0, Date.now() - date.getTime()) / 3_600_000;
  const isBreaking = ageHours <= 24 && /breaking|live updates|just in|developing/i.test(title);
  const score = Math.min(10, Math.max(4, Math.round(10 - Math.min(ageHours, 72) / 12)));

  return {
    id,
    original_title: title,
    translated_title: title,
    executive_summary: getSummary(item, title),
    impact_score: score,
    category,
    multi_perspective: { western_narrative: "", eastern_narrative: "", synthesis: "" },
    butterfly_effect: [],
    source: feed.name,
    source_url: url,
    image_url: extractImage(item),
    published_at: date.toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_breaking: isBreaking,
  };
}

async function fetchFeed(feed: FeedDefinition): Promise<NewsStory[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(feed.url, {
      headers: { "User-Agent": "IntelMatrixNewsReader/1.0 (RSS reader)" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`RSS source responded ${response.status}`);
    const xml = await response.text();
    const parsed = await parser.parseString(xml);
    return (parsed.items ?? [])
      .map((item) => normalizeItem(item as unknown as Record<string, unknown>, feed))
      .filter((item): item is NewsStory => item !== null);
  } catch (error) {
    console.warn(`Unable to fetch RSS source ${feed.name}:`, error);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function getStories() {
  if (cache && cache.expiresAt > Date.now()) return cache;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const results = await Promise.all(FEEDS.map(fetchFeed));
    const unique = new Map<string, NewsStory>();
    for (const story of results.flat()) {
      if (!unique.has(story.id)) unique.set(story.id, story);
    }

    const stories = [...unique.values()]
      .sort((a, b) => Number(b.is_breaking) - Number(a.is_breaking) || Date.parse(b.published_at) - Date.parse(a.published_at))
      .slice(0, MAX_STORIES);
    if (!stories.length && cache?.stories.length) {
      cache = { ...cache, expiresAt: Date.now() + 60_000 };
      return cache;
    }
    const sources = [...new Set(stories.map((story) => story.source))];
    cache = { expiresAt: Date.now() + CACHE_TTL_MS, stories, sources };
    return cache;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

function matchesCountry(story: NewsStory, country: string): boolean {
  const terms = COUNTRY_TERMS[country];
  if (!terms) return true;
  const text = `${story.original_title} ${story.executive_summary}`.toLowerCase();
  return terms.some((term) => {
    if (term === "us" || term === "uk") return new RegExp(`\\b${term}\\b`).test(text);
    return text.includes(term);
  });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const country = params.get("country") || "world";
  const category = params.get("category") || "all";
  const cursor = Math.max(0, Number.parseInt(params.get("cursor") || "0", 10) || 0);
  const limit = Math.min(24, Math.max(1, Number.parseInt(params.get("limit") || "12", 10) || 12));

  try {
    const result = await getStories();
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const filtered = result.stories.filter((story) => {
        const publishedTime = Date.parse(story.published_at);
      const matchesScope = country === "world" || matchesCountry(story, country);
      const matchesCategory = category === "all" || story.category === category;
        return publishedTime >= sevenDaysAgo && matchesScope && matchesCategory;
    });
    const items = filtered.slice(cursor, cursor + limit);
    const nextCursor = cursor + items.length;

    return NextResponse.json(
      {
        items,
        total: filtered.length,
        nextCursor: nextCursor < filtered.length ? nextCursor : null,
        sources: result.sources,
        updatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=240" } }
    );
  } catch (error) {
    console.error("News aggregation failed:", error);
    return NextResponse.json({ error: "Haber kaynaklarına şu anda ulaşılamıyor." }, { status: 502 });
  }
}