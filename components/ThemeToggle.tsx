"use client";

import { ui } from "@/lib/i18n/interface-labels";
import { useLanguageStore } from "@/lib/store/language-store";
import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/lib/store/theme-store";

export function ThemeToggle() {
  const { language } = useLanguageStore();
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={ui(language, theme === "dark" ? "light" : "dark")}
      title={ui(language, theme === "dark" ? "light" : "dark")}
      className="inline-flex h-9 items-center gap-2 border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="hidden sm:inline">{ui(language, theme === "dark" ? "light" : "dark")}</span>
    </button>
  );
}
