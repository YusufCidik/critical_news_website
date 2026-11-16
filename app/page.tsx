"use client";

import { ui } from "@/lib/i18n/interface-labels";
import { NewsFeed } from "@/components/NewsFeed";
import { uniqueNews } from "@/lib/news/unique";
import { useLocalizedNews } from "@/hooks/useLocalizedNews";
import { useEffect, useMemo, useRef, useState } from "react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { MarketTicker } from "@/components/MarketTicker";
import { NewsAssistant } from "@/components/NewsAssistant";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNewsData } from "@/hooks/useNewsData";
import { UI_TRANSLATIONS } from "@/lib/i18n/translations";
import { getNewsLabel } from "@/lib/i18n/news-labels";
import { useLanguageStore } from "@/lib/store/language-store";

const COUNTRIES = [
  ["world", "Dünya"],
  ["turkey", "Türkiye"],
  ["us", "ABD"],
  ["uk", "Birleşik Krallık"],
  ["china", "Çin"],
  ["israel", "İsrail / Filistin"],
  ["ukraine", "Ukrayna"],
  ["russia", "Rusya"],
  ["iran", "İran"],
  ["france", "Fransa"],
  ["germany", "Almanya"],
  ["india", "Hindistan"],
  ["japan", "Japonya"],
] as const;

const CATEGORIES = [
  ["all", "Tümü"],
  ["Jeopolitik", "Jeopolitik"],
  ["AI", "Yapay zekâ"],
  ["Teknoloji", "Teknoloji"],
  ["Ekonomi", "Ekonomi"],
  ["Bilim", "Bilim"],
  ["Spor", "Spor"],
  ["Kültür", "Kültür"],
  ["Sağlık", "Sağlık"],
  ["İklim", "İklim"],
  ["Savunma", "Savunma"],
  ["Enerji", "Enerji"],
  ["Seyahat", "Seyahat"],
] as const;

export default function Home() {
  const { language } = useLanguageStore();
  const text = UI_TRANSLATIONS[language];
  const [online, setOnline] = useState(true);
  const [country, setCountry] = useState("world");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<"importance" | "latest">("importance");
  const { items: rawItems, loading, loadingMore, hasMore, total, sources, error, loadMore } = useNewsData({
    country,
    category,
    sort,
  });

  const localized = useLocalizedNews(rawItems, language);
  const items = uniqueNews(localized.items);
  const regionNames = new Intl.DisplayNames([language], { type: "region" });
  const countryLabel = (value: string) => value === "world" ? getNewsLabel(language, "world") : regionNames.of(({ turkey: "TR", us: "US", uk: "GB", china: "CN", israel: "IL", ukraine: "UA", russia: "RU", iran: "IR", france: "FR", germany: "DE", india: "IN", japan: "JP" } as Record<string, string>)[value]) || value;
  const countryName = countryLabel(country);
  const activeCategoryLabel = category === "all" ? text.allCategories : getNewsLabel(language, category);
  const locale = language === "tr" ? "tr-TR" : language === "de" ? "de-DE" : language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : "en-US";
  const visibleStories = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");
    const ordered = [...items].sort((a, b) => sort === "importance" ? b.impact_score - a.impact_score || Date.parse(b.published_at || "") - Date.parse(a.published_at || "") : Date.parse(b.published_at || "") - Date.parse(a.published_at || ""));
    if (!query) return ordered;
    return ordered.filter((story) =>
      `${story.translated_title} ${story.executive_summary} ${story.source}`.toLocaleLowerCase("tr-TR").includes(query)
    );
  }, [items, search, sort]);

  useEffect(() => {
    const updateConnection = () => setOnline(navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);


  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !hasMore || loading || loadingMore || error) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    }, { rootMargin: "600px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore, error]);

  return (
    <main id="top" className="min-h-screen bg-[#f6f6f4] text-slate-950">
      <div className="mx-auto max-w-[1440px] bg-white shadow-[0_0_45px_rgba(15,23,42,0.045)]">
        <div className="border-b border-slate-200 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-slate-500 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <span>{new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}</span>
            <span className="hidden sm:inline">{text.subHeader}</span>
            <OfflineIndicator online={online} />
          </div>
        </div>

        <header className="border-b border-slate-300 px-4 pt-4 md:px-8">
          <a href="#top" className="mx-auto block w-fit text-center" aria-label="IntelMatrix ana sayfa">
            <span className="font-serif text-[38px] font-black leading-none tracking-[0.035em] brand-wordmark text-[#242424] md:text-[52px]">INTELMATRIX</span>
            <span className="mt-2 block text-[9px] font-semibold uppercase tracking-[0.34em] text-slate-500">{text.brandTagline}</span>
          </a>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 py-3 md:flex-row md:items-center md:justify-between">
            <nav aria-label="Haber kategorileri" className="flex gap-1 overflow-x-auto whitespace-nowrap">
              {CATEGORIES.map(([value]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  aria-pressed={category === value}
                  className={`border-b-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] transition ${category === value ? "border-red-700 text-red-800" : "border-transparent text-slate-600 hover:border-slate-400 hover:text-slate-950"}`}
                >
                  {value === "all" ? text.allCategories : getNewsLabel(language, value)}
                </button>
              ))}
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              <LanguageSelector />
              <ThemeToggle />
              <label htmlFor="country-select" className="sr-only">{text.allCountries}</label>
              <select
                id="country-select"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                className="h-10 min-w-40 border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-sky-700"
              >
                {COUNTRIES.map(([value]) => <option key={value} value={value}>{countryLabel(value)}</option>)}
              </select>
              <label htmlFor="news-search" className="sr-only">Haberlerde ara</label>
              <input
                id="news-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={text.searchPlaceholder}
                className="h-10 w-36 border border-slate-300 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-sky-700 sm:w-48"
              />
            </div>
          </div>
        </header>

        <MarketTicker />

        <section className="px-4 pt-5 md:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-600">{ui(language, "intro")}</p>
            <select aria-label={text.sortBy} value={sort} onChange={(event) => setSort(event.target.value as "importance" | "latest")} className="min-h-10 border border-slate-300 bg-white px-3 text-sm">
              <option value="importance">{text.sortImpact}</option>
              <option value="latest">{text.sortLatest}</option>
            </select>
          </div>
          {loading && items.length > 0 && <p role="status" className="mb-3 text-xs text-slate-500">{ui(language, "updating")}</p>}
          {localized.status === "loading" && items.length > 0 && <p role="status" className="mb-3 text-xs text-slate-500">{ui(language, "translating")}</p>}
          {localized.status === "error" && <p role="status" className="mb-3 text-xs text-amber-700">{ui(language, "translationError")} <button type="button" onClick={localized.retry} className="min-h-10 underline">{ui(language, "retry")}</button></p>}
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-slate-300 pb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-700">{text.topStories}</p>
              <h1 className="mt-1 font-serif text-xl font-bold uppercase tracking-[0.08em]">{countryName}{category !== "all" ? ` · ${activeCategoryLabel}` : ` ${text.agenda}`}</h1>
            </div>
            <p className="text-[11px] text-slate-500">{total} {ui(language, "news")} · {sources.length} {text.sourcesCount}</p>
          </div>

          {error && <p role="status" className="mb-4 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</p>}

          {loading && items.length === 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((value) => <div key={value} className="aspect-[16/10] animate-pulse bg-slate-100" />)}
            </div>
          ) : <NewsFeed stories={visibleStories} language={language} />}

          {!loading && visibleStories.length === 0 && !error && (
            <p className="py-12 text-center text-sm text-slate-600">{ui(language, "noSearch")}</p>
          )}


          {loadingMore && <p className="py-6 text-center text-sm text-slate-500" role="status">{text.loadingNews}</p>}
          <div ref={sentinelRef} className="h-4" aria-hidden="true" />
          {hasMore && !loadingMore && error && (
            <div className="py-6 text-center">
              <button type="button" onClick={() => void loadMore()} className="border border-slate-400 bg-white px-6 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-800 hover:border-slate-900 hover:bg-slate-50">
                {text.loadMore}
              </button>
            </div>
          )}
          {!hasMore && items.length > 0 && <p className="py-6 text-center text-xs uppercase tracking-[0.15em] text-slate-400">{text.endOfStream}</p>}
        </section>

        <footer className="mt-4 flex flex-col gap-2 border-t border-slate-300 px-4 py-5 text-[10px] text-slate-500 md:flex-row md:items-center md:justify-between md:px-8">
          <span className="font-serif text-sm font-bold tracking-[0.12em] text-slate-700">INTELMATRIX</span>
          <span>{text.footerDesc}</span>
        </footer>
        <NewsAssistant articles={items} />
      </div>
    </main>
  );
}
