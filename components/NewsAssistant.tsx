"use client";

import { FormEvent, useState } from "react";
import { Bot, Loader2, Send, X } from "lucide-react";
import type { NewsItem } from "@/lib/store/news-store";

interface NewsAssistantProps {
  articles: NewsItem[];
}

interface Message {
  role: "user" | "assistant";
  text: string;
}

export function NewsAssistant({ articles }: NewsAssistantProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Merhaba. Açık olan haber akışını analiz edebilirim. Örneğin: Bu akıştaki en kritik üç gelişme nedir?" },
  ]);

  const askAssistant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuestion = question.trim();
    if (!nextQuestion || loading) return;

    setQuestion("");
    setMessages((current) => [...current, { role: "user", text: nextQuestion }]);
    setLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: nextQuestion,
          articles: articles.map((article) => ({
            title: article.translated_title,
            summary: article.executive_summary,
            source: article.source,
            published_at: article.published_at,
            impact_score: article.impact_score,
            category: article.category,
          })),
        }),
      });
      const payload = (await response.json()) as { answer?: string; error?: string };
      setMessages((current) => [...current, { role: "assistant", text: payload.answer || payload.error || "Yanıt alınamadı." }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", text: "Bağlantı kurulamadı. Lütfen tekrar deneyin." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 border border-sky-800 bg-sky-900 px-4 py-3 text-sm font-bold text-white shadow-xl transition hover:bg-sky-700">
          <Bot className="h-5 w-5" />
          News AI
        </button>
      )}

      {open && (
        <aside className="fixed bottom-5 right-5 z-40 flex h-[min(620px,calc(100vh-40px))] w-[min(420px,calc(100vw-32px))] flex-col border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950" aria-label="IntelMatrix AI haber asistanı">
          <header className="flex items-center justify-between border-b border-slate-200 bg-sky-950 px-4 py-3 text-white dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <p className="text-sm font-bold">IntelMatrix AI</p>
                <p className="text-[10px] text-sky-200">Açık haber akışından analiz</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Asistanı kapat" className="p-1 text-sky-200 hover:text-white"><X className="h-5 w-5" /></button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`max-w-[90%] px-3 py-2 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-100" : "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200"}`}>
                {message.text}
              </div>
            ))}
            {loading && <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Haberler analiz ediliyor...</div>}
          </div>

          <form onSubmit={askAssistant} className="border-t border-slate-200 p-3 dark:border-slate-800">
            <div className="flex gap-2">
              <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Haberler hakkında soru sorun" className="min-w-0 flex-1 border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
              <button type="submit" disabled={loading || !question.trim()} aria-label="Soruyu gönder" className="inline-flex items-center justify-center bg-sky-800 px-3 text-white disabled:opacity-50"><Send className="h-4 w-4" /></button>
            </div>
          </form>
        </aside>
      )}
    </>
  );
}
