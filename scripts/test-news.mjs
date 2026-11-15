import assert from "node:assert/strict";
import Module from "node:module";
import path from "node:path";
import { test } from "node:test";
import { build } from "esbuild";

const bundled = await build({
  stdin: { contents: `
    export * as feed from "./lib/news/feed";
    export * as news from "./app/api/news/route";
    export * as translate from "./app/api/translate/route";
    export * as assistant from "./app/api/assistant/route";
    export * as briefing from "./lib/news/briefing";
    export * as detailApi from "./app/api/news/[id]/briefing/route";
  `, resolveDir: process.cwd(), sourcefile: "news-test-entry.ts", loader: "ts" },
  bundle: true, write: false, format: "cjs", platform: "node", packages: "external",
  plugins: [{ name: "fake-ai", setup(builder) {
    builder.onResolve({ filter: /^@google\/genai$/ }, () => ({ path: "fake-ai", namespace: "test" }));
    builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({ contents: 'export class GoogleGenAI { models = { generateContent: (request) => globalThis.__intelmatrixAI(request) }; }' }));
  } }],
});
const filename = path.join(process.cwd(), "scripts", ".news-test-bundle.cjs");
const compiled = new Module(filename);
compiled.filename = filename;
compiled.paths = Module._nodeModulePaths(path.dirname(filename));
compiled._compile(bundled.outputFiles[0].text, filename);
const { feed, news, translate, assistant, briefing, detailApi } = compiled.exports;
const oldFetch = globalThis.fetch;
const oldKey = process.env.GEMINI_API_KEY;
delete process.env.GEMINI_API_KEY;
const post = (url, body) => new Request("http://localhost" + url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const emptyFeed = '<?xml version="1.0"?><rss version="2.0"><channel><title>Test</title></channel></rss>';
const date = new Date().toUTCString();
const xml = (items) => `<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>Test</title>${items}</channel></rss>`;
const item = (id, title, extra = "") => `<item><title>${title}</title><link>https://example.org/${id}</link><description>A source excerpt for ${title}.</description><pubDate>${date}</pubDate>${extra}</item>`;

try {
  await test("RSS normalization, media variants, categories and stable detail lookup", async () => {
    assert.equal(feed.extractImage({ "media:content": [{ $: { url: "https://example.org/cover.jpg", medium: "image" } }] }), "https://example.org/cover.jpg");
    assert.equal(feed.extractImage({ enclosure: { url: "https://example.org/podcast.mp3", type: "audio/mpeg" } }), null);
    assert.equal(feed.extractImage({ link: "https://example.org/article", "media:group": { "media:thumbnail": [{ $: { url: "/cover.jpg?a=1&amp;b=2" } }] } }), "https://example.org/cover.jpg?a=1&b=2");
    assert.equal(feed.extractImage({ content: '<img src="javascript:alert(1)">' }), null);
    globalThis.fetch = async (url) => new Response(String(url).includes("news/world/rss") ? xml(item("hardware", "Hardware research awarded grant") + item("conflict", "Breaking: War escalates", '<media:content url="https://example.org/war.jpg" medium="image"/>') + item("sport", "Record-breaking sporting achievement")) : String(url).includes("news/health/rss") ? xml(item("health", "Health research study published")) : emptyFeed);
    const result = await feed.getStories();
    assert.equal(result.stories.length, 4);
    const hardware = result.stories.find((story) => story.source_url.endsWith("/hardware"));
    assert.equal(hardware.impact_score, 5, "hardware/awarded must not match war");
    assert.equal(result.stories.find((story) => story.source_url.endsWith("/sport")).is_breaking, false);
    assert.equal(result.stories.find((story) => story.source_url.endsWith("/health")).category, "Sağlık");
    const conflict = result.stories.find((story) => story.source_url.endsWith("/conflict"));
    assert.equal(conflict.image_url, "https://example.org/war.jpg");
    assert.equal(conflict.is_breaking, true);
    assert.equal((await feed.getStory(conflict.id)).source_url, conflict.source_url);
    const response = await news.GET(new Request("http://localhost/api/news?limit=2"));
    const page = await response.json();
    assert.equal(response.status, 200);
    assert.equal(page.items.length, 2);
    assert.equal(page.nextCursor, 2);
    const health = await (await news.GET(new Request("http://localhost/api/news?category=Sa%C4%9Fl%C4%B1k"))).json();
    assert.equal(health.items.length, 1);
    assert.deepEqual(health.sources, ["BBC Health"]);
  });
  await test("translation preserves full text and distinguishes equal prefixes", async () => {
    const queries = [];
    globalThis.fetch = async (url) => {
      const query = new URL(url).searchParams.get("q");
      queries.push(query);
      assert.ok(Buffer.byteLength(query, "utf8") <= 450);
      return Response.json({ responseStatus: 200, responseData: { translatedText: query + "~" } });
    };
    const long = "Long title ".repeat(70) + "FINAL";
    const a = "x".repeat(110) + " A", b = "x".repeat(110) + " B";
    const response = await translate.POST(post("/api/translate", { texts: [long, a, b], sourceLangs: ["en", "en", "en"], targetLang: "tr" }));
    const data = await response.json();
    assert.equal(data.complete, true);
    assert.equal(data.translations[0].replaceAll("~", ""), long);
    assert.notEqual(data.translations[1], data.translations[2]);
    assert.ok(queries.length > 3);
    const before = queries.length;
    await translate.POST(post("/api/translate", { texts: [a], sourceLangs: ["en"], targetLang: "tr" }));
    assert.equal(queries.length, before, "successful translations are cached");
  });
  await test("translation failures are explicit and remain retryable", async () => {
    globalThis.fetch = async () => Response.json({ responseStatus: 429, responseData: { translatedText: "MYMEMORY WARNING" } });
    const body = { texts: ["Retry this unique headline"], sourceLangs: ["en"], targetLang: "de" };
    const failed = await (await translate.POST(post("/api/translate", body))).json();
    assert.equal(failed.complete, false);
    assert.equal(failed.resolved[0], false);
    globalThis.fetch = async () => Response.json({ responseStatus: 200, responseData: { translatedText: "Erneut versuchen" } });
    const retried = await (await translate.POST(post("/api/translate", body))).json();
    assert.equal(retried.complete, true);
    assert.equal(retried.translations[0], "Erneut versuchen");
    assert.equal((await translate.POST(post("/api/translate", { texts: ["x"], targetLang: "invalid" }))).status, 400);
  });
  await test("assistant fallback shows actual excerpts and article references", async () => {
    const response = await assistant.POST(post("/api/assistant", { question: "Important news?", language: "en", articles: [{ id: "a".repeat(40), title: "Source headline", summary: "A concrete event described by the publisher.", source: "Test", impact_score: 8 }] }));
    const data = await response.json();
    assert.equal(data.degraded, true);
    assert.match(data.answer, /A concrete event/);
    assert.equal(data.references[0].id, "a".repeat(40));
    assert.equal((await assistant.POST(post("/api/assistant", { question: 42 }))).status, 400);
  });
  await test("AI briefing distinguishes configuration errors and validates generated output", async () => {
    const story = (await feed.getStories()).stories[0];
    assert.equal((await briefing.generateArticleBriefing(story, "tr")).reason, "not_configured");
    process.env.GEMINI_API_KEY = "test-only-not-a-real-key";
    let calls = 0;
    const valid = { summary: "Supported summary", background: "Source context", key_points: ["Fact one", "Fact two"], why_it_matters: "Cautious interpretation", uncertainty: "Missing details" };
    globalThis.__intelmatrixAI = async () => { calls++; return { text: JSON.stringify(valid) }; };
    const generated = await briefing.generateArticleBriefing(story, "tr");
    assert.equal(generated.available, true);
    assert.equal(generated.briefing.summary, valid.summary);
    await briefing.generateArticleBriefing(story, "tr");
    assert.equal(calls, 1, "repeat requests reuse the briefing");
    globalThis.__intelmatrixAI = async () => ({ text: "{}" });
    assert.equal((await briefing.generateArticleBriefing(story, "fr")).available, false);
    globalThis.__intelmatrixAI = async () => ({ text: JSON.stringify(valid) });
    assert.equal((await briefing.generateArticleBriefing(story, "fr")).available, true, "failure is not cached");
    assert.equal((await detailApi.POST(post("/api/news/bad/briefing", { language: "tr" }), { params: Promise.resolve({ id: "bad" }) })).status, 404);
  });
  await test("AI assistant carries language and conversation, and links cited stories", async () => {
    let request;
    globalThis.__intelmatrixAI = async (value) => { request = value; return { text: "Supported answer [1]" }; };
    const response = await assistant.POST(post("/api/assistant", { question: "Explain it", language: "de", history: [{ role: "user", text: "Earlier question" }], articles: [{ id: "b".repeat(40), title: "Headline", summary: "Summary" }] }));
    const data = await response.json();
    assert.equal(data.degraded, false);
    assert.equal(data.references[0].id, "b".repeat(40));
    assert.match(request.config.systemInstruction, /language code de/);
    assert.equal(JSON.parse(request.contents).conversation[0].text, "Earlier question");
  });
} finally {
  globalThis.fetch = oldFetch;
  delete globalThis.__intelmatrixAI;
  if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey;
}
