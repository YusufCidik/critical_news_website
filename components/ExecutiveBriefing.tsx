"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { NewsItem } from "@/lib/store/news-store";

interface ExecutiveBriefingProps {
  briefing: NewsItem | null;
}

export function ExecutiveBriefing({ briefing }: ExecutiveBriefingProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleToggleSpeech = async () => {
    if (!briefing) return;

    if (isSpeaking) {
      stopAudio();
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: briefing.executive_summary }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
        };
        audio.onplay = () => setIsSpeaking(true);
        audio.onpause = () => setIsSpeaking(false);
        await audio.play();
        return;
      }
    } catch (error) {
      console.warn("ElevenLabs TTS unavailable, using browser fallback:", error);
    } finally {
      setIsLoading(false);
    }

    if (!("speechSynthesis" in window)) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(briefing.executive_summary);
    utterance.lang = "tr-TR";
    utterance.rate = 0.96;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  if (!briefing) {
    return null;
  }

  return (
    <section className="overflow-hidden border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="grid gap-0 md:grid-cols-[1.5fr_0.8fr]">
        <div className="p-6 md:p-8">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-800">Sesli haber özeti</p>
              <h2 className="mt-3 max-w-2xl font-serif text-2xl font-bold text-slate-950 md:text-4xl">{briefing.translated_title}</h2>
            </div>
            <button
              type="button"
              onClick={handleToggleSpeech}
              disabled={isLoading}
              className="inline-flex items-center gap-2 border border-sky-800 bg-white px-4 py-2.5 text-sm font-semibold text-sky-900 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {isLoading ? "Hazırlanıyor" : isSpeaking ? "Durdur" : "Dinle"}
            </button>
          </div>

          <p className="max-w-3xl text-base leading-8 text-slate-700 md:text-lg">{briefing.executive_summary}</p>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 p-6 md:border-l md:border-t-0">
          <div className="mb-4 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <span>Etki puanı</span>
            <span>{briefing.impact_score}/10</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600"
              style={{ width: `${briefing.impact_score * 10}%` }}
            />
          </div>

          <div className="mt-6 space-y-4 text-sm text-slate-700">
            <div className="flex items-center justify-between border border-slate-200 bg-white px-3 py-2.5">
              <span>Kategori</span>
              <span className="border border-sky-200 bg-sky-50 px-2 py-1 text-sky-800">
                {briefing.category}
              </span>
            </div>
            <div className="flex items-center justify-between border border-slate-200 bg-white px-3 py-2.5">
              <span>Yayıncı</span>
              <span>{briefing.source || "Kayıtlı haber"}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
