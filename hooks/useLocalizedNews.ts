"use client";
import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/store/news-store";
import type { SupportedLanguage } from "@/lib/store/language-store";
const cache = new Map<string, { title: string; summary: string }>();
const keyFor = (item: NewsItem, language: string) => `${language}:${item.original_title}:${item.executive_summary}`;
export function useLocalizedNews(items: NewsItem[], language: SupportedLanguage) {
  const [, setRevision] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const missing = items.filter((item) => !cache.has(keyFor(item, language)));
    queueMicrotask(() => { if (!controller.signal.aborted) setStatus(missing.length ? "loading" : "ready"); });
    async function run() {
      let failed = false;
      for (let offset = 0; offset < missing.length; offset += 12) {
        if (controller.signal.aborted) return;
        const batch = missing.slice(offset, offset + 12);
        try {
          const response = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetLang: language, texts: batch.flatMap((item) => [item.original_title, item.executive_summary]), sourceLangs: batch.flatMap((item) => item.source === "BBC Türkçe" ? ["tr", "tr"] : ["en", "en"]) }), signal: controller.signal });
          if (!response.ok) throw new Error("Translation request failed");
          const data = await response.json();
          if (controller.signal.aborted) return;
          if (!data.complete) failed = true;
          batch.forEach((item, i) => {
            const title = data.translations?.[i * 2], summary = data.translations?.[i * 2 + 1];
            if ((data.complete || (data.resolved?.[i * 2] && data.resolved?.[i * 2 + 1])) && typeof title === "string" && typeof summary === "string") {
              if (cache.size >= 3000) cache.delete(cache.keys().next().value!);
              cache.set(keyFor(item, language), { title, summary });
            }
          });
          setRevision((value) => value + 1);
        } catch { if (controller.signal.aborted) return; failed = true; }
      }
      if (!controller.signal.aborted) setStatus(failed ? "error" : "ready");
    }
    void run();
    return () => controller.abort();
  }, [items, language, retry]);
  return { items: items.map((item) => {
    const value = cache.get(keyFor(item, language));
    return value ? { ...item, translated_title: value.title, executive_summary: value.summary } : item;
  }), status, retry: () => setRetry((value) => value + 1) };
}
