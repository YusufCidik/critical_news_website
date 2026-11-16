import { FEEDS } from "./sources";
const PUBLISHERS = [...new Set([
  ...FEEDS.map(feed => new URL(feed.url).hostname.replace(/^www\./, "")),
  "bbc.com", "bbc.co.uk", "ntv.com.tr", "abc.net.au", "abcnews.go.com", "ieee.org", "mit.edu",
  "sky.com", "skysports.com", "cna.asia", "cbc.ca", "espn.com", "arstechnica.com", "dw.com", "npr.org",
])];
const IMAGE_HOSTS = [...PUBLISHERS,
  "bbci.co.uk", "guim.co.uk", "aljazeera.net", "static.dw.com", "dwcdn.net", "nprcdn.net",
  "npr.brightspotcdn.com", "vox-cdn.com", "platform.theverge.com", "wp.com", "futurecdn.net",
  "trt.net.tr", "aa.com.tr", "arcpublishing.com", "cloudfront.net", "cbsistatic.com", "imgix.net",
  "brightspotcdn.com",
];
export function allowedURL(value: string, images = false) {
  try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password && (!u.port || u.port === "443") && (images ? IMAGE_HOSTS : PUBLISHERS).some((host) => u.hostname === host || u.hostname.endsWith("." + host)); } catch { return false; }
}
export async function publisherFetch(url: string, images = false): Promise<Response> {
  for (let i = 0; i < 4; i++) {
    if (!allowedURL(url, images)) throw new Error("Untrusted publisher URL");
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(7000), headers: { "User-Agent": "Mozilla/5.0 (compatible; IntelMatrixNewsReader/1.0)", Accept: images ? "image/avif,image/webp,image/*" : "text/html" } });
    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) { url = new URL(response.headers.get("location")!, url).href; continue; }
    if (!response.ok) throw new Error("Publisher unavailable");
    return response;
  }
  throw new Error("Too many redirects");
}
export function extractPageImages(html: string, base: string) {
  const result: string[] = [];
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = Object.fromEntries([...tag[0].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map((m) => [m[1].toLowerCase(), m[2]]));
    if (!/^(og:image(?::url|:secure_url)?|twitter:image(?::src)?)$/i.test(attrs.property || attrs.name || "") || !attrs.content) continue;
    try { const url = new URL(attrs.content.replace(/&amp;/g, "&").replace(/&#0?38;/g, "&"), base).href; if (allowedURL(url, true) && !result.includes(url)) result.push(url); } catch {}
  }
  return result;
}
const metadata = new Map<string, { expires: number; urls: string[] }>();
export async function articleImages(id: string, source: string) {
  const hit = metadata.get(id);
  if (hit && hit.expires > Date.now()) return hit.urls;
  const response = await publisherFetch(source);
  const html = (await response.text()).slice(0, 1500000);
  const urls = extractPageImages(html, source);
  if (metadata.size > 1000) metadata.delete(metadata.keys().next().value!);
  metadata.set(id, { expires: Date.now() + (urls.length ? 3600000 : 60000), urls });
  return urls;
}
