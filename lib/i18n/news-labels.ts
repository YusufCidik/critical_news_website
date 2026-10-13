import type { SupportedLanguage } from "@/lib/store/language-store";

type NewsLabelKey = "world" | "AI" | "Jeopolitik" | "Teknoloji" | "Ekonomi" | "Bilim" | "Spor" | "Kültür" | "Sağlık" | "İklim" | "Savunma" | "Enerji" | "Seyahat" | "critical" | "high" | "watch" | "low" | "breaking" | "source" | "goToSource";

const LABELS: Record<SupportedLanguage, Record<NewsLabelKey, string>> = {
  tr: {
    world: "Dünya", AI: "Yapay zekâ", Jeopolitik: "Jeopolitik", Teknoloji: "Teknoloji", Ekonomi: "Ekonomi", Bilim: "Bilim", Spor: "Spor", Kültür: "Kültür", Sağlık: "Sağlık", İklim: "İklim", Savunma: "Savunma", Enerji: "Enerji", Seyahat: "Seyahat", critical: "Kritik", high: "Yüksek", watch: "İzlenmeli", low: "Düşük", breaking: "Son dakika", source: "Kaynak", goToSource: "Kaynağa git ↗",
  },
  en: {
    world: "World", AI: "Artificial intelligence", Jeopolitik: "Geopolitics", Teknoloji: "Technology", Ekonomi: "Economy", Bilim: "Science", Spor: "Sports", Kültür: "Culture", Sağlık: "Health", İklim: "Climate", Savunma: "Defense", Enerji: "Energy", Seyahat: "Travel", critical: "Critical", high: "High", watch: "Watch", low: "Low", breaking: "Breaking", source: "Source", goToSource: "Read source ↗",
  },
  de: {
    world: "Welt", AI: "KI", Jeopolitik: "Geopolitik", Teknoloji: "Technologie", Ekonomi: "Wirtschaft", Bilim: "Wissenschaft", Spor: "Sport", Kültür: "Kultur", Sağlık: "Gesundheit", İklim: "Klima", Savunma: "Verteidigung", Enerji: "Energie", Seyahat: "Reisen", critical: "Kritisch", high: "Hoch", watch: "Beobachten", low: "Niedrig", breaking: "Eilmeldung", source: "Quelle", goToSource: "Quelle lesen ↗",
  },
  fr: {
    world: "Monde", AI: "IA", Jeopolitik: "Géopolitique", Teknoloji: "Technologie", Ekonomi: "Économie", Bilim: "Sciences", Spor: "Sport", Kültür: "Culture", Sağlık: "Santé", İklim: "Climat", Savunma: "Défense", Enerji: "Énergie", Seyahat: "Voyage", critical: "Critique", high: "Élevé", watch: "À surveiller", low: "Faible", breaking: "Dernière minute", source: "Source", goToSource: "Lire la source ↗",
  },
  es: {
    world: "Mundo", AI: "IA", Jeopolitik: "Geopolítica", Teknoloji: "Tecnología", Ekonomi: "Economía", Bilim: "Ciencia", Spor: "Deportes", Kültür: "Cultura", Sağlık: "Salud", İklim: "Clima", Savunma: "Defensa", Enerji: "Energía", Seyahat: "Viajes", critical: "Crítico", high: "Alto", watch: "Vigilar", low: "Bajo", breaking: "Última hora", source: "Fuente", goToSource: "Leer fuente ↗",
  },
};

export function getNewsLabel(language: SupportedLanguage, key: string): string {
  return LABELS[language][key as NewsLabelKey] || key;
}
