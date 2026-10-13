"use client";

import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/store/news-store";
import { useLanguageStore } from "@/lib/store/language-store";
import { useBookmarkStore } from "@/lib/store/bookmark-store";
import { useThemeStore } from "@/lib/store/theme-store";
import { UI_TRANSLATIONS, CATEGORY_NAMES } from "@/lib/i18n/translations";
import { translateText } from "@/lib/i18n/translator";

const CAT_IMAGES: Record<string, string[]> = {
  Jeopolitik: [
    "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&q=85&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&q=85&auto=format&fit=crop",
  ],
  AI: [
    "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&q=85&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&q=85&auto=format&fit=crop",
  ],
  Teknoloji: [
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=85&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1518186285879-c8e6d9f5a43f?w=1200&q=85&auto=format&fit=crop",
  ],
  Ekonomi: [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=85&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=85&auto=format&fit=crop",
  ],
  Kripto: [
    "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=1200&q=85&auto=format&fit=crop",
  ],
  Bilim: [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=85&auto=format&fit=crop",
  ],
  Sağlık: [
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&q=85&auto=format&fit=crop",
  ],
  Savunma: [
    "https://images.unsplash.com/photo-1578496781197-b85385c84a83?w=1200&q=85&auto=format&fit=crop",
  ],
  Uzay: [
    "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&q=85&auto=format&fit=crop",
  ],
  Enerji: [
    "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1200&q=85&auto=format&fit=crop",
  ],
  Çevre: [
    "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=1200&q=85&auto=format&fit=crop",
  ],
  Spor: [
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&q=85&auto=format&fit=crop",
  ],
  Kültür: [
    "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1200&q=85&auto=format&fit=crop",
  ],
  Dünya: [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=85&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=85&auto=format&fit=crop",
  ],
};

function getFallbackImage(story: NewsItem): string {
  const pool = CAT_IMAGES[story.category] ?? CAT_IMAGES.Dünya;
  const hash = story.id ? story.id.charCodeAt(0) + story.id.charCodeAt(story.id.length - 1) : 0;
  return pool[hash % pool.length];
}

interface NewsDetailModalProps {
  story: NewsItem | null;
  onClose: () => void;
}

export function NewsDetailModal({ story, onClose }: NewsDetailModalProps) {
  const { language } = useLanguageStore();
  const { theme } = useThemeStore();
  const t = UI_TRANSLATIONS[language];
  const { toggleBookmark, isBookmarked } = useBookmarkStore();

  const [titleText, setTitleText] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>("");

  const bookmarked = story ? isBookmarked(story.id) : false;
  const isDark = theme === "dark";

  useEffect(() => {
    if (!story) return;
    let active = true;

    queueMicrotask(() => {
      if (!active) return;
      setImageSrc(story.image_url || getFallbackImage(story));
      setTitleText(story.original_title);
      setSummaryText(story.executive_summary);
    });

    const translate = async () => {
      const translatedTitle = await translateText(story.original_title, language);
      if (active) setTitleText(translatedTitle);

      const translatedSummary = await translateText(story.executive_summary, language);
      if (active) setSummaryText(translatedSummary);
    };

    void translate();

    return () => {
      active = false;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [story, language]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!story) return null;

  const catName = CATEGORY_NAMES[story.category]?.[language] ?? story.category;
  const score = story.impact_score ?? 5;

  const handleToggleAudio = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();
    const textToSpeak = `${titleText || story.original_title}. ${summaryText || story.executive_summary}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    const langCodeMap: Record<string, string> = { tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR", es: "es-ES" };
    utterance.lang = langCodeMap[language] || "tr-TR";

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
  };

  const handleExportReport = () => {
    const reportContent = `
=================================================================
INTELMATRIX — EXECUTIVE NEWS BRIEFING REPORT
=================================================================
TITLE: ${titleText || story.original_title}
SOURCE: ${story.source || "Unknown"}
CATEGORY: ${catName}
IMPACT SCORE: ${score}/10
PUBLISHED: ${story.published_at || new Date().toISOString()}
URL: ${story.source_url || "#"}

EXECUTIVE SUMMARY:
${summaryText || story.executive_summary}

MULTI-PERSPECTIVE ANALYTICS:
- Western Narrative: ${story.multi_perspective?.western_narrative || "Analysis pending."}
- Eastern Narrative: ${story.multi_perspective?.eastern_narrative || "Analysis pending."}
- Executive Synthesis: ${story.multi_perspective?.synthesis || "Balanced synthesis aligned with official records."}

BUTTERFLY EFFECT FORECAST:
- Short-term (1-3M): ${story.butterfly_effect?.[0]?.impact || "High volatility expected across affected sectors."}
- Long-term (1-3Y): ${story.butterfly_effect?.[1]?.impact || "Potential structural policy and market shifts."}

=================================================================
Generated by IntelMatrix Global News Intelligence v4.1
=================================================================
`.trim();

    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `IntelMatrix_Report_${story.id.slice(0, 8)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Colors
  const modalBg = isDark ? "#0f172a" : "#ffffff";
  const modalBorder = isDark ? "#1e293b" : "#e5e7eb";
  const toolbarBg = isDark ? "rgba(10,15,26,0.7)" : "#f8fafc";
  const toolbarBorder = isDark ? "#1e293b" : "#f1f5f9";
  const sectionBg = isDark ? "rgba(15,23,42,0.5)" : "#f8fafc";
  const sectionBorder = isDark ? "#1e293b" : "#e5e7eb";
  const cardBg = isDark ? "rgba(30,41,59,0.6)" : "#ffffff";
  const bodyText = isDark ? "#e2e8f0" : "#1e293b";
  const mutedText = isDark ? "#94a3b8" : "#64748b";

  const btnBase = `flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold transition border`;
  const btnDefault = isDark
    ? `${btnBase} bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700`
    : `${btnBase} bg-white border-slate-300 text-slate-700 hover:bg-slate-100`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto"
      style={{ animation: "animate-fade-in 0.2s ease" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl my-4 rounded-lg shadow-2xl border overflow-hidden"
        style={{
          backgroundColor: modalBg,
          borderColor: modalBorder,
          color: bodyText,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
            onClose();
          }}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Cover Image — Always displayed */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950">
          <img
            src={imageSrc}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            onError={() => {
              const fallback = getFallbackImage(story);
              if (imageSrc !== fallback) setImageSrc(fallback);
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-12 text-white">
            <span className="inline-block rounded-full bg-red-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
              {catName}
            </span>
            {story.is_breaking && (
              <span className="ml-2 inline-block rounded-full bg-orange-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                ● SON DAKİKA
              </span>
            )}
            <h1 className="mt-2 font-serif text-2xl font-bold leading-tight md:text-3xl drop-shadow-lg">
              {titleText || story.original_title}
            </h1>
          </div>
        </div>

        {/* Modal Action Toolbar */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3 text-xs"
          style={{ backgroundColor: toolbarBg, borderColor: toolbarBorder }}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold" style={{ color: bodyText }}>{story.source}</span>
            <span style={{ color: mutedText }}>•</span>
            <span style={{ color: mutedText }}>{score}/10 {t.impactMeter}</span>
            {story.published_at && (
              <>
                <span style={{ color: mutedText }}>•</span>
                <span style={{ color: mutedText }}>
                  {new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(story.published_at))}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Audio Reader Button */}
            <button
              type="button"
              onClick={handleToggleAudio}
              className={
                isPlayingAudio
                  ? "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold transition border bg-red-600 border-red-700 text-white"
                  : btnDefault
              }
            >
              <span>{isPlayingAudio ? "⏹ Durdur" : "🎙️ Sesli Dinle"}</span>
            </button>

            {/* Bookmark Button */}
            <button
              type="button"
              onClick={() => toggleBookmark(story)}
              className={
                bookmarked
                  ? "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold transition border bg-amber-500/20 border-amber-500/40 text-amber-400"
                  : btnDefault
              }
            >
              <span>{bookmarked ? "📌 Kaydedildi" : "🔖 Kaydet"}</span>
            </button>

            {/* Export Report */}
            <button type="button" onClick={handleExportReport} className={btnDefault}>
              <span>📄 Rapor İndir</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Executive Summary */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: mutedText }}>Haber Özeti</h3>
            <p className="text-base leading-relaxed font-serif" style={{ color: bodyText }}>
              {summaryText || story.executive_summary}
            </p>
          </div>

          {/* Impact Score Visual */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: mutedText }}>{t.impactMeter}</span>
                <span className="text-[10px] font-black tabular-nums" style={{ color: bodyText }}>{score}/10</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? "#1e293b" : "#f1f5f9" }}>
                <div
                  className={`h-full rounded-full impact-bar bg-gradient-to-r ${
                    score >= 8 ? "from-red-500 to-red-700" : score >= 5 ? "from-amber-400 to-orange-500" : "from-emerald-400 to-teal-500"
                  }`}
                  style={{ width: `${score * 10}%` }}
                />
              </div>
            </div>
          </div>

          {/* Multi-Perspective Section */}
          <div className="rounded-lg border p-4 space-y-3" style={{ backgroundColor: sectionBg, borderColor: sectionBorder }}>
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: bodyText }}>
              <span>🌐</span> Çoklu Perspektif &amp; Medya Analizi
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded p-3 border" style={{ backgroundColor: cardBg, borderColor: sectionBorder }}>
                <p className="font-bold text-blue-400 mb-1">Batı Medyası Yaklaşımı</p>
                <p className="leading-normal" style={{ color: mutedText }}>
                  {story.multi_perspective?.western_narrative || "Stratejik müttefikler ve küresel piyasa dengeleri açısından ele alınıyor."}
                </p>
              </div>
              <div className="rounded p-3 border" style={{ backgroundColor: cardBg, borderColor: sectionBorder }}>
                <p className="font-bold text-red-400 mb-1">Doğu / Bölgesel Medya Yaklaşımı</p>
                <p className="leading-normal" style={{ color: mutedText }}>
                  {story.multi_perspective?.eastern_narrative || "Bölgesel egemenlik ve yerel ekonomik etkiler ön plana çıkarılıyor."}
                </p>
              </div>
            </div>
          </div>

          {/* Butterfly Effect Section */}
          <div
            className="rounded-lg border p-4 space-y-3"
            style={{
              backgroundColor: isDark ? "rgba(217,119,6,0.05)" : "rgba(255,251,235,0.8)",
              borderColor: isDark ? "rgba(217,119,6,0.2)" : "#fde68a",
            }}
          >
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-2">
              <span>🦋</span> Kelebek Etkisi &amp; Gelecek Senaryoları
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div
                className="rounded p-3 border"
                style={{ backgroundColor: cardBg, borderColor: isDark ? "#1e293b" : "#fde68a" }}
              >
                <p className="font-bold text-amber-400 mb-1">Kısa Vadeli Etki (1-3 Ay)</p>
                <p className="leading-normal" style={{ color: mutedText }}>
                  {story.butterfly_effect?.[0]?.impact || "Sektörel fiyatlamalarda dalgalanma ve tedarik zinciri düzenlemeleri öngörülüyor."}
                </p>
              </div>
              <div
                className="rounded p-3 border"
                style={{ backgroundColor: cardBg, borderColor: isDark ? "#1e293b" : "#fde68a" }}
              >
                <p className="font-bold text-amber-400 mb-1">Uzun Vadeli Etki (1-3 Yıl)</p>
                <p className="leading-normal" style={{ color: mutedText }}>
                  {story.butterfly_effect?.[1]?.impact || "Yeni yasal düzenlemeler ve uluslararası anlaşma revizyonları tetiklenebilir."}
                </p>
              </div>
            </div>
          </div>

          {/* Direct Source Link Button */}
          <div
            className="pt-4 border-t flex items-center justify-between"
            style={{ borderColor: isDark ? "#1e293b" : "#f1f5f9" }}
          >
            <span className="text-xs" style={{ color: mutedText }}>Orijinal haber kaynağına erişmek için:</span>
            <a
              href={story.source_url || "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded bg-sky-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-sky-500 transition-colors"
            >
              <span>{t.goToSource}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
