"use client";

import { useLanguageStore, type SupportedLanguage } from "@/lib/store/language-store";

const LANGUAGES: Array<{ code: SupportedLanguage; label: string; flag: string }> = [
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

export function LanguageSelector() {
  const { language, setLanguage } = useLanguageStore();

  return (
    <div className="relative inline-flex items-center">
      <label htmlFor="language-select" className="sr-only">Dil seçin / Select language</label>
      <select
        id="language-select"
        value={language}
        onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
        className="h-8 appearance-none border pl-2.5 pr-6 text-xs font-bold outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-200 rounded-sm cursor-pointer"
        style={{
          backgroundColor: "var(--input-bg, #fff)",
          borderColor: "var(--input-border, #cbd5e1)",
          color: "var(--body-text, #374151)",
        }}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 text-[10px] text-slate-400">▾</span>
    </div>
  );
}
