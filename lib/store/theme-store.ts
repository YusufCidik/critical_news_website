import { create } from "zustand";

export type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = "intelmatrix_theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved && ["light", "dark"].includes(saved)) return saved;
  } catch {
    // ignore
  }
  return "light";
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (theme: Theme) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, theme);
        document.documentElement.classList.toggle("dark", theme === "dark");
      }
    } catch {
      // ignore
    }
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    get().setTheme(next);
  },
}));
