import { normalizeNewsText, type NewsCategory } from "./categories";
import type { ImpactAssessment } from "./impact";
import type { EventBadge } from "./events";

export const MAX_SEARCH_LENGTH = 100;

export function matchesNewsSearch(story: {
  original_title: string;
  translated_title?: string;
  localized_title?: { text: string };
  executive_summary: string;
  source?: string;
  publisher?: string;
  classification?: { tags: string[] };
}, query: string) {
  const words = normalizeNewsText(query.slice(0, MAX_SEARCH_LENGTH)).match(/[\p{L}\p{N}]+/gu) ?? [];
  if (!words.length) return true;
  const haystack = normalizeNewsText([story.original_title, story.translated_title, story.localized_title?.text, story.executive_summary, story.source, story.publisher, ...(story.classification?.tags ?? [])].join(" "));
  return words.every((word) => haystack.includes(word));
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

const countryPatterns = new Map(Object.entries(COUNTRY_TERMS).map(([country, terms]) => [
  country, new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${terms.filter((term) => term !== "us" && term !== "uk")
    .map((term) => normalizeNewsText(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?=$|[^\\p{L}\\p{N}])`, "u"),
]));

export function matchesCountry(story: { original_title: string; executive_summary: string }, country: string): boolean {
  const pattern = countryPatterns.get(country);
  if (!pattern) return true;
  const text = `${story.original_title} ${story.executive_summary}`;
  return pattern.test(normalizeNewsText(text)) || (country === "us" && /\bUS\b/.test(text)) || (country === "uk" && /\bUK\b/.test(text));
}

export function compareNewsPriority(
  a: { impact?: ImpactAssessment; published_at?: string; id: string },
  b: { impact?: ImpactAssessment; published_at?: string; id: string },
  sort = "importance",
  category = "all",
) {
  const score = (story: typeof a) => category === "all" ? (story.impact?.global ?? 0) : (story.impact?.byCategory?.[category as NewsCategory] ?? 0);
  return (sort === "latest" ? 0 : score(b) - score(a))
    || (Date.parse(b.published_at ?? "") || 0) - (Date.parse(a.published_at ?? "") || 0)
    || a.id.localeCompare(b.id);
}

export function groupNewsByEvent<T>(stories: T[], eventFor: (story: T) => EventBadge | undefined): T[] {
  const seen = new Set<string>();
  return stories.filter((story) => {
    const event = eventFor(story);
    if (!event) return true;
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}
