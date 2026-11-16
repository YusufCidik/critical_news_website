import { build } from "esbuild";
import Parser from "rss-parser";
import { writeFile } from "node:fs/promises";

const built = await build({ entryPoints: ["lib/news/sources.ts"], bundle: true, write: false, platform: "node", format: "esm" });
const { FEEDS } = await import("data:text/javascript;base64," + Buffer.from(built.outputFiles[0].text).toString("base64"));
const parser = new Parser();
const queue = [...FEEDS];
const results = [];
await Promise.all(Array.from({ length: 16 }, async () => {
  while (queue.length) {
    const feed = queue.shift();
    const started = Date.now();
    try {
      const response = await fetch(feed.url, { signal: AbortSignal.timeout(7000), headers: { "User-Agent": "IntelMatrixNewsReader/1.0 (RSS reader)" } });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const parsed = await parser.parseString(await response.text());
      const recent = parsed.items.filter(item => item.title && item.link && Date.parse(item.isoDate || item.pubDate || "") >= Date.now() - 7 * 86400000).length;
      results.push({ ...feed, ok: parsed.items.length > 0 && recent > 0, items: parsed.items.length, recent, ms: Date.now() - started });
    } catch (error) { results.push({ ...feed, ok: false, error: error.message, ms: Date.now() - started }); }
  }
}));
const active = results.filter(result => result.ok);
console.log(JSON.stringify({ checked: results.length, active: active.length, publishers: new Set(active.map(feed => feed.publisher)).size, recentItems: active.reduce((sum, feed) => sum + feed.recent, 0), failed: results.filter(result => !result.ok).map(feed => ({ name: feed.name, error: feed.error || "No recent dated items" })) }, null, 2));
if (process.argv.includes("--report")) await writeFile(".source-health.json", JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
if (!active.length) process.exitCode = 1;
