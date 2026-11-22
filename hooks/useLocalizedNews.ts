"use client";
import { useEffect, useId, useSyncExternalStore } from "react";
import type { NewsItem } from "@/lib/store/news-store";
import type { SupportedLanguage } from "@/lib/store/language-store";
import { newsSourceLanguage } from "@/lib/i18n/news-language";
import { translationQueue, type TranslationEntry } from "@/lib/i18n/client-translation";

const serverSnapshot = () => 0;
export function useLocalizedNews(items: NewsItem[], language: SupportedLanguage) {
  const scope = useId();
  useSyncExternalStore(translationQueue.subscribe, translationQueue.snapshot, serverSnapshot);
  const signature = JSON.stringify(items.map((item) => [item.original_title, item.executive_summary, item.source, item.localized_title?.language === language ? item.localized_title.text : ""]));
  const entries: TranslationEntry[] = (JSON.parse(signature) as string[][]).flatMap(([title, summary, source]) => [
    { text: title, source: newsSourceLanguage(source), priority: 0 },
    { text: summary, source: newsSourceLanguage(source), priority: 1 },
  ]);
  useEffect(() => {
    const decoded = JSON.parse(signature) as string[][];
    const values: TranslationEntry[] = decoded.flatMap(([title, summary, source]) => [
      { text: title, source: newsSourceLanguage(source), priority: 0 },
      { text: summary, source: newsSourceLanguage(source), priority: 1 },
    ]);
    const seeds = decoded.flatMap(([title, , source, translated]) => translated ? [{ text: title, source: newsSourceLanguage(source), priority: 0, translated }] : []);
    translationQueue.seed(seeds, language);
    const stop = translationQueue.watch(scope, values, language);
    const recover = () => translationQueue.retry(values, language);
    window.addEventListener("online", recover);
    return () => { stop(); window.removeEventListener("online", recover); };
  }, [signature, language, scope]);
  return {
    items: items.map((item) => {
      const source = newsSourceLanguage(item.source);
      return { ...item, translated_title: item.localized_title?.language === language ? item.localized_title.text : translationQueue.get(item.original_title, source, language) ?? item.original_title, executive_summary: translationQueue.get(item.executive_summary, source, language) ?? item.executive_summary };
    }),
    status: translationQueue.status(entries, language),
    retry: () => translationQueue.retry(entries, language),
  };
}
