import { createHash } from "node:crypto";

import Parser from "rss-parser";



type NewsCategory = "AI" | "Teknoloji" | "Jeopolitik" | "Ekonomi" | "Bilim" | "Spor" | "Kültür" | "Sağlık" | "İklim" | "Savunma" | "Enerji" | "Seyahat" | "Dünya";

interface FeedDefinition {
  name: string;
  url: string;
  category: NewsCategory;
}

export interface NewsStory {
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
    item: [["media:content", "media:content", { keepArray: true }], ["media:thumbnail", "media:thumbnail", { keepArray: true }], "media:group"],
  },
});

let cache: { expiresAt: number; stories: NewsStory[]; sources: string[] } | null = null;
let inFlight: Promise<{ expiresAt: number; stories: NewsStory[]; sources: string[] }> | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_STORIES = 2000;

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
  const normalized = text.toLowerCase();
  if (feedCategory === "Dünya" && /kurultay|parti meclisi|siyasi parti|party congress|political convention/i.test(normalized)) return "Jeopolitik";
  if (CATEGORY_TERMS.AI.some((term) => normalized.includes(term))) return "AI";
  if (feedCategory !== "Dünya") return feedCategory;
  for (const category of ["Savunma", "Sağlık", "İklim", "Enerji", "Spor", "Kültür", "Seyahat", "Jeopolitik", "Ekonomi", "Bilim", "Teknoloji"] as const) {
    if (CATEGORY_TERMS[category].some((term) => new RegExp('(?:^|\\W)' + term + '(?:$|\\W)', "iu").test(normalized))) return category;
  }
  return feedCategory;
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
  const text = `${title} ${stripMarkup(item.contentSnippet || item.summary || item.description)}`;
  const category = inferCategory(text, feed.category);
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

export async function getStories() {
  if (cache && cache.expiresAt > Date.now()) return cache;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const results = await Promise.all(FEEDS.map(fetchFeed));
    const unique = new Map<string, NewsStory>((cache?.stories || []).filter((story) => Date.parse(story.published_at) >= Date.now() - 7 * 86400000).map((story) => [story.id, story]));
    for (const story of results.flat()) {
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
    cache = { expiresAt: Date.now() + CACHE_TTL_MS, stories, sources };
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
