import { createHash } from "node:crypto";

import Parser from "rss-parser";

import { classifyNews, type NewsCategory } from "./categories";
import { FEEDS, type FeedDefinition } from "./sources";

export interface NewsStory {
  id: string;
  original_title: string;
  translated_title: string;
  executive_summary: string;
  impact_score: number;
  category: NewsCategory;
  categories: NewsCategory[];
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

const parser = new Parser({
  timeout: 5_000,
  customFields: {
    item: [["media:content", "media:content", { keepArray: true }], ["media:thumbnail", "media:thumbnail", { keepArray: true }], "media:group"],
  },
});

let cache: FeedSnapshot | null = null;
let inFlight: Promise<FeedSnapshot> | null = null;
const CACHE_TTL_MS = 30 * 1000;
const MAX_STORIES = 12000;
const FETCH_CONCURRENCY = 20;
interface FeedHealth { name: string; publisher: string; status: "active" | "empty" | "unavailable"; items: number }
type FeedSnapshot = { expiresAt: number; stories: NewsStory[]; sources: string[]; sourceHealth: FeedHealth[] };

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

export function extractImage(item: Record<string, unknown>): string | null {
  const candidates: Array<{ url: string; width: number }> = [];
  function collect(value: unknown) {
    if (Array.isArray(value)) { value.forEach(collect); return; }
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    const attrs = (node.$ || node) as Record<string, unknown>;
    if (typeof attrs.url === "string" && (!attrs.type || String(attrs.type).startsWith("image/")) && attrs.medium !== "video" && attrs.medium !== "audio") candidates.push({ url: attrs.url, width: Number(attrs.width) || Number(attrs.url.match(/[?&]width=(\d+)/)?.[1]) || 0 });
    for (const key of ["media:content", "media:thumbnail", "media:group"]) collect(node[key]);
  }
  collect(item["media:content"]); collect(item["media:thumbnail"]); collect(item["media:group"]); collect(item.enclosure);
  const html = [item.content, item["content:encoded"], item.summary, item.description].filter((value): value is string => typeof value === "string").join(" ");
  for (const match of html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/gi)) candidates.push({ url: match[1], width: 0 });
  for (const candidate of candidates.sort((a, b) => b.width - a.width)) {
    try {
      const url = new URL(candidate.url.replace(/&amp;/g, "&"), typeof item.link === "string" ? item.link : undefined);
      if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
    } catch { /* Try the next attachment. */ }
  }
  return null;
}

export function inferCategory(text: string, feedCategory: NewsCategory): NewsCategory {
  return classifyNews(text, "", feedCategory).category;
}

function getSummary(item: Record<string, unknown>, title: string): string {
  const raw = stripMarkup(item.contentSnippet || item.summary || item.description || item.content || item["content:encoded"]);
  if (!raw || raw.toLowerCase() === title.toLowerCase()) return title;
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
  const excerpt = stripMarkup([item.contentSnippet, item.summary, item.description, item.content, item["content:encoded"]].filter(value => typeof value === "string").join(" ")).slice(0, 12000);
  const text = `${title} ${excerpt}`;
  const topics = Array.isArray(item.categories) ? item.categories.filter((value): value is string => typeof value === "string") : [];
  const { category, categories } = classifyNews(title, excerpt, feed.category, topics);
  const id = createHash("sha1").update(url).digest("hex");
  const ageHours = Math.max(0, Date.now() - date.getTime()) / 3_600_000;
  const isBreaking = ageHours <= 24 && /(?:^|\s)(breaking(?: news)?|live updates|just in|developing|son dakika)(?:\s|:|$)/i.test(title);
  // Heuristic importance; freshness is displayed separately.
  const score = /\b(war|invasion|earthquake|pandemic|nuclear)\b|savaş|deprem|nükleer/i.test(text) ? 9
    : /election|sanction|ceasefire|crisis|seçim|yaptırım|ateşkes|kriz/i.test(text) ? 8
    : /inflation|central bank|breakthrough|enflasyon|merkez bankası/i.test(text) ? 7
    : category === "Jeopolitik" || category === "AI" || category === "Ekonomi" ? 6 : 5;

  return {
    id,
    original_title: title,
    translated_title: title,
    executive_summary: getSummary(item, title),
    impact_score: score,
    category,
    categories,
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

async function fetchFeed(feed: FeedDefinition): Promise<{ stories: NewsStory[]; health: FeedHealth }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(feed.url, {
      headers: { "User-Agent": "IntelMatrixNewsReader/1.0 (RSS reader)" },
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error(`RSS source responded ${response.status}`);
    const xml = await response.text();
    const parsed = await parser.parseString(xml);
    const stories = (parsed.items ?? []).slice(0, 200)
      .map((item) => normalizeItem(item as unknown as Record<string, unknown>, feed))
      .filter((item): item is NewsStory => item !== null && Date.parse(item.published_at) >= Date.now() - 7 * 86400000);
    return { stories, health: { name: feed.name, publisher: feed.publisher, status: stories.length ? "active" : "empty", items: stories.length } };
  } catch (error) {
    console.warn(`Unable to fetch RSS source ${feed.name}:`, error);
    return { stories: [], health: { name: feed.name, publisher: feed.publisher, status: "unavailable", items: 0 } };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getStories() {
  if (cache && cache.expiresAt > Date.now()) return cache;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const queue = [...FEEDS];
    const results: Awaited<ReturnType<typeof fetchFeed>>[] = [];
    await Promise.all(Array.from({ length: FETCH_CONCURRENCY }, async () => {
      let definition: FeedDefinition | undefined;
      while ((definition = queue.shift())) results.push(await fetchFeed(definition));
    }));
    const unique = new Map<string, NewsStory>((cache?.stories || []).filter((story) => Date.parse(story.published_at) >= Date.now() - 7 * 86400000).map((story) => [story.id, story]));
    for (const story of results.flatMap(result => result.stories)) {
      const existing = unique.get(story.id);
      if (existing) {
        story.categories = [...new Set([...existing.categories, ...story.categories])];
        if (story.categories.includes("AI")) story.category = "AI";
      }
      unique.set(story.id, story);
    }

    const stories = [...unique.values()]
      .sort((a, b) => Number(b.is_breaking) - Number(a.is_breaking) || Date.parse(b.published_at) - Date.parse(a.published_at))
      .slice(0, MAX_STORIES);
    if (!stories.length && cache?.stories.length) {
      cache = { ...cache, expiresAt: Date.now() + 60_000 };
      return cache;
    }
    const sources = [...new Set(stories.map((story) => story.source))];
    cache = { expiresAt: Date.now() + CACHE_TTL_MS, stories, sources, sourceHealth: results.map(result => result.health) };
    return cache;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export function matchesCountry(story: NewsStory, country: string): boolean {
  const terms = COUNTRY_TERMS[country];
  if (!terms) return true;
  const text = `${story.original_title} ${story.executive_summary}`.toLowerCase();
  return terms.some((term) => {
    if (term === "us" || term === "uk") return new RegExp(`\\b${term}\\b`).test(text);
    return text.includes(term);
  });
}


export async function getStory(id: string) { return (await getStories()).stories.find((story) => story.id === id) ?? null; }
