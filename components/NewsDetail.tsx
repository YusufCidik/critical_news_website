"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { NewsItem } from "@/lib/store/news-store";
import type { ArticleBriefing } from "@/lib/news/briefing";
import { getNewsItemById, saveNewsItems } from "@/lib/offline/idb-schema";
import { useLocalizedNews } from "@/hooks/useLocalizedNews";
import { useLanguageStore } from "@/lib/store/language-store";
import { useBookmarkStore } from "@/lib/store/bookmark-store";
import { getNewsLabel } from "@/lib/i18n/news-labels";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NewsImage } from "@/components/NewsImage";
import { NewsAssistant } from "@/components/NewsAssistant";

const LABELS = {
  tr: { back: "Gündeme dön", summary: "Kaynak özeti", analysis: "AI haber brifingi", context: "Genel bilgiler", facts: "Öne çıkan bilgiler", why: "Neden önemli? · AI değerlendirmesi", unknown: "Belirsizlikler", note: "Bu brifing yayıncının RSS başlığı ve kısa açıklaması üzerinden hazırlanır. Tam haberin ve bağımsız doğrulamanın yerini tutmaz.", loading: "AI özeti hazırlanıyor…", unavailable: "AI analizi şu anda kullanılamıyor. Kaynak özetini okuyabilir ve tam habere aşağıdan ulaşabilirsin.", retry: "Tekrar dene", source: "Kaynağa git", save: "Kaydet", saved: "Kaydedildi", missing: "Bu haber güncel akışta veya cihazının önbelleğinde bulunamadı.", minutes: "dk okuma", importance: "Önem", heuristic: "Önem puanı, başlık ve açıklamadaki konu işaretlerinden hesaplanan yaklaşık bir öncelik göstergesidir.", original: "Özgün başlık", translation: "Çeviri alınamadı; özgün metin gösteriliyor." },
  en: { back: "Back to agenda", summary: "Publisher excerpt", analysis: "AI news briefing", context: "Background", facts: "Key facts", why: "Why it matters · AI interpretation", unknown: "Uncertainties", note: "This briefing uses the publisher's RSS headline and excerpt. It does not replace the full article or independent verification.", loading: "Preparing AI briefing…", unavailable: "AI analysis is currently unavailable. Read the publisher excerpt or open the full source below.", retry: "Retry", source: "Go to source", save: "Save", saved: "Saved", missing: "This story is no longer in the current feed or your device cache.", minutes: "min read", importance: "Importance", heuristic: "Importance is an approximate priority based on topic keywords in the headline and excerpt.", original: "Original headline", translation: "Translation unavailable; showing original text." },
  de: { back: "Zur Übersicht", summary: "Quellenauszug", analysis: "KI-Nachrichtenbriefing", context: "Hintergrund", facts: "Wichtige Fakten", why: "Warum wichtig? · KI-Einschätzung", unknown: "Unsicherheiten", note: "Das Briefing basiert auf RSS-Titel und Auszug. Es ersetzt weder den vollständigen Artikel noch eine unabhängige Prüfung.", loading: "KI-Briefing wird erstellt…", unavailable: "KI-Analyse derzeit nicht verfügbar. Lesen Sie den Quellenauszug oder öffnen Sie die Quelle.", retry: "Erneut versuchen", source: "Zur Quelle", save: "Speichern", saved: "Gespeichert", missing: "Diese Nachricht ist weder im aktuellen Feed noch im Gerätespeicher verfügbar.", minutes: "Min. Lesezeit", importance: "Bedeutung", heuristic: "Die Priorität wird anhand von Themenwörtern in Titel und Auszug geschätzt.", original: "Originaltitel", translation: "Übersetzung nicht verfügbar; Originaltext wird angezeigt." },
  fr: { back: "Retour aux actualités", summary: "Extrait de la source", analysis: "Synthèse IA", context: "Contexte", facts: "Faits essentiels", why: "Pourquoi c'est important · Interprétation IA", unknown: "Incertitudes", note: "Cette synthèse utilise le titre RSS et son extrait. Elle ne remplace pas l'article complet ni une vérification indépendante.", loading: "Préparation de la synthèse…", unavailable: "L'analyse IA est indisponible. Consultez l'extrait ou la source ci-dessous.", retry: "Réessayer", source: "Voir la source", save: "Enregistrer", saved: "Enregistré", missing: "Cet article est absent du flux et du cache de votre appareil.", minutes: "min de lecture", importance: "Importance", heuristic: "La priorité est estimée selon les mots-clés du titre et de l'extrait.", original: "Titre original", translation: "Traduction indisponible ; texte original affiché." },
  es: { back: "Volver a las noticias", summary: "Extracto de la fuente", analysis: "Resumen con IA", context: "Contexto", facts: "Datos clave", why: "Por qué importa · Interpretación de IA", unknown: "Incertidumbres", note: "Este resumen utiliza el título RSS y su extracto. No sustituye al artículo completo ni a una verificación independiente.", loading: "Preparando el resumen…", unavailable: "El análisis de IA no está disponible. Lee el extracto o abre la fuente.", retry: "Reintentar", source: "Ir a la fuente", save: "Guardar", saved: "Guardado", missing: "Esta noticia no está en el flujo actual ni en la caché del dispositivo.", minutes: "min de lectura", importance: "Importancia", heuristic: "La prioridad se estima mediante palabras clave del título y del extracto.", original: "Título original", translation: "Traducción no disponible; se muestra el original." },
};

export function NewsDetail({ id, initialStory }: { id: string; initialStory: NewsItem | null }) {
  const { language } = useLanguageStore();
  const t = LABELS[language];
  const [story, setStory] = useState(initialStory);
  const [checking, setChecking] = useState(!initialStory);
  const [analysis, setAnalysis] = useState<{ language: string; briefing: ArticleBriefing } | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [attempt, setAttempt] = useState(0);
  const { isBookmarked, toggleBookmark } = useBookmarkStore();
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
    getNewsItemById(id).then((cached) => { if (active && cached) setStory(cached); }).catch(() => {}).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [id, initialStory]);
  useEffect(() => {
    if (!story) return;
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) setState("loading"); });
    fetch(`/api/news/${id}/briefing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language }), signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Briefing unavailable");
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (data.available) { setAnalysis({ language, briefing: data.briefing }); setState("ready"); }
        else setState("unavailable");
      }).catch(() => { if (!controller.signal.aborted) setState("unavailable"); });
    return () => controller.abort();
  }, [id, story, language, attempt]);
  const briefing = analysis?.language === language ? analysis.briefing : null;
  const minutes = Math.max(1, Math.ceil([item?.executive_summary, briefing?.summary, briefing?.background, briefing?.why_it_matters, briefing?.uncertainty, ...(briefing?.key_points || [])].join(" ").split(/\s+/).length / 200));
  if (!item) return <main className="mx-auto max-w-3xl p-6"><Link href="/" className="text-sky-800 underline">{t.back}</Link><p role="status" className="mt-8">{checking ? t.loading : t.missing}</p></main>;
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <article className="mx-auto max-w-3xl bg-white shadow-sm">
        <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <Link href="/" className="text-sm font-semibold text-sky-800">← {t.back}</Link>
          <div className="flex items-center gap-2"><LanguageSelector /><ThemeToggle /></div>
        </nav>
        <div className="aspect-video overflow-hidden"><NewsImage id={item.id} src={item.image_url} eager /></div>
        <div className="space-y-6 p-5 sm:p-8">
          <header>
            <p className="text-xs font-bold uppercase tracking-wider text-red-700">{getNewsLabel(language, item.category === "Dünya" ? "world" : item.category)}</p>
            <h1 className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-4xl">{item.translated_title}</h1>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
              <span>{item.source}</span>
              {item.published_at && !Number.isNaN(Date.parse(item.published_at)) && <time dateTime={item.published_at}>{new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.published_at))}</time>}
              <span>{minutes} {t.minutes}</span><span title={t.heuristic}>{t.importance}: {item.impact_score}/10</span>
            </div>
            {item.translated_title !== item.original_title && <details className="mt-3 text-xs text-slate-500"><summary className="cursor-pointer">{t.original}</summary><p className="mt-2">{item.original_title}</p></details>}
          </header>
          {localized.status === "error" && <p role="status" className="text-xs text-amber-700">{t.translation} <button onClick={localized.retry} className="min-h-10 underline">{t.retry}</button></p>}
          <section><h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{t.summary}</h2><p className="text-base leading-8 text-slate-700">{item.executive_summary}</p></section>
          <section className="space-y-5 rounded-lg border border-sky-200 bg-slate-50 p-4 sm:p-6" aria-busy={state === "loading"}>
            <h2 className="font-serif text-2xl font-bold">{t.analysis}</h2>
            <p className="text-xs leading-6 text-slate-500">{t.note}</p>
            {state === "loading" && <p role="status" className="animate-pulse text-sm text-sky-800">{t.loading}</p>}
            {state === "unavailable" && <div role="status"><p className="text-sm leading-7 text-slate-600">{t.unavailable}</p><button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-3 min-h-11 border border-slate-300 px-4 text-sm">{t.retry}</button></div>}
            {briefing && state === "ready" && <>
              <p className="text-base leading-8 text-slate-800">{briefing.summary}</p>
              <section><h3 className="mb-2 font-bold">{t.facts}</h3><ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">{briefing.key_points.map((fact, index) => <li key={index}>{fact}</li>)}</ul></section>
              <section><h3 className="mb-2 font-bold">{t.context}</h3><p className="text-sm leading-7 text-slate-700">{briefing.background}</p></section>
              <section><h3 className="mb-2 font-bold">{t.why}</h3><p className="text-sm leading-7 text-slate-700">{briefing.why_it_matters}</p></section>
              <section><h3 className="mb-2 font-bold">{t.unknown}</h3><p className="text-sm leading-7 text-slate-700">{briefing.uncertainty}</p></section>
            </>}
          </section>
          <p className="text-xs leading-6 text-slate-500">{t.heuristic}</p>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <button type="button" onClick={() => toggleBookmark(story!)} aria-pressed={isBookmarked(item.id)} className="min-h-11 border border-slate-300 px-5 text-sm">{isBookmarked(item.id) ? t.saved : t.save}</button>
            {item.source_url && /^https?:\/\//i.test(item.source_url) && <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center bg-sky-800 px-5 text-sm font-bold text-white">{t.source} ↗</a>}
          </div>
        </div>
      </article>
      <NewsAssistant articles={localized.items} />
    </main>
  );
}
