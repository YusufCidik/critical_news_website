import { intelligenceLabels } from "@/lib/i18n/intelligence-labels";
import { getNewsLabel } from "@/lib/i18n/news-labels";
import type { EventCoverage } from "@/lib/news/events";
import type { NewsItem } from "@/lib/store/news-store";
import type { SupportedLanguage } from "@/lib/store/language-store";

export function ArticleIntelligence({ item, event, language }: { item: NewsItem; event?: EventCoverage; language: SupportedLanguage }) {
  const t = intelligenceLabels(language);
  const impact = item.impact;
  const date = new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" });
  return (
    <>
      {impact && <details className="rounded-xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer font-semibold">{t.evidence}</summary>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="font-semibold">{t.global}</dt><dd>{impact.global == null ? t.insufficient : `${impact.global}/10`}{impact.status === "provisional" && <span className="ml-2 font-semibold text-amber-800">{t.provisional}</span>}</dd></div>
          <div><dt className="font-semibold">{t.category} · {getNewsLabel(language, item.category)}</dt><dd>{impact.category == null ? t.insufficient : `${impact.category}/10`}</dd></div>
        </dl>
        <p className="mt-3 text-sm text-slate-600">{t[impact.confidence]} · {t.publisherText}</p>
        {impact.milestone && <blockquote className="mt-4 break-words border-l-2 border-slate-300 pl-3 text-sm">{impact.milestone}</blockquote>}
        <ul className="mt-4 space-y-3">
          {impact.reasons.map((reason) => <li key={reason.dimension} className="break-words border-t border-slate-200 pt-3 text-sm">
            <strong>{t[reason.dimension]}{reason.provisional ? ` · ${t.provisional}` : ""}</strong>
            <p className="mt-1 text-slate-700">{reason.evidence}</p>
          </li>)}
        </ul>
      </details>}
      {event && <section aria-labelledby="event-coverage">
        <h2 id="event-coverage" className="font-serif text-2xl font-bold sm:text-3xl">{t.timeline}</h2>
        <p className="mt-2 text-sm text-slate-600">{event.reports} {t.reportCount.toLocaleLowerCase(language)} · {event.publishers} {t.publisherCount.toLocaleLowerCase(language)}. {t.timelineNote}</p>
        <h3 className="mt-5 text-sm font-semibold">{t.eventSummary}</h3>
        <ul className="mt-2 space-y-3">
          {event.highlights.map((report) => <li key={report.id} className="break-words text-sm leading-relaxed">
            <a href={report.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-800 underline">{report.publisher}</a> · {report.excerpt || report.title}
          </li>)}
        </ul>
        <details className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer font-semibold">{t.fullTimeline}</summary>
        <ol className="mt-5 space-y-4 border-l border-slate-300 pl-4">
          {event.timeline.map((report) => <li key={report.id} className="min-w-0">
            <p className="text-xs font-semibold text-slate-600">{report.publisher} · <time dateTime={report.publishedAt}>{date.format(new Date(report.publishedAt))}</time></p>
            <a href={report.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block break-words font-semibold text-sky-800 underline">{report.title}</a>
            {report.excerpt && <p className="mt-1 break-words text-sm leading-relaxed text-slate-700">{report.excerpt}</p>}
          </li>)}
        </ol>
        </details>
        {event.disagreements.length > 0 && <div className="mt-5 border-l-2 border-amber-500 pl-3 text-sm">
          <h3 className="font-semibold">{t.disagreement}</h3>
          <p className="mt-1">{t.disagreementNote}</p>
          <ul className="mt-2 space-y-2">{event.disagreements.flatMap(({ claims }) => claims.map((claim) => {
            const source = event.timeline.find((report) => report.id === claim.reportId)!;
            return <li key={claim.reportId}><a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-800 underline">{source.publisher}</a> · {claim.evidence}</li>;
          }))}</ul>
        </div>}
      </section>}
    </>
  );
}
