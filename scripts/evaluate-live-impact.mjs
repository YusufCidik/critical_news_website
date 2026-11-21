import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import { build } from "esbuild";

const base = "4bd85b4";
const require = createRequire(import.meta.url);
async function load(version) {
  const output = await build({
    stdin: {
      contents: 'export { getStories } from "./lib/news/feed"; export { canonicalNewsURL } from "./lib/news/unique";',
      resolveDir: process.cwd(),
      loader: "ts",
    },
    bundle: true, write: false, format: "cjs", platform: "node", packages: "external",
    plugins: version === base ? [{
      name: "baseline",
      setup(builder) {
        builder.onLoad({ filter: /\/lib\/news\/(feed|categories)\.ts$/ }, ({ path }) => ({
          contents: execFileSync("git", ["show", `${base}:lib/news/${path.split("/").at(-1)}`], { encoding: "utf8" }),
          loader: "ts",
          resolveDir: `${process.cwd()}/lib/news`,
        }));
      },
    }] : [],
  });
  const compiled = { exports: {} };
  new Function("module", "require", output.outputFiles[0].text)(compiled, require);
  return compiled.exports;
}

function distribution(values) {
  const counts = { unknown: 0, "1–3": 0, "4–6": 0, "7–8": 0, "9–10": 0 };
  for (const score of values) {
    if (score == null) counts.unknown++;
    else if (score < 4) counts["1–3"]++;
    else if (score < 7) counts["4–6"]++;
    else if (score < 9) counts["7–8"]++;
    else counts["9–10"]++;
  }
  return counts;
}

// Percentile rank uses midranks for ties. Unassessed reports remain unknown.
function ranks(rows, scoreFor, groupFor) {
  const groups = new Map();
  for (const row of rows) {
    const value = scoreFor(row);
    if (value == null) continue;
    const group = groupFor(row);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ id: row.id, value });
  }
  const result = new Map();
  for (const ranked of groups.values()) {
    ranked.sort((a, b) => a.value - b.value);
    let start = 0;
    while (start < ranked.length) {
      let end = start + 1;
      while (end < ranked.length && ranked[end].value === ranked[start].value) end++;
      const decile = Math.max(1, Math.round(10 * ((start + end) / 2) / ranked.length));
      for (const { id } of ranked.slice(start, end)) result.set(id, decile);
      start = end;
    }
  }
  return result;
}

const [old, next] = await Promise.all([load(base), load("current")]);
const fetchUpstream = globalThis.fetch;
const fetched = new Map();
globalThis.fetch = async (url, options) => {
  const key = String(url);
  if (!fetched.has(key)) {
    fetched.set(key, (async () => {
      const response = await fetchUpstream(url, { headers: options.headers, signal: AbortSignal.timeout(5000) });
      if (!response.ok) return { status: response.status };
      const text = await response.text();
      return { text, status: response.status };
    })());
  }
  const { text, status } = await fetched.get(key);
  return new Response(text, { status });
};

const started = performance.now();
const [baseline, current] = await Promise.all([old.getStories(), next.getStories()]);
const baselineByURL = new Map(baseline.stories.map((story) => [next.canonicalNewsURL(story.source_url), story]));
const matched = current.stories.filter((story) => baselineByURL.has(next.canonicalNewsURL(story.source_url)));
const globalRanks = ranks(matched, (row) => row.impact.global, () => "all");
const categoryRanks = ranks(matched, (row) => row.impact.category, (row) => row.category);
const groups = new Map();
for (const row of matched) {
  if (!groups.has(row.category)) groups.set(row.category, []);
  groups.get(row.category).push(row);
}
console.log(JSON.stringify({
  date: new Date().toISOString(),
  matched: matched.length,
  oldArticles: baseline.stories.length,
  v3Articles: current.stories.length,
  activeFeeds: current.sourceHealth.filter(({ status }) => status === "active").length,
  activePublishers: new Set(current.sourceHealth.filter(({ status }) => status === "active").map(({ publisher }) => publisher)).size,
  groupedReports: current.stories.filter(({ id }) => current.events.badge(id)).length,
  groupsWithMultiplePublishers: new Set(current.stories.map(({ id }) => current.events.badge(id)).filter((event) => event?.publishers > 1).map(({ id }) => id)).size,
  distributions: {
    baseline: distribution(matched.map(({ source_url }) => baselineByURL.get(next.canonicalNewsURL(source_url)).impact_score)),
    absolute: distribution(matched.map(({ impact }) => impact.global)),
    globalPercentile: distribution(matched.map(({ id }) => globalRanks.get(id))),
    categoryNormalized: distribution(matched.map(({ id }) => categoryRanks.get(id))),
    hybrid: distribution(matched.map(({ id, impact }) => impact.global == null ? null : Math.round(0.75 * impact.global + 0.25 * globalRanks.get(id)))),
    categoryAbsolute: distribution(matched.map(({ impact }) => impact.category)),
  },
  byCategory: Object.fromEntries([...groups].map(([category, rows]) => [category, {
    count: rows.length, broad: distribution(rows.map(({ impact }) => impact.global)), category: distribution(rows.map(({ impact }) => impact.category)),
  }])),
  initialRunMs: Math.round(performance.now() - started),
}, null, 2));
if (process.argv.includes("--examples")) {
  console.error(JSON.stringify(matched.filter(({ impact, source_url }) => impact.global == null
    && baselineByURL.get(next.canonicalNewsURL(source_url)).impact_score === 9)
    .slice(0, 20).map(({ original_title, executive_summary }) => ({ original_title, executive_summary })), null, 2));
}
if (!matched.length) process.exitCode = 1;
