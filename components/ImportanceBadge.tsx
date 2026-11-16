import { ui } from "@/lib/i18n/interface-labels";
import { getNewsLabel } from "@/lib/i18n/news-labels";
import type { SupportedLanguage } from "@/lib/store/language-store";
export function ImportanceBadge({ score, language }: { score: number; language: SupportedLanguage }) {
  const value = Math.min(10, Math.max(1, Number(score) || 5));
  const level = value >= 9 ? "critical" : value >= 7 ? "high" : value >= 5 ? "watch" : "low";
  const colors = value >= 9 ? "border-red-200 bg-red-50 text-red-800" : value >= 7 ? "border-orange-200 bg-orange-50 text-orange-800" : value >= 5 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-600";
  return <span data-importance-score={value} aria-label={ui(language, "importance") + ": " + value + "/10"} className={"inline-flex shrink-0 items-center gap-2 rounded border px-2.5 py-1.5 text-xs font-semibold normal-case tracking-normal " + colors}>
    <span className="tabular-nums font-extrabold">{value}/10</span>
    <span>{getNewsLabel(language, level)}</span>
  </span>;
}

