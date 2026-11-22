"use client";
import { ImportanceBadge } from "@/components/ImportanceBadge";
import { ui } from "@/lib/i18n/interface-labels";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { NewsItem } from "@/lib/store/news-store";
import type { ArticleBriefing, BriefingMode } from "@/lib/news/briefing";
import { getNewsItemById, saveNewsItems } from "@/lib/offline/idb-schema";
import { useLocalizedNews } from "@/hooks/useLocalizedNews";
import { useLanguageStore } from "@/lib/store/language-store";
import { useBookmarkStore } from "@/lib/store/bookmark-store";
import { getNewsLabel } from "@/lib/i18n/news-labels";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NewsImage } from "@/components/NewsImage";
import { ArticleIntelligence } from "@/components/ArticleIntelligence";
import type { EventCoverage } from "@/lib/news/events";
import { intelligenceLabels } from "@/lib/i18n/intelligence-labels";
import { NewsAssistant } from "@/components/NewsAssistant";

const LABELS = {
  tr: { back: "Gündeme dön", summary: "Kaynak özeti", loading: "AI özeti hazırlanıyor…", unavailable: "AI analizi şu anda kullanılamıyor. Kaynak özetini okuyabilir ve tam habere aşağıdan ulaşabilirsin.", retry: "Tekrar dene", source: "Kaynağa git", save: "Kaydet", saved: "Kaydedildi", missing: "Bu haber güncel akışta veya cihazının önbelleğinde bulunamadı.", minutes: "dk okuma", original: "Özgün başlık", translation: "Çeviri alınamadı; özgün metin gösteriliyor." },
  en: { back: "Back to agenda", summary: "Publisher excerpt", loading: "Preparing AI briefing…", unavailable: "AI analysis is currently unavailable. Read the publisher excerpt or open the full source below.", retry: "Retry", source: "Go to source", save: "Save", saved: "Saved", missing: "This story is no longer in the current feed or your device cache.", minutes: "min read", original: "Original headline", translation: "Translation unavailable; showing original text." },
  de: { back: "Zur Übersicht", summary: "Quellenauszug", loading: "KI-Briefing wird erstellt…", unavailable: "KI-Analyse derzeit nicht verfügbar. Lesen Sie den Quellenauszug oder öffnen Sie die Quelle.", retry: "Erneut versuchen", source: "Zur Quelle", save: "Speichern", saved: "Gespeichert", missing: "Diese Nachricht ist weder im aktuellen Feed noch im Gerätespeicher verfügbar.", minutes: "Min. Lesezeit", original: "Originaltitel", translation: "Übersetzung nicht verfügbar; Originaltext wird angezeigt." },
  fr: { back: "Retour aux actualités", summary: "Extrait de la source", loading: "Préparation de la synthèse…", unavailable: "L'analyse IA est indisponible. Consultez l'extrait ou la source ci-dessous.", retry: "Réessayer", source: "Voir la source", save: "Enregistrer", saved: "Enregistré", missing: "Cet article est absent du flux et du cache de votre appareil.", minutes: "min de lecture", original: "Titre original", translation: "Traduction indisponible ; texte original affiché." },
  es: { back: "Volver a las noticias", summary: "Extracto de la fuente", loading: "Preparando el resumen…", unavailable: "El análisis de IA no está disponible. Lee el extracto o abre la fuente.", retry: "Reintentar", source: "Ir a la fuente", save: "Guardar", saved: "Guardado", missing: "Esta noticia no está en el flujo actual ni en la caché del dispositivo.", minutes: "min de lectura", original: "Título original", translation: "Traducción no disponible; se muestra el original." },
};

export function NewsDetail({ id, initialStory, event }: { id: string; initialStory: NewsItem | null; event?: EventCoverage }) {
  const { language } = useLanguageStore();
  const t = LABELS[language];
  const intel = intelligenceLabels(language);
  const [story, setStory] = useState(initialStory);
  const [checking, setChecking] = useState(!initialStory);
  const [analysis, setAnalysis] = useState<{ briefing: ArticleBriefing; model: string } | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "insufficient" | "unavailable">("idle");
  const [mode, setMode] = useState<BriefingMode>("concise");
  const request = useRef<AbortController | null>(null);
  const saved = useBookmarkStore((store) => store.isBookmarked(story?.id ?? id));
  const toggleBookmark = useBookmarkStore((store) => store.toggleBookmark);
  const hydrateBookmarks = useBookmarkStore((store) => store.hydrateBookmarks);
  useEffect(() => { hydrateBookmarks(); }, [hydrateBookmarks]);
  const sourceItems = useMemo(() => story ? [story] : [], [story]);
  const localized = useLocalizedNews(sourceItems, language);
  const item = localized.items[0];
  useEffect(() => {
    if (initialStory) {
      const timestamp = new Date().toISOString();
      void saveNewsItems([{ ...initialStory, created_at: initialStory.created_at || timestamp, updated_at: initialStory.updated_at || timestamp }]).catch(() => {});
      return;
    }
    let active = true;
    getNewsItemById(id).catch(() => undefined).then((cached) => { if (active) setStory(cached ?? useBookmarkStore.getState().bookmarks.find((item) => item.id === id) ?? null); }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [id, initialStory]);
  useEffect(() => () => request.current?.abort(), [request]);
  async function prepareBriefing(nextMode: BriefingMode) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setMode(nextMode);
    setState("loading");
    try {
      const response = await fetch(`/api/news/${id}/briefing`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, mode: nextMode }), signal: controller.signal,
      });
      if (!response.ok) throw new Error("Briefing unavailable");
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!data.available) { setState("insufficient"); return; }
      setAnalysis({ briefing: data.briefing, model: data.model });
      setState("ready");
    } catch {
      if (!controller.signal.aborted) setState("unavailable");
    }
  }
  const minutes = Math.max(1, Math.ceil((item?.executive_summary ?? "").split(/\s+/).length / 200));
  if (!item) return <main className="mx-auto max-w-3xl p-6"><Link href="/" className="text-sky-800 underline">{t.back}</Link><p role="status" className="mt-8">{checking ? t.loading : t.missing}</p></main>;
  const sourceURL = item.source_url && /^https?:\/\//i.test(item.source_url) ? item.source_url : null;
  const published = item.published_at && !Number.isNaN(Date.parse(item.published_at)) ? new Date(item.published_at) : null;
  return (
    <main className="detail-page min-h-screen bg-slate-50 pb-12 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/" className="brand-wordmark font-serif text-2xl font-black tracking-[0.08em] sm:text-3xl">INTELMATRIX</Link>
          <div className="flex items-center gap-3"><LanguageSelector /><ThemeToggle /></div>
        </div>
      </header>
      <article className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex items-center justify-between gap-4 py-6 text-xs">
          <Link href="/" className="inline-flex min-h-10 items-center gap-2 font-semibold text-slate-600 transition hover:text-sky-800">← {t.back}</Link>
          <span className="font-medium text-slate-500">{minutes} {t.minutes}</span>
        </div>

        <header className="max-w-4xl pb-8 sm:pb-10">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-sky-800">{getNewsLabel(language, item.category === "Dünya" ? "world" : item.category)}</span>
            <span className="h-4 border-l border-slate-300" aria-hidden="true" />
            <ImportanceBadge score={item.impact?.global} language={language} provisional={item.impact?.status === "provisional"} />
          </div>
          <h1 className="text-balance font-serif text-[32px] font-bold leading-[1.13] tracking-[-0.025em] sm:text-[44px] lg:text-[54px]">{item.translated_title}</h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-6 text-slate-500">
            <span className="font-bold text-slate-800">{item.source}</span>
            {published && <time dateTime={item.published_at}>{new Intl.DateTimeFormat(language, { dateStyle: "long", timeStyle: "short" }).format(published)}</time>}
          </div>
          {item.translated_title !== item.original_title && <details className="mt-3 max-w-3xl text-xs leading-6 text-slate-500"><summary className="w-fit cursor-pointer border-b border-dotted border-slate-300">{t.original}</summary><p className="mt-2">{item.original_title}</p></details>}
          {localized.status === "loading" && <p role="status" className="mt-3 text-xs text-sky-800">{ui(language, "translating")}</p>}
          {localized.status === "error" && <p role="status" className="mt-3 text-xs text-amber-700">{t.translation} <button type="button" onClick={localized.retry} className="min-h-10 underline">{t.retry}</button></p>}
          <div className="mt-6 flex flex-wrap gap-3">
            {sourceURL && <a href={sourceURL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-3 rounded-full bg-sky-800 px-6 text-sm font-semibold text-white transition hover:bg-sky-700">{t.source}<span aria-hidden="true">↗</span></a>}
            <button type="button" onClick={() => toggleBookmark(story!)} aria-pressed={saved} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold transition hover:border-sky-700"><span aria-hidden="true">{saved ? "✓" : "+"}</span>{saved ? t.saved : t.save}</button>
          </div>
        </header>

        <figure className="mb-9 sm:mb-12">
          <div className="aspect-[16/10] max-h-[540px] overflow-hidden rounded-2xl bg-slate-100 sm:aspect-[16/8]"><NewsImage id={item.id} src={item.image_url} eager /></div>
          <figcaption className="mt-3 flex items-center gap-2 text-[11px] text-slate-500"><span className="inline-block h-1 w-1 rounded-full bg-slate-400" aria-hidden="true" />{item.source}</figcaption>
        </figure>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-14">
          <div className="min-w-0 space-y-10 sm:space-y-12">
            <section id="source-summary" className="scroll-mt-8">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.17em] text-slate-500">{t.summary}</h2>
              <p className="border-l-2 border-sky-700 pl-5 font-serif text-xl leading-9 text-slate-800 sm:text-2xl sm:leading-10">{item.executive_summary}</p>
            </section>

            <ArticleIntelligence item={item} language={language} event={event} />

            <section id="ai-briefing" className="scroll-mt-8" aria-busy={state === "loading"}>
              <h2 className="font-serif text-2xl font-bold sm:text-3xl">{intel.briefing}</h2>
              {state === "idle" ? (
                <button type="button" onClick={() => void prepareBriefing("concise")} className="mt-4 min-h-11 rounded-full border border-slate-300 px-5 text-sm font-semibold">{intel.prepare}</button>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["concise", "detailed"] as const).map((option) => <button type="button" key={option} aria-pressed={mode === option}
                    onClick={() => void prepareBriefing(option)}
                    className="min-h-11 rounded-full border border-slate-300 px-4 text-sm font-semibold aria-pressed:border-sky-800 aria-pressed:text-sky-800">{intel[option]}</button>)}
                </div>
              )}
              {state === "loading" && <p role="status" className="mt-4 text-sm text-slate-600">{t.loading}</p>}
              {state === "insufficient" && <p role="status" className="mt-4 text-sm text-slate-600">{intel.insufficient}</p>}
              {state === "unavailable" && <p role="status" className="mt-4 text-sm text-slate-600">{t.unavailable}</p>}
              {analysis && state === "ready" && <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold text-slate-600">{analysis.model === "extractive" ? intel.extracted : intel.selected} · {analysis.briefing.source} · {analysis.briefing.evidence === "rss-content" ? intel.content : intel.excerpt}</p>
                <ul className="mt-4 space-y-3">{analysis.briefing.passages.map((passage) => <li key={passage} className="break-words border-l-2 border-slate-300 pl-3 text-sm leading-7">{passage}</li>)}</ul>
                <p className="mt-4 text-xs leading-6 text-slate-600">{intel.uncertainty}</p>
              </div>}
            </section>
          </div>

          <aside className="hidden lg:block space-y-6 border-t border-slate-200 pt-6 lg:sticky lg:top-8 lg:border-t-0 lg:pt-0">
            <nav aria-label={intel.briefing} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">INTELMATRIX</p>
              <div className="flex flex-col text-sm">
                <a href="#source-summary" className="border-b border-slate-200 py-3 font-medium">{t.summary}</a>
                <a href="#ai-briefing" className="py-3 font-medium">{intel.briefing}</a>
              </div>
            </nav>
          </aside>
        </div>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 py-7 sm:mt-16">
          <Link href="/" className="font-serif text-lg font-bold tracking-widest">INTELMATRIX</Link>
          <Link href="/" className="text-xs font-semibold text-slate-500">← {t.back}</Link>
        </footer>
      </article>
      <NewsAssistant articles={localized.items} />
    </main>
  );
}
