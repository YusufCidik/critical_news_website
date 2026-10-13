"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExecutiveBriefing } from "@/components/ExecutiveBriefing";
import { NewsArticleCard } from "@/components/NewsArticleCard";
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

function formatTime(value: string | undefined, language: "tr" | "en" | "de" | "fr" | "es"): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  const locale = language === "tr" ? "tr-TR" : language === "de" ? "de-DE" : language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : "en-US";
  if (minutes < 1) return language === "tr" ? "şimdi" : "just now";
  if (minutes < 60) return new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(-hours, "hour");
  return new Intl.RelativeTimeFormat(locale, { numeric: "always" }).format(-Math.floor(hours / 24), "day");
}

export default function Home() {
  const { language } = useLanguageStore();
  const text = UI_TRANSLATIONS[language];
  const [online, setOnline] = useState(true);
  const [country, setCountry] = useState("world");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { items, loading, loadingMore, hasMore, total, sources, error, loadMore } = useNewsData({
    country,
    category,
  });

  const countryName = COUNTRIES.find(([value]) => value === country)?.[1] ?? text.allCountries;
  const activeCategoryLabel = category === "all" ? text.allCategories : getNewsLabel(language, category);
  const locale = language === "tr" ? "tr-TR" : language === "de" ? "de-DE" : language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : "en-US";
  const visibleStories = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");
    if (!query) return items;
    return items.filter((story) =>
      `${story.translated_title} ${story.executive_summary} ${story.source}`.toLocaleLowerCase("tr-TR").includes(query)
    );
  }, [items, search]);

  const breakingStories = useMemo(() => items.filter((story) => story.is_breaking).slice(0, 5), [items]);
  const featuredStory = visibleStories[0] ?? null;
  const sideStories = visibleStories.filter((story) => story.id !== featuredStory?.id).slice(0, 4);

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
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "800px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore, loading, loadingMore]);

  return (
    <main className="min-h-screen bg-[#f6f6f4] text-slate-950">
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
            <span className="font-serif text-[38px] font-black leading-none tracking-[0.035em] text-[#242424] md:text-[52px]">INTELMATRIX</span>
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

            <div className="flex items-center gap-2">
              <LanguageSelector />
              <ThemeToggle />
              <label htmlFor="country-select" className="sr-only">{text.allCountries}</label>
              <select
                id="country-select"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                className="h-10 min-w-40 border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-sky-700"
              >
                {COUNTRIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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

        {breakingStories.length > 0 && (
          <section aria-label="Son dakika haberleri" className="border-b border-red-800 bg-[#b5121b] text-white">
            <div className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:px-8">
              <div className="flex shrink-0 items-center gap-2 text-xs font-black uppercase tracking-[0.15em]">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
                {text.breaking}
              </div>
              <div className="flex min-w-0 flex-1 gap-5 overflow-x-auto whitespace-nowrap text-sm">
                {breakingStories.map((story) => (
                  <a key={story.id} href={story.source_url} target="_blank" rel="noreferrer" className="border-l border-white/35 pl-4 hover:underline first:border-0 first:pl-0">
                    {story.translated_title}
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {visibleStories.length > 1 && (
          <section className="px-4 pt-5 md:px-8" aria-label="Günün fotoğraflı manşetleri">
            <div className="mb-3 flex items-center justify-between border-b border-slate-300 pb-2">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">{text.topStories}</h2>
              <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{countryName}</span>
            </div>
            <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
              {visibleStories.slice(0, 4).map((story) => (
                <a key={story.id} href={story.source_url || "#"} target="_blank" rel="noreferrer" className="group min-w-0">
                  <div className="aspect-[16/10] overflow-hidden bg-slate-100">
                    {story.image_url ? <img src={story.image_url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" /> : <div className="h-full bg-gradient-to-br from-slate-100 to-slate-200" />}
                  </div>
                  <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.13em] text-red-700">{story.source}</p>
                  <h3 className="mt-1 font-serif text-[17px] font-bold leading-tight text-slate-900 group-hover:text-sky-800">{story.translated_title}</h3>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="px-4 pt-5 md:px-8">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-slate-300 pb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-700">{text.topStories}</p>
              <h1 className="mt-1 font-serif text-xl font-bold uppercase tracking-[0.08em]">{countryName}{category !== "all" ? ` · ${activeCategoryLabel}` : ` ${text.agenda}`}</h1>
            </div>
            <p className="text-[11px] text-slate-500">{total} haber · {sources.length} yayın kaynağı</p>
          </div>

          {loading && items.length === 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((value) => <div key={value} className="aspect-[16/10] animate-pulse bg-slate-100" />)}
            </div>
          ) : featuredStory ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
              <NewsArticleCard story={featuredStory} layout="feature" language={language} />
              <aside className="border-t border-slate-200 lg:border-l lg:border-t-0 lg:pl-5" aria-label="Öne çıkan diğer haberler">
                <h2 className="mb-3 border-b border-slate-200 pb-2 text-[10px] font-bold uppercase tracking-[0.17em] text-slate-600">Öne çıkanlar</h2>
                <div className="divide-y divide-slate-200">
                  {sideStories.map((story) => (
                    <a key={story.id} href={story.source_url || "#"} target="_blank" rel="noreferrer" className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 py-3 first:pt-0">
                      <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                        {story.image_url ? <img src={story.image_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="h-full bg-slate-100" />}
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-red-700">{story.source} · {formatTime(story.published_at, language)}</p>
                        <h3 className="mt-1 font-serif text-[16px] font-bold leading-tight text-slate-900 hover:text-sky-800">{story.translated_title}</h3>
                      </div>
                    </a>
                  ))}
                </div>
              </aside>
            </div>
          ) : (
            <div className="border-y border-slate-200 py-12 text-center">
              <h2 className="font-serif text-2xl font-bold">Bu kapsamda henüz haber bulunamadı</h2>
              <p className="mt-2 text-sm text-slate-600">Başka bir ülke ya da kategori seçebilir veya daha sonra yeniden deneyebilirsiniz.</p>
            </div>
          )}
        </section>

        <section className="mt-9 px-4 md:px-8" aria-label="Sonsuz haber akışı">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b-2 border-slate-900 pb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-700">Canlı akış</p>
              <h2 className="mt-1 font-serif text-2xl font-bold">{text.otherNews}</h2>
            </div>
            <p className="text-xs text-slate-500">{countryName} · {activeCategoryLabel}</p>
          </div>

          {error && <p role="status" className="mb-4 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</p>}

          <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleStories.map((story) => <NewsArticleCard key={story.id} story={story} language={language} />)}
          </div>

          {!loading && visibleStories.length === 0 && !error && (
            <p className="py-12 text-center text-sm text-slate-600">Aramanızla eşleşen haber bulunamadı.</p>
          )}

          <div ref={sentinelRef} className="h-2" aria-hidden="true" />
          {loadingMore && <p className="py-6 text-center text-sm text-slate-500" role="status">Yeni haberler yükleniyor…</p>}
          {hasMore && !loadingMore && (
            <div className="py-6 text-center">
              <button type="button" onClick={() => void loadMore()} className="border border-slate-400 bg-white px-6 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-800 hover:border-slate-900 hover:bg-slate-50">
                {text.loadMore}
              </button>
            </div>
          )}
          {!hasMore && items.length > 0 && <p className="py-6 text-center text-xs uppercase tracking-[0.15em] text-slate-400">Şimdilik akışın sonu · kaynaklar yenilendikçe yeni haberler burada</p>}
        </section>

        {featuredStory && (
          <section className="mt-10 border-t border-slate-300 px-4 py-8 md:px-8">
            <ExecutiveBriefing briefing={featuredStory} />
          </section>
        )}

        <footer className="mt-4 flex flex-col gap-2 border-t border-slate-300 px-4 py-5 text-[10px] text-slate-500 md:flex-row md:items-center md:justify-between md:px-8">
          <span className="font-serif text-sm font-bold tracking-[0.12em] text-slate-700">INTELMATRIX</span>
          <span>{text.footerDesc}</span>
        </footer>
        <NewsAssistant articles={items} />
      </div>
    </main>
  );
}