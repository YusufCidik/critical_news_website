import type { SupportedLanguage } from "@/lib/store/language-store";
import { translateBatch } from "@/lib/i18n/server-translate";
export interface LocalizedTitle { language: SupportedLanguage; text: string }
export async function localizeNewsTitles<T extends { original_title: string; source?: string }>(items: T[], language: SupportedLanguage | null): Promise<{ items: Array<T & { localized_title?: LocalizedTitle }>; complete: boolean }> {
  if (!language || !items.length) return { items, complete: true };
  const batches = await Promise.all(Array.from({ length: Math.ceil(items.length / 12) }, (_, index) => {
    const batch = items.slice(index * 12, index * 12 + 12);
    return translateBatch(batch.map((item) => item.original_title), language, batch.map((item) => item.source === "BBC Türkçe" ? "tr" : "en"));
  }));
  const result = { translations: batches.flatMap((batch) => batch.translations), resolved: batches.flatMap((batch) => batch.resolved), complete: batches.every((batch) => batch.complete) };
  return { items: items.map((item, index) => result.resolved[index] ? { ...item, localized_title: { language, text: result.translations[index] } } : item), complete: result.complete };
}
