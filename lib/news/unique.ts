interface StoryIdentity { id: string; original_title: string; source_url?: string }
export function canonicalNewsURL(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_.+|fbclid|gclid|traffic_source|maca|cmpid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.href.replace(/\/(?=\?|$)/, "");
  } catch { return value; }
}
// Some consumers also suppress repeated headlines. The event feed owns that decision for its cards.
export function uniqueNews<T extends StoryIdentity>(items: T[], dedupeHeadlines = true): T[] {
  const ids = new Set<string>(), urls = new Set<string>(), titles = new Set<string>();
  return items.filter((item) => {
    const url = canonicalNewsURL(item.source_url);
    const title = dedupeHeadlines ? item.original_title.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim() : "";
    if (ids.has(item.id) || (url && urls.has(url)) || (title && titles.has(title))) return false;
    ids.add(item.id);
    if (url) urls.add(url);
    if (title) titles.add(title);
    return true;
  });
}

