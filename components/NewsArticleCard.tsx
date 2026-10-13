import type { NewsItem } from "@/lib/store/news-store";
import type { SupportedLanguage } from "@/lib/store/language-store";

interface NewsArticleCardProps {
  story: NewsItem;
  layout?: "compact" | "feature";
  language?: SupportedLanguage;
}

function formatPublishedAt(value: string | undefined, language: SupportedLanguage): string {
  if (!value) return "Yeni";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Yeni";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  const locale = language === "tr" ? "tr-TR" : language === "de" ? "de-DE" : language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : "en-US";
  if (minutes < 1) return language === "tr" ? "şimdi" : language === "de" ? "gerade eben" : language === "fr" ? "à l'instant" : language === "es" ? "ahora" : "just now";
  if (minutes < 60) return new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 7) return new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(-days, "day");
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(date);
}

function getImportance(score: number): { label: string; className: string } {
  if (score >= 9) return { label: "Kritik", className: "border-red-200 bg-red-50 text-red-800" };
  if (score >= 7) return { label: "Yüksek", className: "border-orange-200 bg-orange-50 text-orange-800" };
  if (score >= 5) return { label: "İzlenmeli", className: "border-amber-200 bg-amber-50 text-amber-800" };
  return { label: "Düşük", className: "border-slate-200 bg-slate-50 text-slate-600" };
}

export function NewsArticleCard({ story, layout = "compact", language = "tr" }: NewsArticleCardProps) {
  const feature = layout === "feature";
  const importance = getImportance(story.impact_score);

  return (
    <article className={`group min-w-0 overflow-hidden border-b border-slate-200 bg-white ${feature ? "" : "pb-5"}`}>
      <a
        href={story.source_url || "#"}
        target="_blank"
        rel="noreferrer"
        aria-label={`${story.translated_title} - ${story.source || "haber kaynağı"}`}
        className="block"
      >
        <div className={`relative overflow-hidden bg-slate-100 ${feature ? "aspect-[16/9]" : "aspect-[16/10]"}`}>
          {story.image_url ? (
            <img
              src={story.image_url}
              alt=""
              loading={feature ? "eager" : "lazy"}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-full items-end bg-[linear-gradient(135deg,#dce8ef,#f1f4f6_55%,#d7e0e6)] p-4">
              <span className="font-serif text-2xl font-bold text-slate-400">INTELMATRIX</span>
            </div>
          )}
          {story.is_breaking && (
            <span className="absolute left-3 top-3 bg-red-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              Son dakika
            </span>
          )}
        </div>
        <div className={feature ? "pt-4" : "pt-3"}>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-red-700">
            <span>{story.category}</span>
            <span className={`border px-2 py-1 text-[9px] tracking-[0.12em] ${importance.className}`}>{importance.label} · {story.impact_score}/10</span>
          </div>
          <h2 className={`font-serif font-bold leading-[1.12] text-slate-950 group-hover:text-sky-800 ${feature ? "text-3xl md:text-[38px]" : "text-[21px]"}`}>
            {story.translated_title}
          </h2>
        </div>
      </a>
      <p className={`mt-2 text-slate-600 ${feature ? "text-base leading-7" : "line-clamp-3 text-sm leading-6"}`}>
        {story.executive_summary}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-700">{story.source || "Haber kaynağı"}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={story.published_at}>{formatPublishedAt(story.published_at, language)}</time>
        <span aria-hidden="true">·</span>
        <a className="font-semibold text-sky-800 hover:underline" href={story.source_url || "#"} target="_blank" rel="noreferrer">
          Kaynağa git ↗
        </a>
      </div>
    </article>
  );
}