import { createHash } from "node:crypto";

import Parser from "rss-parser";
import { readResponseBytes } from "@/lib/http/response";

import { classifyNews, type Classification, type NewsCategory } from "./categories";
import { assessImpact, type ImpactAssessment } from "./impact";
import { EventIndex } from "./events";
import { newsSentences } from "./text";
import { canonicalNewsURL } from "./unique";
import { FEEDS, type FeedDefinition } from "./sources";

export interface NewsStory {
  id: string;
  original_title: string;
  translated_title: string;
  executive_summary: string;
  impact_score: number;
  category: NewsCategory;
  categories: NewsCategory[];
  classification: Classification;
  impact: ImpactAssessment;
  publisher: string;
  evidence: { text: string; kind: "rss-excerpt" | "rss-content" };
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

const parser = new Parser({
  timeout: 5_000,
  customFields: {
    item: [["content:encoded", "content:encoded"], ["media:content", "media:content", { keepArray: true }], ["media:thumbnail", "media:thumbnail", { keepArray: true }], "media:group"],
  },
});

const eventIndex = new EventIndex();
let cache: FeedSnapshot | null = null;
let inFlight: Promise<FeedSnapshot> | null = null;
const CACHE_TTL_MS = 30 * 1000;
const MAX_STORIES = 12000;
const FETCH_CONCURRENCY = 20;
interface FeedHealth { name: string; publisher: string; status: "active" | "empty" | "unavailable"; items: number }
type FeedSnapshot = { expiresAt: number; stories: NewsStory[]; sources: string[]; sourceHealth: FeedHealth[]; events: EventIndex; updatedAt: string; byId: Map<string, NewsStory> };

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
  const concise = newsSentences(raw.slice(0, 2000), 2).join(" ");
  return concise.length > 360 ? `${concise.slice(0, 357).trimEnd()}...` : concise;
}

function normalizeItem(item: Record<string, unknown>, feed: FeedDefinition): NewsStory | null {
  const title = stripMarkup(item.title).slice(0, 500);
  const url = typeof item.link === "string" ? item.link.trim() : "";
  if (!title || !url) return null;

  const publishedAt = item.isoDate || item.pubDate;
  try {
    const source = new URL(url);
    if (!["https:", "http:"].includes(source.protocol) || source.username || source.password) return null;
  } catch { return null; }
  if (typeof publishedAt !== "string" || !Number.isFinite(Date.parse(publishedAt))) return null;
  const date = new Date(publishedAt);
  if (date.getTime() > Date.now() + 15 * 60_000) return null;
  const lead = stripMarkup(item.contentSnippet || item.summary || item.description || item.content);
  const content = stripMarkup(item["content:encoded"]);
  const evidence = { text: (content.length > lead.length ? content : lead).slice(0, 6000), kind: (content.length > lead.length ? "rss-content" : "rss-excerpt") as NewsStory["evidence"]["kind"] };
  const topics = Array.isArray(item.categories) ? item.categories.filter((value): value is string => typeof value === "string") : [];
  const classification = classifyNews(title, lead || evidence.text, feed.category, topics);
  const impact = assessImpact(title, (evidence.text || lead).slice(0, 2000), classification.category, classification.categories);
  const id = createHash("sha1").update(url).digest("hex");
  const ageHours = Math.max(0, Date.now() - date.getTime()) / 3_600_000;
  const isBreaking = ageHours <= 24 && /(?:^|\s)(breaking(?: news)?|live updates|just in|developing|son dakika)(?:\s|:|$)/i.test(title);

  return {
    id,
    original_title: title,
    translated_title: title,
    executive_summary: getSummary(item, title),
    impact_score: impact.global ?? 0,
    impact,
    ...classification,
    publisher: feed.publisher,
    evidence,
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
    const xml = new TextDecoder().decode(await readResponseBytes(response, 2_000_000));
    const parsed = await parser.parseString(xml);
    const stories = (parsed.items ?? []).slice(0, 200)
      .map((item) => normalizeItem(item as unknown as Record<string, unknown>, feed))
      .filter((item): item is NewsStory => item !== null && Date.parse(item.published_at) >= Date.now() - 7 * 86400000);
    return { stories, health: { name: feed.name, publisher: feed.publisher, status: stories.length ? "active" : "empty", items: stories.length } };
  } catch {
    return { stories: [], health: { name: feed.name, publisher: feed.publisher, status: "unavailable", items: 0 } };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getStories(refresh = false) {
  if (!refresh && cache && cache.expiresAt > Date.now()) return cache;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const queue = [...FEEDS];
    const results: Awaited<ReturnType<typeof fetchFeed>>[] = Array(FEEDS.length);
    const positions = new Map(FEEDS.map((feed, index) => [feed, index]));
    await Promise.all(Array.from({ length: FETCH_CONCURRENCY }, async () => {
      let definition: FeedDefinition | undefined;
      while ((definition = queue.shift())) results[positions.get(definition)!] = await fetchFeed(definition);
    }));
    const recent = Date.now() - 7 * 86400000;
    const refreshedAt = new Date().toISOString();
    const unique = new Map<string, NewsStory>();
    const aliases = new Map<string, string>();
    for (const story of results.flatMap(result => result.stories)) {
      if (Date.parse(story.published_at) < recent) continue;
      const identity = canonicalNewsURL(story.source_url);
      aliases.set(story.id, identity);
      const existing = unique.get(identity);
      if (!existing || story.classification.confidence_score > existing.classification.confidence_score
        || (story.classification.confidence_score === existing.classification.confidence_score && story.evidence.text.length > existing.evidence.text.length)) {
        unique.set(identity, story);
      }
    }
    for (const previous of cache?.stories ?? []) {
      if (Date.parse(previous.published_at) < recent) continue;
      const identity = canonicalNewsURL(previous.source_url);
      const fresh = unique.get(identity);
      if (!fresh) unique.set(identity, previous);
      else if (fresh.id !== previous.id) unique.set(identity, { ...fresh, id: previous.id });
    }

    const stories = [...unique.values()]
      .sort((a, b) => Number(b.is_breaking) - Number(a.is_breaking) || Date.parse(b.published_at) - Date.parse(a.published_at))
      .slice(0, MAX_STORIES);
    const byId = new Map(stories.map((story) => [story.id, story]));
    for (const [alias, identity] of aliases) {
      const target = unique.get(identity)!;
      if (byId.has(target.id)) byId.set(alias, target);
    }
    // Preserve link aliases while the target remains in the rolling window.
    for (const [alias, previous] of cache?.byId ?? []) {
      const target = unique.get(canonicalNewsURL(previous.source_url));
      if (target && byId.has(target.id)) byId.set(alias, target);
    }
    eventIndex.update(stories);
    const sources = [...new Set(stories.map((story) => story.source))];
    const sourceHealth = results.map(({ health }) => health);
    const unavailable = sourceHealth.filter(({ status }) => status === "unavailable");
    const servedStale = unavailable.length === FEEDS.length && !!cache?.stories.length;
    if (unavailable.length) console.warn(JSON.stringify({
      event: "rss_refresh_degraded", unavailable: unavailable.map(({ name }) => name), retainedStories: stories.length, servedStale,
    }));
    cache = { expiresAt: Date.now() + (servedStale ? 60_000 : CACHE_TTL_MS), stories, sources, sourceHealth, events: eventIndex, updatedAt: servedStale ? cache!.updatedAt : refreshedAt, byId };
    return cache;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export async function getStory(id: string) { return (await getStories()).byId.get(id) ?? null; }

export async function getStoryCoverage(id: string) {
  const snapshot = await getStories();
  const story = snapshot.byId.get(id) ?? null;
  return { story, event: story ? snapshot.events.coverage(story.id) : undefined };
}

export function publicStory({ evidence, ...story }: NewsStory) {
  void evidence; // Full RSS passages remain on the server.
  return story;
}
