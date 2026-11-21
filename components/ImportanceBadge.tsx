import { intelligenceLabels } from "@/lib/i18n/intelligence-labels";
import type { SupportedLanguage } from "@/lib/store/language-store";

export function ImportanceBadge({ score, language, scope = "global" }: {
  score: number | null | undefined;
  language: SupportedLanguage;
  scope?: "global" | "category";
}) {
  const t = intelligenceLabels(language);
  return (
    <span data-importance-score={score ?? undefined} className="inline-flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold normal-case tracking-normal text-slate-700">
      <span>{t[scope]}</span>
      <span className="tabular-nums">{score == null ? t.insufficient : `${score}/10`}</span>
    </span>
  );
}
