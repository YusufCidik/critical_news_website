import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { build } from "esbuild";

const baseline = "03395a5";
const fixture = JSON.parse(readFileSync(new URL("./fixtures/v31-news.json", import.meta.url)));
const require = createRequire(import.meta.url);
const fetchLive = process.argv.includes("--live");
const snapshotPath = process.argv.find((arg) => arg.startsWith("--snapshot="))?.slice("--snapshot=".length);
const rounded = (value) => Math.round(value * 1000) / 1000;
const percentage = (count, total) => rounded(count / (total || 1));

async function load(useBaseline) {
  const bundled = await build({
    stdin: {
      contents: 'export { classifyNews } from "./lib/news/categories"; export { assessImpact } from "./lib/news/impact"; export { EventIndex } from "./lib/news/events";' + (!useBaseline && fetchLive ? ' export { getStories } from "./lib/news/feed";' : ""),
      resolveDir: process.cwd(), loader: "ts",
    },
    bundle: true, write: false, format: "cjs", platform: "node", packages: "external",
    plugins: useBaseline ? [{
      name: "pinned-v3",
      setup(builder) {
        builder.onLoad({ filter: /\/lib\/news\/(categories|impact|events)\.ts$/ }, ({ path }) => ({
          contents: execFileSync("git", ["show", `${baseline}:lib/news/${path.split("/").at(-1)}`], { encoding: "utf8" }),
          loader: "ts",
          resolveDir: `${process.cwd()}/lib/news`,
        }));
      },
    }] : [],
  });
  const target = { exports: {} };
  new Function("module", "require", bundled.outputFiles[0].text)(target, require);
  return target.exports;
}

function classification(classify, split) {
  const rows = fixture.classification.filter((row) => row.split === split).map((row) => {
    const report = fixture.reports[row.id];
    return { ...row, ...classify(report.title, report.summary, report.feed) };
  });
  const labels = [...new Set(rows.map((row) => row.expected))].sort();
  const perCategory = labels.map((category) => {
    const count = rows.filter((row) => row.expected === category).length;
    const predicted = rows.filter((row) => row.category === category).length;
    const correct = rows.filter((row) => row.category === category && row.expected === category).length;
    return { category, count, precision: percentage(correct, predicted), recall: percentage(correct, count), f1: percentage(2 * correct, count + predicted) };
  });
  const errors = rows.filter((row) => row.expected !== row.category).map(({ id, expected, category }) => ({ id, title: fixture.reports[id].title, expected, category }));
  const confusion = {};
  for (const { expected, category } of errors) {
    const key = `${expected} → ${category}`;
    confusion[key] = (confusion[key] ?? 0) + 1;
  }
  const multilabel = rows.filter((row) => row.include || row.exclude);
  return {
    total: rows.length, accuracy: percentage(rows.length - errors.length, rows.length),
    macroF1: percentage(perCategory.reduce((sum, row) => sum + row.f1, 0), perCategory.length),
    perCategory, confusion, errors,
    multilabel: { count: multilabel.length, passed: multilabel.filter((row) => (row.include ?? []).every((key) => row.categories.includes(key)) && (row.exclude ?? []).every((key) => !row.categories.includes(key))).length },
  };
}

function impact(assess, scope) {
  const rows = fixture.impact.map((label) => {
    const report = fixture.reports[label.id];
    const category = fixture.classification.find((row) => row.id === label.id)?.expected ?? report.feed;
    const value = assess(report.title, report.summary, category);
    const status = value.status ?? (value.global == null ? "insufficient" : value.reasons.every((reason) => reason.provisional) ? "provisional" : "supported");
    return { ...label, status, value };
  });
  const counts = { supported: 0, provisional: 0, insufficient: 0, withinBand: 0, over: 0, under: 0, scoredWithoutSupport: 0, missed: 0 };
  const confidence = {};
  let exactEvidence = 0;
  let totalEvidence = 0;
  for (const row of rows) {
    counts[row.status]++;
    const score = row.value.global;
    const band = row.range;
    if (score == null && band) counts.missed++;
    if (score != null && !band) counts.scoredWithoutSupport++;
    if (score != null && band) {
      if (score < band[0]) counts.under++;
      else if (score > band[1]) counts.over++;
      else counts.withinBand++;
    }
    if (score != null) {
      const key = `${row.status}/${row.value.confidence}`;
      confidence[key] ??= { scored: 0, aligned: 0 };
      confidence[key].scored++;
      if (row.status === row.expectedStatus && band && score >= band[0] && score <= band[1]) confidence[key].aligned++;
    }
    const original = fixture.reports[row.id];
    for (const reason of row.value.reasons) {
      totalEvidence++;
      if (original.title.includes(reason.evidence) || original.summary.includes(reason.evidence)) exactEvidence++;
    }
  }
  return {
    scope, total: rows.length, coverage: percentage(counts.supported + counts.provisional, rows.length),
    statusAgreement: percentage(rows.filter((r) => r.status === r.expectedStatus).length, rows.length),
    ...counts, confidence, evidence: { exact: exactEvidence, total: totalEvidence },
  };
}

function events(Index) {
  const index = new Index();
  index.update(Object.values(fixture.reports).map(({ id, title, summary, publisher, url, date }) => ({ id, original_title: title, executive_summary: summary, publisher, source_url: url, published_at: date })));
  const counts = { tp: 0, fp: 0, fn: 0, tn: 0 };
  const errors = [];
  for (const pair of fixture.events) {
    const a = index.badge(pair.left);
    const b = index.badge(pair.right);
    const match = Boolean(a && b && a.id === b.id);
    counts[match ? pair.same ? "tp" : "fp" : pair.same ? "fn" : "tn"]++;
    if (match !== pair.same) errors.push({ ...pair, titles: [fixture.reports[pair.left].title, fixture.reports[pair.right].title] });
  }
  return { ...counts, precision: percentage(counts.tp, counts.tp + counts.fp), recall: percentage(counts.tp, counts.tp + counts.fn), errors };
}

function liveSample(engine, snapshot, includeLead = false) {
  const distribution = { "1–2": 0, "3–4": 0, "5–6": 0, "7–8": 0, "9–10": 0, unknown: 0 };
  const levels = { supported: 0, provisional: 0, insufficient: 0 };
  for (const report of snapshot.stories) {
    // Hold classification constant to isolate the scoring change.
    const excerpt = includeLead ? [...new Set([report.summary.slice(0, 650), report.evidence.text.slice(0, 1500)])].join("\n") : report.evidence.text;
    const score = (includeLead ? report.impact : null) ?? engine.assessImpact(report.title, excerpt.slice(0, 2000), report.category);
    const level = score.status ?? (score.global == null ? "insufficient" : score.reasons.every(({ provisional }) => provisional) ? "provisional" : "supported");
    levels[level]++;
    const key = score.global == null ? "unknown" : ["1–2", "3–4", "5–6", "7–8", "9–10"][Math.ceil(score.global / 2) - 1];
    distribution[key]++;
  }
  return { total: snapshot.stories.length, coverage: percentage(levels.supported + levels.provisional, snapshot.stories.length), levels, distribution };
}

const [old, current] = await Promise.all([load(true), load(false)]);
const summarize = (engine) => ({
  classification: Object.fromEntries(["development", "review", "holdout"].map((split) => [split, classification(engine.classifyNews, split)])),
  impact: impact(engine.assessImpact, "editorial"),
  events: events(engine.EventIndex),
});
const before = summarize(old);
const after = summarize(current);
let snapshot = snapshotPath && JSON.parse(readFileSync(snapshotPath, "utf8"));
if (fetchLive) {
  const { updatedAt, sourceHealth, stories } = await current.getStories();
  snapshot = { date: updatedAt, health: sourceHealth, stories: stories.map((story) => ({
    title: story.original_title, summary: story.executive_summary, evidence: story.evidence, category: story.category, impact: story.impact,
  })) };
  if (!stories.length) process.exitCode = 1;
}
console.log(JSON.stringify({ baseline, before, after, live: snapshot ? {
  capturedAt: snapshot.date, activeFeeds: snapshot.health.filter((f) => f.status === "active").length,
  before: liveSample(old, snapshot), after: liveSample(current, snapshot, true),
} : undefined }, null, 2));
if (process.argv.includes("--check") && (after.classification.holdout.macroF1 <= before.classification.holdout.macroF1
  || after.impact.withinBand <= before.impact.withinBand || after.events.tp <= before.events.tp || after.events.fp > before.events.fp)) process.exitCode = 1;
