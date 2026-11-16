import { build } from "esbuild";
import Module from "node:module";
import path from "node:path";

const result = await build({ stdin: { contents: 'export { getStories } from "./lib/news/feed"; export { matchesNewsCategory } from "./lib/news/categories"; export { uniqueNews } from "./lib/news/unique";', resolveDir: process.cwd() }, bundle: true, write: false, platform: "node", format: "cjs", packages: "external" });
const filename = path.join(process.cwd(), "scripts", ".feed-check.cjs");
const compiled = new Module(filename);
compiled.filename = filename;
compiled.paths = Module._nodeModulePaths(path.dirname(filename));
compiled._compile(result.outputFiles[0].text, filename);
const { getStories, matchesNewsCategory, uniqueNews } = compiled.exports;
const started = Date.now();
const snapshot = await getStories();
const stories = uniqueNews(snapshot.stories);
console.log(JSON.stringify({ ms: Date.now() - started, total: stories.length, activeFeeds: snapshot.sourceHealth.filter(feed => feed.status === "active").length, publishers: new Set(snapshot.sourceHealth.filter(feed => feed.status === "active").map(feed => feed.publisher)).size, categories: Object.fromEntries(["AI", "Teknoloji", "Jeopolitik", "Ekonomi", "Bilim", "Spor", "Kültür", "Sağlık", "İklim", "Savunma", "Enerji", "Seyahat"].map(category => [category, stories.filter(story => matchesNewsCategory(story, category)).length])), aiExamples: stories.filter(story => /nvidia|jensen huang/i.test(story.original_title)).slice(0, 8).map(story => ({ title: story.original_title, categories: story.categories })), unavailable: snapshot.sourceHealth.filter(feed => feed.status !== "active") }, null, 2));
if (stories.length < 500 || stories.filter(story => matchesNewsCategory(story, "AI")).length < 20) process.exitCode = 1;
