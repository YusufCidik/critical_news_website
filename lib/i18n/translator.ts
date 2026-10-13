import type { SupportedLanguage } from "@/lib/store/language-store";

const clientCache = new Map<string, string>();

// Local news vocabulary fallback dictionary for fast offline/failsafe translations
const DICT: Record<SupportedLanguage, Record<string, string>> = {
  tr: {
    "breaking news": "Son Dakika",
    "breaking": "Son Dakika",
    "announces": "açıkladı",
    "announced": "duyurdu",
    "launches": "başlattı",
    "launched": "piyasaya sürdü",
    "unveils": "tanıttı",
    "unveiled": "gözler önüne serdi",
    "reports": "bildiriyor",
    "president": "Başkan",
    "prime minister": "Başbakan",
    "government": "Hükümet",
    "election": "Seçim",
    "elections": "Seçimler",
    "economy": "Ekonomi",
    "economic": "Ekonomik",
    "market": "Piyasa",
    "markets": "Piyasalar",
    "stock": "Hisse",
    "stocks": "Hisseler",
    "inflation": "Enflasyon",
    "growth": "Büyüme",
    "tech": "Teknoloji",
    "technology": "Teknoloji",
    "artificial intelligence": "Yapay Zekâ",
    "ai": "Yapay Zekâ",
    "climate": "İklim",
    "energy": "Enerji",
    "defense": "Savunma",
    "military": "Askeri",
    "war": "Savaş",
    "peace": "Barış",
    "talks": "Görüşmeler",
    "deal": "Anlaşma",
    "summit": "Zirve",
    "crisis": "Kriz",
  },
  en: {
    "son dakika": "Breaking News",
    "gündem": "Agenda",
    "ekonomi": "Economy",
    "teknoloji": "Technology",
    "yapay zeka": "Artificial Intelligence",
    "yapay zekâ": "Artificial Intelligence",
    "savunma": "Defense",
    "hakkında": "about",
    "başkanı": "President",
    "bakanı": "Minister",
  },
  de: {
    "breaking news": "Eilmeldung",
    "announces": "kündigt an",
    "unveils": "enthüllt",
    "launches": "startet",
    "president": "Präsident",
    "government": "Regierung",
    "market": "Markt",
    "economy": "Wirtschaft",
    "tech": "Technologie",
  },
  fr: {
    "breaking news": "En Direct",
    "announces": "annonce",
    "unveils": "dévoile",
    "launches": "lance",
    "president": "Président",
    "government": "Gouvernement",
    "market": "Marché",
    "economy": "Économie",
    "tech": "Technologie",
  },
  es: {
    "breaking news": "Última Hora",
    "announces": "anuncia",
    "unveils": "presenta",
    "launches": "lanza",
    "president": "Presidente",
    "government": "Gobierno",
    "market": "Mercado",
    "economy": "Economía",
    "tech": "Tecnología",
  },
};

export async function translateText(text: string, targetLang: SupportedLanguage): Promise<string> {
  if (!text || text.trim().length === 0) return text;

  // If target language is TR and text already contains Turkish specific characters or common Turkish words, keep it
  if (targetLang === "tr" && (/[ığüşöçİĞÜŞÖÇ]/.test(text) || /\b(ve|bir|için|ile|bu|da|de|oldu|dedi|başkanı|hakkında|haber|son|dakika)\b/i.test(text))) {
    return text;
  }

  // If target language is EN and text is ASCII without Turkish characters
  if (targetLang === "en" && !/[ığüşöçİĞÜŞÖÇ]/.test(text)) {
    return text;
  }

  const cacheKey = `${targetLang}:${text}`;
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLang }),
    });

    if (res.ok) {
      const data = (await res.json()) as { translatedText?: string };
      if (data?.translatedText && data.translatedText.trim().length > 0) {
        clientCache.set(cacheKey, data.translatedText);
        return data.translatedText;
      }
    }
  } catch {
    // ignore
  }

  // Dictionary fallback replacement if API translation fails
  let translated = text;
  const dict = DICT[targetLang];
  if (dict) {
    for (const [key, val] of Object.entries(dict)) {
      const regex = new RegExp(`\\b${key}\\b`, "gi");
      translated = translated.replace(regex, val);
    }
  }

  clientCache.set(cacheKey, translated);
  return translated;
}
