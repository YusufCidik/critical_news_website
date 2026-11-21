// Loaded only by the Playwright server. All provider responses are fixtures.
const realFetch = globalThis.fetch;
const timestamp = new Date(Date.now() - 60_000).toUTCString();
const earlier = new Date(Date.now() - 90 * 60_000).toUTCString();
const item = (slug, title, description, date = timestamp) =>
  `<item><title>${title}</title><link>https://example.org/${slug}</link><description>${description}</description><pubDate>${date}</pubDate></item>`;
const first = item("riverside-bbc", "Riverside bridge collapse during holiday parade",
  "Police reported 12 fatalities. More than 2 million residents lost power nationwide. Parliament approves a state of emergency.", earlier);
const second = item("riverside-guardian", "Holiday parade disrupted by Riverside bridge collapse",
  "Officials reported 15 fatalities. A category 5 storm damaged the region. The rescue effort continues.");
const briefs = item("telescope", "Telescope maps unusual planets near Vega",
  "Astronomers announced the observations on Tuesday. The team gathered infrared readings from space. Independent teams will review the images.");
const fixtures = Array.from({ length: 19 }, (_, i) =>
  item("travel-" + i, `Island travel guide ${i + 1}`, `Tourism staff published travel advice for island ${i + 1}.`)).join("");
const rss = (items) => new Response(`<?xml version="1.0"?><rss version="2.0"><channel><title>Test</title>${items}</channel></rss>`, {
  headers: { "Content-Type": "application/rss+xml" },
});
globalThis.fetch = async (request, options) => {
  const url = new URL(typeof request === "string" || request instanceof URL ? request : request.url);
  if (["localhost", "127.0.0.1"].includes(url.hostname)) return realFetch(request, options);
  if (url.hostname.includes("frankfurter")) return Response.json({ base: "USD", date: "2026-01-01", rates: { EUR: 0.91 } });
  if (url.hostname === "api.mymemory.translated.net") return Response.json({ responseStatus: 429 });
  if (url.href === "https://feeds.bbci.co.uk/news/world/rss.xml") return rss(first + briefs + fixtures);
  if (url.href === "https://www.theguardian.com/world/rss") return rss(second);
  return rss("");
};
