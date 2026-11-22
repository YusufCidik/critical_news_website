import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";
import Module from "node:module";
import path from "node:path";
import { test } from "node:test";
import { build } from "esbuild";

const bundled = await build({
  stdin: { contents: `
    export { resolveReplyPolicy, enforceReplyBudget } from "./lib/ai/reply-policy";
    export { ASSISTANT_MODEL, FREE_TIER_MODELS, resolveFreeTierModel, generateEditorialContent } from "./lib/ai/client";
    export { TranslationQueue } from "./lib/i18n/client-translation";
    export { isTranslationUsable } from "./lib/i18n/server-translate";
    export { NewsDetail } from "./components/NewsDetail";
    export { classifyNews, matchesNewsCategory } from "./lib/news/categories";
    export { selectAssistantNews } from "./lib/news/assistant-context";
    export { FEEDS } from "./lib/news/sources";
    export { NewsFeed } from "./components/NewsFeed";
    export { NewsArticleCard } from "./components/NewsArticleCard";
    export { uniqueNews } from "./lib/news/unique";
    export * as images from "./lib/news/images";
    export * as imageApi from "./app/api/news/[id]/image/route";
    export * as feed from "./lib/news/feed";
    export * as news from "./app/api/news/route";
    export * as translate from "./app/api/translate/route";
    export * as assistant from "./app/api/assistant/route";
    export * as briefing from "./lib/news/briefing";
    export { assessImpact } from "./lib/news/impact";
    export { EventIndex } from "./lib/news/events";
    export { compareNewsPriority, groupNewsByEvent, matchesCountry } from "./lib/news/discovery";
    export { readResponseBytes } from "./lib/http/response";
    export * as ingest from "./app/api/ingest/route";
    export * as detailApi from "./app/api/news/[id]/briefing/route";
  `, resolveDir: process.cwd(), sourcefile: "news-test-entry.ts", loader: "ts" },
  bundle: true, write: false, format: "cjs", platform: "node", packages: "external",
  plugins: [{ name: "fake-ai", setup(builder) {
    builder.onResolve({ filter: /^@google\/genai$/ }, () => ({ path: "fake-ai", namespace: "test" }));
    builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({ contents: 'export const ThinkingLevel = { LOW: "LOW" }; export class GoogleGenAI { models = { generateContent: (request) => globalThis.__intelmatrixAI(request) }; }' }));
  } }],
});
const filename = path.join(process.cwd(), "scripts", ".news-test-bundle.cjs");
const compiled = new Module(filename);
compiled.filename = filename;
compiled.paths = Module._nodeModulePaths(path.dirname(filename));
compiled._compile(bundled.outputFiles[0].text, filename);
const { feed, news, translate, assistant, briefing, detailApi, images, imageApi, NewsFeed, NewsArticleCard, uniqueNews, TranslationQueue, isTranslationUsable, NewsDetail, resolveReplyPolicy, enforceReplyBudget, ASSISTANT_MODEL, FREE_TIER_MODELS, resolveFreeTierModel, generateEditorialContent } = compiled.exports;
const { classifyNews, matchesNewsCategory, FEEDS, selectAssistantNews, assessImpact, compareNewsPriority, EventIndex, groupNewsByEvent, matchesCountry, readResponseBytes, ingest } = compiled.exports;
const oldFetch = globalThis.fetch;
const oldKey = process.env.GEMINI_API_KEY;
delete process.env.GEMINI_API_KEY;
const post = (url, body) => new Request("http://localhost" + url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const emptyFeed = '<?xml version="1.0"?><rss version="2.0"><channel><title>Test</title></channel></rss>';
const date = new Date().toUTCString();
const xml = (items) => `<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>Test</title>${items}</channel></rss>`;
const item = (id, title, extra = "") => `<item><title>${title}</title><link>https://example.org/${id}</link><description>A source excerpt for ${title}.</description><pubDate>${date}</pubDate>${extra}</item>`;

async function until(condition) { const end = Date.now() + 4000; while (!condition()) { if (Date.now() > end) throw new Error("Queue timed out"); await new Promise((resolve) => setTimeout(resolve, 5)); } }

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
    assert.equal(hardware.impact.global, null, "hardware/awarded has no consequence evidence");
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

  await test("entity and publisher topics support overlapping categories without gaming or venue false positives", () => {
    for (const title of ["Nvidia releases a new reasoning model", "DeepSeek releases a new reasoning model", "Yeni yapay zekânın yetenekleri açıklandı"]) {
      const classified = classifyNews(title, "", "Teknoloji");
      assert.ok(classified.categories.includes("AI"), title);
      assert.ok(classified.categories.includes("Teknoloji"), title);
    }
    assert.ok(!classifyNews("A new benchmark is released", "", "AI").categories.includes("AI"));
    assert.ok(!classifyNews("A new benchmark is released", "", "Bilim", ["Machine Learning"]).categories.includes("AI"));
    assert.ok(!classifyNews("Nvidia GeForce RTX gaming benchmarks", "", "Teknoloji").categories.includes("AI"));
    assert.ok(!classifyNews("Claude Monet exhibition opens", "", "Kültür").categories.includes("AI"));
    const politics = classifyNews("Yeni Parti Ankara Spor Salonu'nda kurultay düzenledi", "", "Dünya");
    assert.equal(politics.category, "Jeopolitik");
    assert.ok(!politics.categories.includes("Spor"));
    assert.ok(!matchesNewsCategory({ category: "AI", categories: ["AI"], original_title: "Swiss protesters march against military spending", executive_summary: "" }, "AI"), "legacy cached AI labels are reclassified");
    assert.ok(new Set(FEEDS.map(feed => feed.publisher)).size >= 60);
    assert.equal(new Set(FEEDS.map(feed => feed.url)).size, FEEDS.length);
    assert.ok(FEEDS.filter(feed => feed.category === "AI").length >= 6);
  });

  await test("API includes the same article in every relevant category and only once in the combined feed", async () => {
    const snapshot = await feed.getStories();
    const original = [...snapshot.stories];
    const story = { ...original[0], id: "0".repeat(40), original_title: "Nvidia releases a new reasoning model", source_url: "https://example.org/nvidia", ...classifyNews("Nvidia releases a new reasoning model", "", "Teknoloji") };
    snapshot.stories.push(story);
    try {
      for (const category of ["AI", "Teknoloji", "all"]) {
        const response = await news.GET(new Request("http://localhost/api/news?limit=24&category=" + category));
        const data = await response.json();
        assert.equal(data.items.filter(item => item.id === story.id).length, 1, category);
        assert.equal(data.coverage.configuredFeeds, FEEDS.length);
      }
    } finally { snapshot.stories.splice(0, snapshot.stories.length, ...original); }
  });

  await test("large assistant feeds retain relevant AI entities within a bounded semantic request", async () => {
    const previousKey = process.env.GEMINI_API_KEY;
    const previousAI = globalThis.__intelmatrixAI;
    process.env.GEMINI_API_KEY = "test-key";
    const articles = Array.from({ length: 1000 }, (_, index) => ({ id: String(index), title: "World bulletin " + index, summary: "An unrelated update", category: "D\u00fcnya", source: "Test", published_at: new Date().toISOString(), impact_score: 9 }));
    articles.push({ ...articles[0], id: "relevant", title: "Jensen Huang discusses Nvidia roadmap", category: "AI", categories: ["AI", "Teknoloji"], impact_score: 1 });
    globalThis.__intelmatrixAI = async request => {
      const { news_index } = JSON.parse(request.contents);
      assert.ok(news_index.length <= 400);
      const index = news_index.findIndex(article => article.title.includes("Jensen Huang"));
      assert.ok(index >= 0, "low-score relevant articles survive the full-feed ranking");
      return { text: JSON.stringify({ indices: [index] }) };
    };
    try { assert.ok((await selectAssistantNews("Yapay zeka gundemi", articles, [])).some(article => article.id === "relevant")); }
    finally {
      if (previousKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousKey;
      globalThis.__intelmatrixAI = previousAI;
    }
  });

  await test("publisher image recovery validates hosts, metadata and returns an image", async () => {
    assert.equal(images.allowedURL("https://127.0.0.1/image", true), false);
    assert.equal(images.allowedURL("https://www.aljazeera.com.evil.org/image", true), false);
    assert.deepEqual(images.extractPageImages('<meta content="https://www.aljazeera.com/cover.jpg?a=1&amp;b=2" property="og:image"><meta name="twitter:image" content="https://127.0.0.1/no.jpg">', "https://www.aljazeera.com/story"), ["https://www.aljazeera.com/cover.jpg?a=1&b=2"]);
    const story = (await feed.getStories()).stories.find((story) => story.source_url.endsWith("/health"));
    const originalURL = story.source_url;
    story.source_url = "https://www.bbc.com/news/health";
    globalThis.fetch = async (url) => String(url).includes("/news/health")
      ? new Response('<meta property="og:image" content="https://ichef.bbci.co.uk/recovered.jpg">')
      : new Response(new Uint8Array([255, 216, 255]), { headers: { "content-type": "image/jpeg" } });
    try {
      const response = await imageApi.GET(new Request("http://localhost/image"), { params: Promise.resolve({ id: story.id }) });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "image/jpeg");
      assert.equal((await response.arrayBuffer()).byteLength, 3);
    } finally { story.source_url = originalURL; }
  });

  await test("feed renders each article once and displays a score in every card layout", async () => {
    const stories = (await feed.getStories()).stories;
    const markup = renderToStaticMarkup(React.createElement(NewsFeed, { stories: [...stories, stories[0]], language: "tr" }));
    assert.equal((markup.match(/data-news-id=/g) || []).length, stories.length);
    assert.equal((markup.match(/Küresel etki/g) || []).length, stories.length);
    assert.match(markup, /Yetersiz kanıt/);
    for (const story of stories) assert.equal(markup.split('data-news-id="' + story.id + '"').length - 1, 1);
    for (const layout of ["compact", "feature"]) {
      const impact = assessImpact("Parliament approves a law nationwide", "", "Jeopolitik");
      const card = renderToStaticMarkup(React.createElement(NewsArticleCard, { story: { ...stories[0], impact }, layout, language: "tr" }));
      assert.equal((card.match(/data-importance-score=/g) || []).length, 1);
      assert.ok(card.includes(impact.global + "/10"));
    }
  });
  await test("tracking links and equal headlines are deduplicated without merging distinct updates", () => {
    const base = { id: "first", original_title: "A new energy agreement", source_url: "https://example.org/story?utm_source=rss" };
    const result = uniqueNews([base, { ...base, id: "second", source_url: "https://example.org/story?fbclid=abc" }, { ...base, id: "third", source_url: "https://other.org/story", original_title: "A NEW energy agreement!" }, { ...base, id: "fourth", original_title: "Energy agreement signed after a new vote", source_url: "https://example.org/update" }]);
    assert.deepEqual(result.map((v) => v.id), ["first", "fourth"]);
    assert.equal(uniqueNews([base, { ...base, id: "other-edition", source_url: "https://other.org/another-event" }], false).length, 2);
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
  await test("assistant fallback cites publisher excerpts and ignores browser additions to a live feed", async () => {
    const response = await assistant.POST(post("/api/assistant", { question: "War escalates", language: "en", articles: [{ id: "a".repeat(40), title: "War escalates, browser claim", summary: "Fabricated information.", source: "Test", impact_score: 8 }] }));
    const data = await response.json();
    assert.equal(data.degraded, true);
    assert.match(data.answer, /source excerpt for Breaking: War escalates/);
    assert.ok(!data.references.some((reference) => reference.id === "a".repeat(40)));
    assert.equal((await assistant.POST(post("/api/assistant", { question: 42 }))).status, 400);
  });

  await test("briefing uses only exact publisher passages, preserves order and degrades on unsupported output", async () => {
    const base = (await feed.getStories()).stories[0];
    const story = { ...base, original_title: "Riverside opens water station", evidence: {
      kind: "rss-content", text: "Riverside opens water station. Officials opened the temporary station on Monday. It serves residents of two towns. It serves residents of two towns. A second station was announced Tuesday. Officials will review opening hours on Friday.",
    } };
    const fallback = await briefing.generateArticleBriefing(story);
    assert.equal(fallback.model, "extractive");
    assert.equal(fallback.briefing.passages.length, 2);
    assert.equal((await briefing.generateArticleBriefing({ ...story, evidence: { text: story.original_title, kind: "rss-excerpt" } })).reason, "insufficient_evidence");
    process.env.GEMINI_API_KEY = "test-only-not-a-real-key";
    let calls = 0;
    globalThis.__intelmatrixAI = async () => { calls++; return { text: '{"indices":[2,0]}' }; };
    const generated = await briefing.generateArticleBriefing(story);
    assert.equal(generated.available, true);
    assert.deepEqual(generated.briefing.passages, ["Officials opened the temporary station on Monday.", "A second station was announced Tuesday."]);
    assert.equal(generated.briefing.source, story.publisher);
    await briefing.generateArticleBriefing(story);
    assert.equal(calls, 1);
    globalThis.__intelmatrixAI = async () => ({ text: '{"indices":[200],"summary":"Unsupported claim"}' });
    assert.equal((await briefing.generateArticleBriefing({ ...story, id: "new-source" })).model, "extractive");
    globalThis.__intelmatrixAI = async () => ({ text: '{"indices":[1]}' });
    assert.notEqual((await briefing.generateArticleBriefing({ ...story, id: "new-source" })).model, "extractive");
    assert.equal((await briefing.generateArticleBriefing(story, "detailed")).briefing.passages.length, 4);
    assert.equal((await detailApi.POST(post("/api/news/bad/briefing", { language: "tr" }), { params: Promise.resolve({ id: "bad" }) })).status, 404);
  });

  await test("all five translation targets retain successes and retry failed fields", async () => {
    process.env.GEMINI_API_KEY = "test-only-not-a-real-key";
    for (const language of ["tr", "en", "de", "fr", "es"]) {
      const source = language === "en" ? "tr" : "en";
      let calls = 0;
      globalThis.__intelmatrixAI = async (request) => {
        calls++;
        const count = JSON.parse(request.contents.slice(request.contents.indexOf("Input: ") + 7)).length;
        return { text: JSON.stringify({ translations: count === 2 ? ["Translated " + language, ""] : ["Recovered " + language] }) };
      };
      globalThis.fetch = async () => Response.json({ responseStatus: 429 });
      const body = { texts: ["First unique " + language, "Second unique " + language], sourceLangs: [source, source], targetLang: language };
      const first = await (await translate.POST(post("/api/translate", body))).json();
      assert.deepEqual(first.resolved, [true, false]);
      assert.equal(first.translations[0], "Translated " + language);
      const second = await (await translate.POST(post("/api/translate", body))).json();
      assert.equal(second.complete, true);
      assert.equal(second.translations[0], "Translated " + language);
      assert.equal(second.translations[1], "Recovered " + language);
      assert.equal(calls, 2);
    }
  });
  await test("AI assistant carries language and conversation, and links cited stories", async () => {
    let request;
    globalThis.__intelmatrixAI = async (value) => { request = value; return { text: "Supported answer [1]" }; };
    const response = await assistant.POST(post("/api/assistant", { question: "Explain it", language: "de", history: [{ role: "user", text: "Earlier question" }], articles: [{ id: "b".repeat(40), title: "Headline", summary: "Summary" }] }));
    const data = await response.json();
    assert.equal(data.degraded, false);
    assert.equal(data.references[0].id, JSON.parse(request.contents).articles[0].id);
    assert.match(request.config.systemInstruction, /language code de/);
    assert.equal(JSON.parse(request.contents).conversation[0].text, "Earlier question");
  });

  await test("football questions search server articles beyond the browser's first 30 records", async () => {
    const result = await feed.getStories();
    const saved = [...result.stories];
    const priorKey = process.env.GEMINI_API_KEY;
    const base = saved[0];
    try {
      result.stories = Array.from({ length: 65 }, (_, i) => ({ ...base, id: String(i).padStart(40, "0"), original_title: "Economic update " + i, executive_summary: "A trade and inflation bulletin.", source_url: "https://example.org/economy/" + i }));
      result.stories.push({ ...base, id: "f".repeat(40), category: "Spor", original_title: "Tuchel hails England performance against Spain", executive_summary: "England beat Spain 3-2 to finish top of their Nations League group.", source_url: "https://www.bbc.com/sport/football/england-spain" });
      result.stories.push({ ...base, id: "d".repeat(40), category: "Spor", original_title: "Party congress at Ankara Sports Hall", executive_summary: "The party elected a new council.", source_url: "https://example.org/politics" });
      const visible = result.stories.slice(0, 30).map((article) => ({ id: article.id, title: article.original_title, summary: article.executive_summary }));
      process.env.GEMINI_API_KEY = "test-only-not-a-real-key";
      let indexCount = 0, answerArticles;
      globalThis.__intelmatrixAI = async (request) => {
        const input = JSON.parse(request.contents);
        if (input.news_index) {
          indexCount = input.news_index.length;
          const target = input.news_index.find((article) => article.title.includes("Tuchel"));
          return { text: JSON.stringify({ indices: [target.index, -1, 99999, target.index] }) };
        }
        answerArticles = input.articles;
        return { text: "İngiltere İspanya'yı 3-2 yendi [1]." };
      };
      const response = await assistant.POST(post("/api/assistant", { question: "peki futbolla ilgili neler var", language: "tr", articles: visible, history: [{ role: "assistant", text: "Futbol haberi yok." }] }));
      const data = await response.json();
      assert.equal(data.degraded, false);
      assert.equal(indexCount, 67);
      assert.equal(data.searchedArticles, 67);
      assert.equal(data.references[0].id, "f".repeat(40));
      assert.ok(answerArticles.some((article) => article.summary.includes("3-2")));
      assert.ok(!answerArticles.some((article) => article.id === "d".repeat(40)));
      delete process.env.GEMINI_API_KEY;
      const offline = await (await assistant.POST(post("/api/assistant", { question: "futbol", language: "tr", articles: [] }))).json();
      assert.equal(offline.degraded, true);
      assert.equal(offline.references[0].id, "f".repeat(40));
      assert.equal(feed.inferCategory("Yeni Parti Ankara Spor Salonu'nda ilk kurultayını yaptı", "Dünya"), "Jeopolitik");
    } finally {
      result.stories = saved;
      if (priorKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = priorKey;
    }
  });

  await test("translation queue preserves in-flight headlines when more stories are appended", async () => {
    const calls = [];
    let release;
    const queue = new TranslationQueue(async (entries) => {
      calls.push(entries.map((v) => v.text));
      if (entries.some((v) => v.text === "first headline")) await new Promise((resolve) => { release = resolve; });
      return { complete: true, translations: entries.map((v) => "translated " + v.text) };
    }, 0);
    const first = { text: "first headline", source: "en", priority: 0 };
    const summary = { text: "first summary", source: "en", priority: 1 };
    const next = { text: "second headline", source: "en", priority: 0 };
    let stop = queue.watch("feed", [first, summary], "tr");
    await until(() => Boolean(release));
    stop();
    stop = queue.watch("feed", [first, summary, next], "tr");
    release();
    await until(() => queue.status([first, summary, next], "tr") === "ready");
    assert.equal(calls.flat().filter((text) => text === first.text).length, 1);
    assert.equal(queue.get(first.text, "en", "tr"), "translated first headline");
    assert.equal(calls[0][0], first.text);
    stop();
  });
  await test("translation queue retries only failed headlines and isolates languages", async () => {
    const calls = [];
    const queue = new TranslationQueue(async (entries, language) => {
      calls.push({ texts: entries.map((v) => v.text), language });
      if (calls.length === 1) return { translations: ["başlık", ""], resolved: [true, false] };
      return { complete: true, translations: entries.map((v) => language + ":" + v.text) };
    }, 0);
    const entries = ["queue headline one", "queue headline two"].map((text) => ({ text, source: "en", priority: 0 }));
    let stop = queue.watch("feed", entries, "tr");
    await until(() => queue.status(entries, "tr") === "ready");
    assert.deepEqual(calls.map((v) => v.texts.length), [2, 1]);
    assert.equal(queue.get(entries[0].text, "en", "tr"), "başlık");
    stop();
    stop = queue.watch("feed", entries, "de");
    await until(() => queue.status(entries, "de") === "ready");
    assert.equal(queue.get(entries[0].text, "en", "de"), "de:" + entries[0].text);
    assert.equal(queue.get(entries[0].text, "en", "tr"), "başlık");
    stop();
  });
  await test("successful translations survive a new page session", async () => {
    const previous = globalThis.localStorage;
    const storage = new Map();
    globalThis.localStorage = { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) };
    try {
      let calls = 0;
      const provider = async (entries) => { calls++; return { complete: true, translations: entries.map(() => "Kalıcı çeviri") }; };
      const entries = [{ text: "persistent headline", source: "en", priority: 0 }];
      const first = new TranslationQueue(provider, 0);
      const stop = first.watch("page-one", entries, "tr");
      await until(() => first.status(entries, "tr") === "ready");
      stop();
      const second = new TranslationQueue(provider, 0);
      const stopSecond = second.watch("page-two", entries, "tr");
      assert.equal(second.get(entries[0].text, "en", "tr"), "Kalıcı çeviri");
      assert.equal(second.status(entries, "tr"), "ready");
      assert.equal(calls, 1);
      stopSecond();
    } finally {
      if (previous === undefined) delete globalThis.localStorage; else globalThis.localStorage = previous;
    }
  });
  await test("untranslated English headlines are not accepted or cached as translated", async () => {
    const title = "The government announces new energy measures.";
    assert.equal(isTranslationUsable(title, title, "en", "tr"), false);
    assert.equal(isTranslationUsable(title, title.slice(0, -1), "en", "tr"), false);
    assert.equal(isTranslationUsable("OpenAI GPT", "OpenAI GPT", "en", "tr"), true);
    process.env.GEMINI_API_KEY = "test-only-not-a-real-key";
    let calls = 0;
    globalThis.__intelmatrixAI = async () => { calls++; return { text: JSON.stringify({ translations: [calls === 1 ? title : "Hükümet yeni enerji önlemleri açıkladı."] }) }; };
    const body = { texts: [title], sourceLangs: ["en"], targetLang: "tr" };
    const first = await (await translate.POST(post("/api/translate", body))).json();
    assert.equal(first.complete, false);
    const second = await (await translate.POST(post("/api/translate", body))).json();
    assert.equal(second.complete, true);
    assert.equal(calls, 2);
  });

  await test("switching language during an active translation never overwrites the new language", async () => {
    let release;
    const queue = new TranslationQueue(async (entries, target) => {
      if (target === "tr") await new Promise((resolve) => { release = resolve; });
      return { complete: true, translations: entries.map(() => target + " translation") };
    }, 0);
    const entries = [{ text: "headline during language switch", source: "en", priority: 0 }];
    let stop = queue.watch("feed", entries, "tr");
    await until(() => Boolean(release));
    stop();
    stop = queue.watch("feed", entries, "de");
    await until(() => queue.status(entries, "de") === "ready");
    release();
    await until(() => queue.get(entries[0].text, "en", "tr") !== undefined);
    assert.equal(queue.get(entries[0].text, "en", "de"), "de translation");
    stop();
  });
  await test("article detail presents one headline, a visible score and separate reading sections", async () => {
    const story = (await feed.getStories()).stories[0];
    const markup = renderToStaticMarkup(React.createElement(NewsDetail, { id: story.id, initialStory: story }));
    assert.equal((markup.match(/<h1/g) || []).length, 1);
    assert.equal((markup.match(/Küresel etki/g) || []).length > 0, true);
    assert.ok(markup.includes('id="source-summary"'));
    assert.ok(markup.includes('id="ai-briefing"'));
    assert.ok(markup.includes("detail-page"));
    assert.ok(markup.includes('rel="noopener noreferrer"'));
  });

  await test("reply length preferences follow the latest instruction and retain the topic", () => {
    const history = [{ role: "user", text: "Futbol haberlerini detaylı anlat" }, { role: "assistant", text: "Long answer." }];
    const brief = resolveReplyPolicy("Bunu kısaca yaz", history);
    assert.equal(brief.mode, "brief");
    assert.equal(brief.maxWords, 60);
    assert.equal(brief.followUp, true);
    assert.equal(brief.topic, history[0].text);
    assert.equal(resolveReplyPolicy("Detaylı anlat", [{ role: "user", text: "Kısaca yaz" }]).mode, "detailed");
    assert.equal(resolveReplyPolicy("Tek cümleyle yaz", history).maxSentences, 1);
    assert.equal(resolveReplyPolicy("2 cümle ile anlat", history).maxSentences, 2);
    assert.equal(resolveReplyPolicy("5 kelimeyle anlat", []).maxWords, 5);
    assert.equal(resolveReplyPolicy("Şimdi ekonomi?", [], "brief").mode, "brief");
  });
  await test("reply budgets enforce word, sentence and bullet limits even when the model ignores them", () => {
    const long = Array.from({ length: 30 }, (_, i) => "• Important development number " + i + " affects the economy [1].").join("\n");
    const brief = enforceReplyBudget(long, resolveReplyPolicy("Kısaca yaz", []), "tr");
    assert.ok(brief.split(/\s+/).length <= 60);
    assert.ok((brief.match(/•/g) || []).length <= 3);
    assert.ok(brief.includes("[1]"));
    const one = enforceReplyBudget("First event [1]. Second event [2].", resolveReplyPolicy("Tek cümle", []), "en");
    assert.equal(one, "First event [1].");
    const ordinal = enforceReplyBudget("Ronaldinho İtalya 3. Ligi kulübünde forma giydi [1]. İkinci haber [2].", resolveReplyPolicy("Tek cümleyle yaz", []), "tr");
    assert.equal(ordinal, "Ronaldinho İtalya 3. Ligi kulübünde forma giydi [1].");
    assert.ok(!enforceReplyBudget("**News** [1, 2].", resolveReplyPolicy("Short answer", []), "en").includes("**"));
  });
  await test("assistant uses the stronger model and enforces a brief answer", async () => {
    process.env.GEMINI_API_KEY = "test-only-not-a-real-key";
    let config;
    globalThis.__intelmatrixAI = async (request) => {
      config = request;
      return { text: Array.from({ length: 30 }, (_, i) => "A supported current event " + i + " affects the economy [1].").join(" ") };
    };
    const response = await assistant.POST(post("/api/assistant", { question: "Kısaca yaz", language: "tr", history: [{ role: "user", text: "Ekonomide neler var?" }], articles: [] }));
    const result = await response.json();
    assert.equal(result.degraded, false);
    assert.equal(result.replyStyle, "brief");
    assert.equal(result.model, ASSISTANT_MODEL);
    assert.ok(result.answer.split(/\s+/).length <= 60);
    assert.equal(JSON.parse(config.contents).topic, "Ekonomide neler var?");
    assert.equal(config.config.thinkingConfig?.thinkingLevel, "LOW");
    assert.match(config.config.systemInstruction, /HARD MAXIMUM: 60 words/);
  });
  await test("server-translated headlines render without a second headline request", async () => {
    process.env.GEMINI_API_KEY = "test-only-not-a-real-key";
    globalThis.__intelmatrixAI = async (request) => {
      const texts = JSON.parse(request.contents.slice(request.contents.indexOf("Input: ") + 7));
      return { text: JSON.stringify({ translations: texts.map((text) => "Çevrilmiş başlık: " + text) }) };
    };
    const response = await news.GET(new Request("http://localhost/api/news?limit=2&language=tr"));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.ok(data.items.every((item) => item.localized_title.language === "tr"));
    assert.ok(response.headers.get("Vercel-CDN-Cache-Control").includes("s-maxage=60"));
    let calls = 0;
    const queue = new TranslationQueue(async () => { calls++; return {}; }, 0);
    const entry = { text: data.items[0].original_title, source: "en", priority: 0, translated: data.items[0].localized_title.text };
    queue.seed([entry], "tr");
    const stop = queue.watch("translated-feed", [entry], "tr");
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(queue.get(entry.text, "en", "tr"), entry.translated);
    assert.equal(calls, 0);
    assert.equal(queue.get(entry.text, "en", "de"), undefined);
    stop();
    assert.ok(data.items[0].original_title !== entry.translated);
  });

  await test("translation provider overload uses a second fast model before public translation", async () => {
    process.env.GEMINI_API_KEY = "test-only-not-a-real-key";
    const models = [];
    globalThis.__intelmatrixAI = async (request) => {
      models.push(request.model);
      if (models.length === 1) throw Object.assign(new Error("Temporary overload"), { status: 503 });
      return { text: JSON.stringify({ translations: ["Le ministre annonce une nouvelle mesure énergétique."] }) };
    };
    let publicCalls = 0;
    globalThis.fetch = async () => { publicCalls++; throw new Error("Should not need public translation"); };
    const body = { texts: ["The energy minister announces a new measure."], sourceLangs: ["en"], targetLang: "fr" };
    const result = await (await translate.POST(post("/api/translate", body))).json();
    assert.equal(result.complete, true);
    assert.equal(models.length, 2);
    assert.equal(models[1], "gemini-3.1-flash-lite");
    assert.equal(publicCalls, 0);
  });

  await test("editorial model overload falls back only to a free-tier model", async () => {
    const attempts = [];
    const ai = { models: { generateContent: async ({ model }) => {
      attempts.push(model);
      if (attempts.length === 1) throw new Error("503 unavailable");
      return { text: "A short answer" };
    } } };
    const result = await generateEditorialContent(ai, { model: ASSISTANT_MODEL, contents: "Test" });
    assert.equal(result.model, "gemini-3.5-flash-lite");
    assert.equal(result.response.text, "A short answer");
    assert.ok(attempts.every(model => FREE_TIER_MODELS.includes(model)));
  });

  await test("paid-only model overrides cannot select Hydrogen", () => {
    assert.equal(resolveFreeTierModel("gemini-4-hydrogen", "gemini-3.8-flash"), "gemini-3.8-flash");
    assert.equal(resolveFreeTierModel("models/gemini-4-carbon", "gemini-3.5-flash-lite"), "gemini-3.5-flash-lite");
    assert.equal(resolveFreeTierModel("gemini-3.8-flash", "gemini-3.1-flash-lite"), "gemini-3.8-flash");
    assert.equal(resolveFreeTierModel("models/gemini-3.1-flash-lite", "gemini-3.5-flash-lite"), "gemini-3.1-flash-lite");
    assert.ok(FREE_TIER_MODELS.includes(ASSISTANT_MODEL));
    assert.ok(!FREE_TIER_MODELS.some((model) => model.includes("hydrogen")));
  });
  await test("impact separates a championship milestone from broad consequences and speculative forecasts", () => {
    const sport = assessImpact("World Cup championship final ends in extra time", "The visitors lifted the trophy.", "Spor");
    assert.ok(sport.category >= 7);
    assert.equal(sport.global, null);
    const confirmed = assessImpact("Parliament approves nationwide flood relief", "Flooding affected 2 million people. A category 5 hurricane caused 5 billion dollars in losses. 200 households were evacuated.", "Jeopolitik", ["Jeopolitik", "İklim"]);
    assert.ok(confirmed.global >= 6);
    assert.equal(confirmed.confidence, "moderate");
    assert.equal(confirmed.byCategory["İklim"], confirmed.category);
    const speculative = assessImpact("Hurricane could become a category 5 storm", "A forecast says it could affect the power grid nationwide.", "İklim");
    assert.ok(speculative.global < confirmed.global);
    assert.ok(speculative.reasons.every((reason) => reason.provisional));
    assert.equal(assessImpact("A nuclear expert writes about a war film", "", "Kültür").global, null);
    assert.equal(assessImpact("Seismologists issue bulletin", "A magnitude 7.8 earthquake was recorded near the coast.", "Bilim").global, 2);
    assert.equal(assessImpact("Peru’da 6,7 büyüklüğündeki depremde 15 kişi yaralandı", "", "Dünya").global, 2);
    assert.equal(assessImpact("Officials denied a state of emergency", "", "Jeopolitik").global, null);
    const a = { id: "a", impact: sport, impact_score: 0, published_at: new Date().toISOString() };
    const b = { id: "b", impact: confirmed, impact_score: confirmed.global, published_at: a.published_at };
    assert.ok(compareNewsPriority(a, b) > 0);
    assert.ok(compareNewsPriority(a, b, "importance", "Spor") < 0);
  });

  await test("V3.1 distinguishes bounded outcomes, provisional impact and missing evidence", () => {
    const population = assessImpact("Flood aftermath", "2 million residents lost power after officials announced a nationwide emergency.", "Dünya");
    assert.equal(population.status, "supported");
    assert.ok(population.reasons.some((reason) => reason.dimension === "population"));
    const bounded = assessImpact("Wales beat Australia in a rugby final", "Wales secured the championship with a converted try during injury time.", "Spor");
    assert.equal(bounded.global, 1);
    assert.equal(bounded.status, "supported");
    assert.ok(bounded.category > bounded.global);
    const alleged = assessImpact("Forecasts say a storm could displace 2 million residents", "", "İklim");
    assert.equal(alleged.status, "provisional");
    assert.ok(alleged.global > 0 && alleged.global <= 4);
    assert.equal(assessImpact("Could the region face nationwide evacuations?", "No evacuation order has been issued.", "İklim").status, "insufficient");
    assert.equal(assessImpact("Officials said no evidence of 2 million residents displaced", "", "Dünya").status, "insufficient");
  });

  await test("event updates add coverage without changing identity and isolate stale or unrelated reports", () => {
    const report = (id, title, publisher, hours, excerpt) => ({
      id, original_title: title, publisher, executive_summary: excerpt, source_url: "https://example.org/" + id,
      published_at: new Date(Date.UTC(2026, 0, 1, 0) + hours * 3_600_000).toISOString(),
    });
    const first = report("a", "Riverside bridge collapse during holiday parade", "Publisher A", 0, "Police reported 12 fatalities.");
    const next = report("b", "Holiday parade disrupted by Riverside bridge collapse", "Publisher B", 2, "Officials reported 15 fatalities.");
    const unrelated = report("c", "Oakwood bridge collapse disrupts morning traffic", "Publisher C", 3, "");
    const old = report("d", first.original_title, "Publisher D", -90, "");
    const index = new EventIndex();
    const bern = report("bern", "Hotel fire injures several guests in Bern", "Publisher E", 0, "");
    const zurich = report("zurich", "Hotel fire injures several guests in Zurich", "Publisher F", 1, "");
    index.update([first, old, unrelated, bern, zurich]);
    assert.equal(index.badge("bern"), undefined, "templated headlines can describe different places");
    assert.equal(index.badge("a"), undefined);
    index.update([first, old, unrelated, next]);
    const event = index.coverage("b");
    assert.equal(event.id, "a");
    assert.equal(event.publishers, 2);
    assert.deepEqual(event.timeline.map(({ id }) => id), ["a", "b"]);
    assert.deepEqual(event.highlights.map(({ id }) => id), ["b", "a"]);
    assert.deepEqual(event.disagreements[0].claims.map(({ value }) => value).sort(), [12, 15]);
    assert.deepEqual(groupNewsByEvent([next, first, unrelated], ({ id }) => index.badge(id)).map(({ id }) => id), ["b", "c"]);
    const correction = { ...next, executive_summary: "Officials reported at least 12 fatalities." };
    index.update([first, correction, unrelated]);
    assert.deepEqual(index.coverage("b").disagreements, []);
    index.update([correction]);
    assert.equal(index.badge("b"), undefined);
    assert.equal(index.badge("a"), undefined);
  });

  await test("similar RSS reports retain publisher attribution and tracked URLs resolve to one record", async () => {
    const headline = "Riverside bridge collapse during holiday parade";
    const tracked = item("riverside?utm_source=rss", headline);
    const canonical = item("riverside", headline, "<category>Local news</category>");
    const secondPublisher = item("related", "Holiday parade disrupted by Riverside bridge collapse");
    const undated = "<item><title>False fresh item</title><link>https://example.org/undated</link></item>";
    globalThis.fetch = async (url) => new Response(String(url).includes("feeds.bbci.co.uk/news/world/rss")
      ? xml(tracked + canonical + undated) : String(url).includes("theguardian.com/world/rss") ? xml(secondPublisher) : emptyFeed);
    const snapshot = await feed.getStories(true);
    const reports = snapshot.stories.filter(({ source_url }) => /riverside|related/.test(source_url));
    assert.equal(reports.length, 2);
    assert.ok(!snapshot.stories.some(({ source_url }) => source_url.endsWith("/undated")));
    const derbyUrl = new Request("http://localhost/api/news?q=riverside%20bridge&limit=1");
    const response = await news.GET(derbyUrl);
    const data = await response.json();
    assert.equal(data.total, 1);
    assert.equal(data.nextCursor, null);
    assert.equal(data.items[0].event.publishers, 2);
    assert.equal(data.items[0].event.reports, 2);
    assert.equal(data.items[0].evidence, undefined);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(matchesCountry({ original_title: "Software modification announced", executive_summary: "" }, "india"), false);
    assert.equal(matchesCountry({ original_title: "Modi announces a new policy", executive_summary: "" }, "india"), true);
    const { byId } = snapshot;
    const aliases = [...byId].filter(([, story]) => story.source_url.includes("riverside"));
    assert.equal(aliases.length, 2);
    assert.equal((await feed.getStory(aliases[0][0])).id, (await feed.getStory(aliases[1][0])).id);
  });

  await test("cron requires configured credentials and JSON/body limits return explicit client errors", async () => {
    const previous = process.env.CRON_SECRET;
    try {
      delete process.env.CRON_SECRET;
      assert.equal((await ingest.GET(new Request("http://localhost/api/ingest", { headers: { authorization: "Bearer intelmatrix-local-secret" } }))).status, 503);
      process.env.CRON_SECRET = "test-only";
      assert.equal((await ingest.POST(post("/api/ingest", { secret: "test-only" }))).status, 401);
      const authorized = await ingest.GET(new Request("http://localhost/api/ingest", { headers: { authorization: "Bearer test-only" } }));
      assert.equal(authorized.status, 200);
      assert.ok((await authorized.json()).count > 0);
    } finally {
      if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous;
    }
    assert.equal((await translate.POST(post("/api/translate", null))).status, 400);
    const response = await assistant.POST(new Request("http://localhost/api/assistant", { method: "POST", body: JSON.stringify({ question: "a".repeat(129 * 1024) }) }));
    assert.equal(response.status, 413);
    await assert.rejects(readResponseBytes(new Response(new Uint8Array(20)), 10), /Response too large/);
  });
} finally {
  globalThis.fetch = oldFetch;
  delete globalThis.__intelmatrixAI;
  if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey;
}
