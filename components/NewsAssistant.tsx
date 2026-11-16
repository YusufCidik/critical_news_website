"use client";

import { ui } from "@/lib/i18n/interface-labels";
import Link from "next/link";
import { useLanguageStore } from "@/lib/store/language-store";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, X } from "lucide-react";
import type { NewsItem } from "@/lib/store/news-store";

interface NewsAssistantProps {
  articles: NewsItem[];
}

interface Message {
  role: "user" | "assistant";
  text: string;
  degraded?: boolean;
  references?: Array<{ id: string; title: string; number: number }>;
}

export function NewsAssistant({ articles }: NewsAssistantProps) {
  const { language } = useLanguageStore();
  const endRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, loading, open]);

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
          language,
          history: messages.slice(-6),
          articles: articles.map((article) => ({
            id: article.id,
            title: article.translated_title,
            summary: article.executive_summary,
            source: article.source,
            published_at: article.published_at,
            impact_score: article.impact_score,
            category: article.category,
          })),
        }),
        signal: AbortSignal.timeout(35000),
      });
      const payload = (await response.json()) as { answer?: string; error?: string; degraded?: boolean; references?: Message["references"] };
      setMessages((current) => [...current, { role: "assistant", text: payload.answer || payload.error || ui(language, "assistantError"), degraded: payload.degraded, references: payload.references }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", text: ui(language, "assistantError") }]);
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
        <aside className="fixed bottom-5 right-5 z-40 flex h-[min(620px,calc(100dvh-40px))] w-[min(420px,calc(100vw-32px))] flex-col border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950" aria-label="IntelMatrix AI haber asistanı">
          <header className="flex items-center justify-between border-b border-slate-200 bg-sky-950 px-4 py-3 text-white dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <p className="text-sm font-bold">IntelMatrix AI</p>
                <p className="text-[10px] text-sky-200">{ui(language, "assistantContext")}</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={ui(language, "assistantClose")} className="p-1 text-sky-200 hover:text-white"><X className="h-5 w-5" /></button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4" role="log" aria-live="polite">
            <p className="text-sm leading-6 text-slate-700">{ui(language, "assistantIntro")}</p>
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`max-w-[95%] whitespace-pre-wrap break-words px-3 py-2 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-100" : "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200"}`}>
                {message.text}
                {message.references && <div className="mt-3 flex flex-col gap-2">{message.references.filter((reference) => /^[a-f0-9]{40}$/.test(reference.id)).map((reference) => <Link prefetch={false} key={reference.number} href={`/news/${reference.id}`} className="text-xs font-semibold text-sky-700 underline">[{reference.number}] {reference.title}</Link>)}</div>}
              </div>
            ))}
            {loading && <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> {ui(language, "assistantLoading")}</div>}
            <div ref={endRef} />
          </div>

          <form onSubmit={askAssistant} className="border-t border-slate-200 p-3 dark:border-slate-800">
            <div className="flex gap-2">
              <input aria-label={ui(language, "assistantQuestion")} maxLength={2000} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={ui(language, "assistantQuestion")} className="min-w-0 flex-1 border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
              <button type="submit" disabled={loading || !question.trim() || !articles.length} aria-label={ui(language, "assistantSend")} className="inline-flex items-center justify-center bg-sky-800 px-3 text-white disabled:opacity-50"><Send className="h-4 w-4" /></button>
            </div>
          </form>
        </aside>
      )}
    </>
  );
}
