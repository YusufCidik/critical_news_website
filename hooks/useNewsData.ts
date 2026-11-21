"use client";

import { compareNewsPriority, groupNewsByEvent, matchesCountry, matchesNewsSearch } from "@/lib/news/discovery";
import { matchesNewsCategory } from "@/lib/news/categories";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAllNewsItems, saveNewsItems } from "@/lib/offline/idb-schema";
import { useLanguageStore } from "@/lib/store/language-store";
import { useNewsStore, type NewsItem } from "@/lib/store/news-store";

interface NewsResponse {
  items: NewsItem[];
  total: number;
  nextCursor: number | null;
  sources: string[];
  publishers?: string[];
  updatedAt: string;
}

interface UseNewsDataOptions {
  country: string;
  category: string;
  search?: string;
  enabled?: boolean;
  sort?: "importance" | "latest";
}

function filterCachedItems(items: NewsItem[], country: string, category: string, search: string, sort: string) {
  const cutoff = Date.now() - 7 * 86400000;
  const matching = items.filter((item) => Date.parse(item.published_at || "") >= cutoff
    && matchesCountry(item, country) && matchesNewsCategory(item, category) && matchesNewsSearch(item, search));
  return groupNewsByEvent(matching.sort((a, b) => compareNewsPriority(a, b, sort, category)), (item) => item.event);
}

export function useNewsData({ country, category, search = "", enabled = true, sort = "importance" }: UseNewsDataOptions = { country: "world", category: "all" }) {
  const { items, activeItem, loading, error, setItems, setActiveItem, setLoading, setError } = useNewsStore();
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [sources, setSources] = useState<string[]>([]);
  const nextCursorRef = useRef<number | null>(0);
  const loadingMoreRef = useRef(false);
  const scopeRef = useRef("");
  const scopeKey = JSON.stringify([enabled, country, category, sort, search]);
  const pageRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    const controller = new AbortController();
    scopeRef.current = scopeKey;
    loadingMoreRef.current = false;
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

    let receivedLive = false;
    void getAllNewsItems().then((cached) => {
      if (!mounted || receivedLive) return;
      const scoped = filterCachedItems(cached, country, category, search, sort);
      if (scoped.length) { setItems(scoped.slice(0, 12)); setActiveItem(scoped[0]); setTotal(scoped.length); setSources([...new Set(scoped.map((item) => item.source || ""))]); }
    }).catch(() => {});

    const loadFirstPage = async () => {
      try {
        const query = new URLSearchParams({ language: useLanguageStore.getState().language, country, category, sort, cursor: "0", limit: "12" });
        if (search) query.set("q", search);
        const response = await fetch(`/api/news?${query.toString()}`, {
          cache: "default",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`News request failed: ${response.status}`);

        const payload = (await response.json()) as NewsResponse;
        if (!mounted) return;

        const freshItems = Array.isArray(payload.items) ? payload.items : [];
        const timestamp = new Date().toISOString();
        receivedLive = true;
        setItems(freshItems);
        setActiveItem(freshItems[0] ?? null);
        void saveNewsItems(
          freshItems.map((item) => ({
            ...item,
            created_at: item.created_at || timestamp,
            updated_at: item.updated_at || timestamp,
          }))
        ).catch((error) => console.warn("Offline cache write failed:", error));
        if (!mounted) return;

        nextCursorRef.current = payload.nextCursor;
        setHasMore(payload.nextCursor !== null);
        setTotal(payload.total || 0);
        setSources(payload.publishers || payload.sources || []);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.warn("Live news unavailable; loading IndexedDB cache:", loadError);
        try {
          const cached = await getAllNewsItems();
          if (!mounted) return;
          const scoped = filterCachedItems(cached, country, category, search, sort);
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
      if (navigator.onLine && useNewsStore.getState().items.length <= 12) void loadFirstPage();
    }, 5 * 60 * 1000);

    return () => {
      mounted = false;
      controller.abort();
      pageRequest.current?.abort();
      window.clearInterval(refreshTimer);
    };
  }, [enabled, country, category, search, sort, scopeKey, setActiveItem, setError, setItems, setLoading]);

  const loadMore = useCallback(async () => {
    const cursor = nextCursorRef.current;
    if (!enabled || cursor === null || loadingMoreRef.current || loading) return;

    const controller = new AbortController();
    pageRequest.current = controller;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const query = new URLSearchParams({ language: useLanguageStore.getState().language, country, category, sort, cursor: String(cursor), limit: "12" });
      if (search) query.set("q", search);
      const response = await fetch(`/api/news?${query.toString()}`, { cache: "default", signal: controller.signal });
      if (!response.ok) throw new Error(`News page request failed: ${response.status}`);
      const payload = (await response.json()) as NewsResponse;
      if (controller.signal.aborted || scopeRef.current !== scopeKey) return;

      const timestamp = new Date().toISOString();
      void saveNewsItems(
        payload.items.map((item) => ({
          ...item,
          created_at: item.created_at || timestamp,
          updated_at: item.updated_at || timestamp,
        }))
      ).catch((error) => console.warn("Offline cache write failed:", error));
      if (controller.signal.aborted || scopeRef.current !== scopeKey) return;
      setItems([...new Map([...useNewsStore.getState().items, ...payload.items].map((item) => [item.id, item])).values()]);
      setError(null);
      nextCursorRef.current = payload.nextCursor;
      setHasMore(payload.nextCursor !== null);
      setTotal(payload.total || 0);
      setSources(payload.publishers || payload.sources || []);
    } catch (loadError) {
      if (controller.signal.aborted || scopeRef.current !== scopeKey) return;
      console.warn("Unable to load the next news page:", loadError);
      setError("Yeni haberler yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.");
    } finally {
      if (!controller.signal.aborted && scopeRef.current === scopeKey) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [enabled, category, country, search, sort, loading, scopeKey, setError, setItems]);

  return { items, activeItem, loading, loadingMore, hasMore, total, sources, error, loadMore };
}