"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAllNewsItems, saveNewsItems } from "@/lib/offline/idb-schema";
import { useNewsStore, type NewsItem } from "@/lib/store/news-store";

interface NewsResponse {
  items: NewsItem[];
  total: number;
  nextCursor: number | null;
  sources: string[];
  updatedAt: string;
}

interface UseNewsDataOptions {
  country: string;
  category: string;
}

const OFFLINE_COUNTRY_TERMS: Record<string, string[]> = {
  turkey: ["turkey", "türkiye", "turkish", "ankara", "istanbul", "erdogan", "erdoğan"],
  us: ["united states", "u.s.", "america", "american", "washington", "trump", "congress"],
  uk: ["united kingdom", "britain", "british", "uk", "london"],
  china: ["china", "chinese", "beijing", "taiwan"],
  israel: ["israel", "israeli", "gaza", "palestine", "palestinian", "jerusalem"],
  ukraine: ["ukraine", "ukrainian", "kyiv", "zelensky"],
  russia: ["russia", "russian", "moscow", "putin"],
  iran: ["iran", "iranian", "tehran"],
  france: ["france", "french", "paris", "macron"],
  germany: ["germany", "german", "berlin"],
  india: ["india", "indian", "new delhi", "modi"],
  japan: ["japan", "japanese", "tokyo"],
};

function filterCachedItems(items: NewsItem[], country: string, category: string): NewsItem[] {
  return items.filter((item) => {
    const categoryMatches = category === "all" || item.category === category;
    const terms = OFFLINE_COUNTRY_TERMS[country];
    if (!categoryMatches || country === "world" || !terms) return categoryMatches;
    const text = `${item.original_title} ${item.executive_summary}`.toLowerCase();
    return terms.some((term) => text.includes(term));
  });
}

export function useNewsData({ country, category }: UseNewsDataOptions = { country: "world", category: "all" }) {
  const { items, activeItem, loading, error, setItems, setActiveItem, setLoading, setError } = useNewsStore();
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [sources, setSources] = useState<string[]>([]);
  const nextCursorRef = useRef<number | null>(0);
  const loadingMoreRef = useRef(false);
  const scopeRef = useRef("");
  const scopeKey = `${country}:${category}`;

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    scopeRef.current = scopeKey;
    nextCursorRef.current = 0;
    queueMicrotask(() => {
      if (!mounted) return;
      setItems([]);
      setActiveItem(null);
      setLoading(true);
      setLoadingMore(false);
      setHasMore(false);
      setTotal(0);
      setSources([]);
      setError(null);
    });

    const loadFirstPage = async () => {
      try {
        const query = new URLSearchParams({ country, category, cursor: "0", limit: "12" });
        const response = await fetch(`/api/news?${query.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`News request failed: ${response.status}`);

        const payload = (await response.json()) as NewsResponse;
        if (!mounted) return;

        const freshItems = Array.isArray(payload.items) ? payload.items : [];
        const timestamp = new Date().toISOString();
        await saveNewsItems(
          freshItems.map((item) => ({
            ...item,
            created_at: item.created_at || timestamp,
            updated_at: item.updated_at || timestamp,
          }))
        );
        if (!mounted) return;

        setItems(freshItems);
        setActiveItem(freshItems[0] ?? null);
        nextCursorRef.current = payload.nextCursor;
        setHasMore(payload.nextCursor !== null);
        setTotal(payload.total || 0);
        setSources(payload.sources || []);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.warn("Live news unavailable; loading IndexedDB cache:", loadError);
        try {
          const cached = await getAllNewsItems();
          if (!mounted) return;
          const scoped = filterCachedItems(cached, country, category)
            .sort((a, b) => Date.parse(b.published_at || "") - Date.parse(a.published_at || ""));
          setItems(scoped.slice(0, 12));
          setActiveItem(scoped[0] ?? null);
          setTotal(scoped.length);
          setError(scoped.length ? "Çevrimdışı görünüm: son kaydedilen haberler gösteriliyor." : "Haber kaynaklarına ulaşılamıyor ve bu kapsamda çevrimdışı haber bulunamadı.");
        } catch (cacheError) {
          console.error("IndexedDB news fallback failed:", cacheError);
          if (mounted) setError("Haberler şu anda yüklenemiyor.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadFirstPage();
    const refreshTimer = window.setInterval(() => {
      if (navigator.onLine) void loadFirstPage();
    }, 5 * 60 * 1000);

    return () => {
      mounted = false;
      controller.abort();
      window.clearInterval(refreshTimer);
    };
  }, [country, category, scopeKey, setActiveItem, setError, setItems, setLoading]);

  const loadMore = useCallback(async () => {
    const cursor = nextCursorRef.current;
    if (cursor === null || loadingMoreRef.current || loading) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const query = new URLSearchParams({ country, category, cursor: String(cursor), limit: "12" });
      const response = await fetch(`/api/news?${query.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`News page request failed: ${response.status}`);
      const payload = (await response.json()) as NewsResponse;
      if (scopeRef.current !== scopeKey) return;

      const timestamp = new Date().toISOString();
      await saveNewsItems(
        payload.items.map((item) => ({
          ...item,
          created_at: item.created_at || timestamp,
          updated_at: item.updated_at || timestamp,
        }))
      );
      setItems([...useNewsStore.getState().items, ...payload.items]);
      nextCursorRef.current = payload.nextCursor;
      setHasMore(payload.nextCursor !== null);
      setTotal(payload.total || 0);
      setSources(payload.sources || []);
    } catch (loadError) {
      console.warn("Unable to load the next news page:", loadError);
      setError("Yeni haberler yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [category, country, loading, scopeKey, setError, setItems]);

  return { items, activeItem, loading, loadingMore, hasMore, total, sources, error, loadMore };
}