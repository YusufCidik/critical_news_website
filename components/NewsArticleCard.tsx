import { memo } from "react";
import { ImportanceBadge } from "@/components/ImportanceBadge";
import { intelligenceLabels } from "@/lib/i18n/intelligence-labels";
import type { NewsCategory } from "@/lib/news/categories";
import { ui } from "@/lib/i18n/interface-labels";
import Link from "next/link";
import { NewsImage } from "@/components/NewsImage";
import type { NewsItem } from "@/lib/store/news-store";
import type { SupportedLanguage } from "@/lib/store/language-store";
import { getNewsLabel } from "@/lib/i18n/news-labels";

interface NewsArticleCardProps {
  story: NewsItem;
  layout?: "compact" | "feature";
  language?: SupportedLanguage;
  category?: string;
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

export const NewsArticleCard = memo(function NewsArticleCard({ story, layout = "compact", language = "tr", category = "all" }: NewsArticleCardProps) {
  const feature = layout === "feature";
  const t = intelligenceLabels(language);
  const scope = category === "all" ? "global" : "category";
  const score = scope === "global" ? story.impact?.global : story.impact?.byCategory?.[category as NewsCategory];

  return (
    <article data-news-id={story.id} className={`news-feed-card group min-w-0 overflow-hidden border-b border-slate-200 bg-white ${feature ? "" : "pb-5"}`}>
      <Link prefetch={false}
        href={`/news/${story.id}`}
        aria-label={`${story.translated_title} - ${story.source || "haber kaynağı"}`}
        className="block"
      >
        <div className={`relative overflow-hidden bg-slate-100 ${feature ? "aspect-[16/9]" : "aspect-[16/10]"}`}>
          <NewsImage id={story.id} src={story.image_url} eager={feature} />
          {story.is_breaking && (
            <span className="absolute left-3 top-3 bg-red-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              {getNewsLabel(language, "breaking")}
            </span>
          )}
        </div>
        <div className={feature ? "pt-4" : "pt-3"}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-red-700">
            <span>{getNewsLabel(language, story.category === "Dünya" ? "world" : story.category)}</span>
            <ImportanceBadge score={score} language={language} scope={scope} />
          </div>
          <h2 className={`font-serif font-bold leading-[1.12] text-slate-950 group-hover:text-sky-800 ${feature ? "text-3xl md:text-[38px]" : "text-[21px]"}`}>
            {story.translated_title}
          </h2>
        </div>
      </Link>
      <p className={`mt-2 text-slate-600 ${feature ? "text-base leading-7" : "line-clamp-3 text-sm leading-6"}`}>
        {story.executive_summary}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-700">{story.source || getNewsLabel(language, "source")}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={story.published_at}>{formatPublishedAt(story.published_at, language)}</time>
        <span aria-hidden="true">·</span>
        <span>{Math.max(1, Math.ceil(story.executive_summary.split(/\s+/).length / 200))} {ui(language, "minutes")}</span>
        {story.event && <span className="font-semibold">{story.event.publishers} {t.publisherCount.toLocaleLowerCase(language)} · {story.event.reports} {t.reportCount.toLocaleLowerCase(language)}</span>}
        <Link prefetch={false} className="font-semibold text-sky-800 hover:underline" href={`/news/${story.id}`}>
          {ui(language, "read")}
        </Link>
      </div>
    </article>
  );
}, (previous, next) => previous.language === next.language && previous.layout === next.layout && previous.category === next.category && (previous.story === next.story || (["id", "translated_title", "executive_summary", "image_url", "impact", "event", "is_breaking", "category", "source", "published_at"] as const).every((key) => previous.story[key] === next.story[key])));
