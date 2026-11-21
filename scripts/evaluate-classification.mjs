import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";

const benchmark = JSON.parse(readFileSync(new URL("./fixtures/classification.json", import.meta.url)));
const holdout = JSON.parse(readFileSync(new URL("./fixtures/classification-holdout.json", import.meta.url)));
const baselineCommit = "4bd85b4";
const baseline = execFileSync("git", ["show", `${baselineCommit}:lib/news/categories.ts`], { encoding: "utf8" });
const current = readFileSync(new URL("../lib/news/categories.ts", import.meta.url), "utf8");

function load(source) {
  const compiled = { exports: {} };
  new Function("module", transformSync(source, { loader: "ts", format: "cjs" }).code)(compiled);
  return compiled.exports.classifyNews;
}

function round(number) {
  return Math.round(number * 1000) / 1000;
}

function evaluate(classify, fixtures) {
  const rows = fixtures.map((row) => {
    const { category, categories } = classify(row.title, row.summary, row.feed, row.topics);
    return { ...row, category, categories };
  });
  const labels = [...new Set(rows.map((row) => row.expected))].sort();
  const byCategory = labels.map((label) => {
    const tp = rows.filter(({ expected, category }) => expected === label && category === label).length;
    const fp = rows.filter(({ expected, category }) => expected !== label && category === label).length;
    const fn = rows.filter(({ expected, category }) => expected === label && category !== label).length;
    const precision = tp / (tp + fp || 1);
    const recall = tp / (tp + fn || 1);
    return { label, support: tp + fn, precision: round(precision), recall: round(recall), f1: round(2 * precision * recall / (precision + recall || 1)) };
  });
  const confusion = {};
  for (const { expected, category } of rows) {
    const key = `${expected} → ${category}`;
    if (expected !== category) confusion[key] = (confusion[key] ?? 0) + 1;
  }
  const multilabel = rows.filter((row) => row.secondary || row.exclude);
  const expectedAI = rows.filter((row) => row.expected === "AI" || row.secondary?.includes("AI"));
  const detectedAI = rows.filter((row) => row.categories.includes("AI"));
  const aiTrue = detectedAI.filter((row) => expectedAI.includes(row)).length;
  return {
    count: rows.length,
    accuracy: round(rows.filter(({ category, expected }) => category === expected).length / rows.length),
    macro: Object.fromEntries(["precision", "recall", "f1"].map((metric) => [metric, round(byCategory.reduce((sum, row) => sum + row[metric], 0) / byCategory.length)])),
    aiMultiLabel: { tp: aiTrue, fp: detectedAI.length - aiTrue, fn: expectedAI.length - aiTrue },
    multilabelPassed: multilabel.filter((row) => row.secondary?.every((category) => row.categories.includes(category)) !== false
      && row.exclude?.every((category) => !row.categories.includes(category)) !== false).length,
    multilabelTotal: multilabel.length,
    byCategory,
    confusion,
    errors: rows.filter((row) => row.category !== row.expected || row.secondary?.some((label) => !row.categories.includes(label)) || row.exclude?.some((label) => row.categories.includes(label)))
      .map(({ title, expected, category, categories, secondary, exclude }) => ({ title, expected, category, categories, secondary, exclude })),
  };
}

const baselineClassifier = load(baseline);
const currentClassifier = load(current);
const before = evaluate(baselineClassifier, benchmark);
const after = evaluate(currentClassifier, benchmark);
const heldOut = { before: evaluate(baselineClassifier, holdout), after: evaluate(currentClassifier, holdout) };
console.log(JSON.stringify({ baselineCommit, before, after, heldOut }, null, 2));
if (process.argv.includes("--check") && (after.macro.f1 < 0.90 || after.aiMultiLabel.fp > 1 || after.aiMultiLabel.fn > 1
  || after.multilabelPassed < 16 || heldOut.after.macro.f1 < heldOut.before.macro.f1)) process.exitCode = 1;
