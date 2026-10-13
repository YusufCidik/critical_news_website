import { create } from "zustand";

export type SupportedLanguage = "tr" | "en" | "de" | "fr" | "es";

interface LanguageState {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
}

const STORAGE_KEY = "intelmatrix_lang";

function getInitialLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return "tr";
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
    if (saved && ["tr", "en", "de", "fr", "es"].includes(saved)) {
      return saved;
    }
  } catch {
    // ignore
  }
  return "tr";
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: getInitialLanguage(),
  setLanguage: (lang: SupportedLanguage) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, lang);
      }
    } catch {
      // ignore
    }
    set({ language: lang });
  },
}));
