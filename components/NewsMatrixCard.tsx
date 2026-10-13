"use client";

import { useState } from "react";
import { ChevronDown, Sparkles, ArrowUpRight } from "lucide-react";
import type { NewsItem } from "@/lib/store/news-store";

interface NewsMatrixCardProps {
  item: NewsItem;
}

export function NewsMatrixCard({ item }: NewsMatrixCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:border-sky-200 hover:shadow-[0_14px_34px_rgba(14,116,144,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            {item.category}
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{item.translated_title}</h3>
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">{item.source ?? "Reuters"}</p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
        >
          {expanded ? "Collapse" : "Expand"}
          <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Impact</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-semibold text-sky-700">{item.impact_score}</span>
            <span className="text-xs text-slate-500">/ 10</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Narrative</p>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
            <Sparkles className="h-4 w-4 text-violet-500" />
            Multi-axis
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Signal</p>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
            <ArrowUpRight className="h-4 w-4 text-sky-600" />
            {item.source ? "Live" : "Cached"}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-700">{item.executive_summary}</p>

      {expanded && (
        <div className="mt-5 space-y-5 border-t border-slate-200 pt-5">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">Multi-perspective</p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h4 className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-500">Western</h4>
                <p className="text-sm leading-6 text-slate-700">{item.multi_perspective.western_narrative}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h4 className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-500">Eastern</h4>
                <p className="text-sm leading-6 text-slate-700">{item.multi_perspective.eastern_narrative}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h4 className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-500">Synthesis</h4>
                <p className="text-sm leading-6 text-slate-700">{item.multi_perspective.synthesis}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">Butterfly effect</p>
            <div className="space-y-2">
              {item.butterfly_effect.map((impact, index) => (
                <div key={`${impact.timeline}-${index}`} className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="min-w-[90px] rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-center text-[10px] uppercase tracking-[0.12em] text-sky-700">
                    {impact.timeline === "short_term" ? "Short" : "Long"}
                  </div>
                  <p className="text-sm leading-6 text-slate-700">{impact.impact}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
