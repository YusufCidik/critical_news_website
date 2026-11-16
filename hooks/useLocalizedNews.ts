"use client";
import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/store/news-store";
import type { SupportedLanguage } from "@/lib/store/language-store";
const cache = new Map<string, string>();
const keyFor = (text: string, language: string) => language + ":" + text;
export function useLocalizedNews(items: NewsItem[], language: SupportedLanguage) {
  const [, redraw] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const signature = JSON.stringify(items.map((item) => [item.original_title, item.executive_summary, item.source]));
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const entries = JSON.parse(signature) as string[][];
    const texts = [...new Map(entries.flatMap(([title, summary, source]) => [title, summary].map((text) => [text, { text, source: source === "BBC Türkçe" ? "tr" : "en" }]))).values()];
    async function run() {
      setStatus("loading");
      for (let round = 0; round < 3 && !controller.signal.aborted; round++) {
        const missing = texts.filter(({ text }) => !cache.has(keyFor(text, language)));
        if (!missing.length) break;
        for (let offset = 0; offset < missing.length; offset += 6) {
          if (controller.signal.aborted) return;
          const batch = missing.slice(offset, offset + 6);
          try {
            const response = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetLang: language, texts: batch.map((v) => v.text), sourceLangs: batch.map((v) => v.source) }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(55000)]) });
            if (!response.ok) continue;
            const data = await response.json();
            if (controller.signal.aborted) return;
            batch.forEach(({ text }, index) => {
              if ((data.complete || data.resolved?.[index]) && typeof data.translations?.[index] === "string") {
                if (cache.size >= 5000) cache.delete(cache.keys().next().value!);
                cache.set(keyFor(text, language), data.translations[index]);
              }
            });
            redraw((v) => v + 1);
          } catch { if (controller.signal.aborted) return; }
        }
        if (round < 2 && texts.some(({ text }) => !cache.has(keyFor(text, language)))) await new Promise<void>((resolve) => { timer = setTimeout(resolve, 1000 * (round + 1)); controller.signal.addEventListener("abort", () => resolve(), { once: true }); });
      }
      if (!controller.signal.aborted) setStatus(texts.some(({ text }) => !cache.has(keyFor(text, language))) ? "error" : "ready");
    }
    queueMicrotask(() => { if (!controller.signal.aborted) void run(); });
    return () => { controller.abort(); clearTimeout(timer); };
  }, [signature, language, attempt]);
  return { items: items.map((item) => ({ ...item, translated_title: cache.get(keyFor(item.original_title, language)) ?? item.original_title, executive_summary: cache.get(keyFor(item.executive_summary, language)) ?? item.executive_summary })), status, retry: () => setAttempt((v) => v + 1) };
}
