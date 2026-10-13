"use client";

import { useEffect, useState } from "react";

interface MarketRate {
  symbol: string;
  value: number;
  change: number | null;
  direction: "up" | "down" | "flat";
}

interface MarketPayload {
  base: string;
  date?: string;
  rates: MarketRate[];
  source: string;
}

const SYMBOL_LABELS: Record<string, string> = {
  EUR: "Euro",
  TRY: "Türk lirası",
  GBP: "Sterlin",
  JPY: "Japon yeni",
  CHF: "İsviçre frangı",
  CAD: "Kanada doları",
};

export function MarketTicker() {
  const [payload, setPayload] = useState<MarketPayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const loadMarkets = async () => {
      try {
        const response = await fetch("/api/markets", { cache: "no-store" });
        if (!response.ok) throw new Error("Market request failed");
        const nextPayload = (await response.json()) as MarketPayload;
        if (active) {
          setPayload(nextPayload);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      }
    };

    void loadMarkets();
    const timer = window.setInterval(loadMarkets, 5 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950" aria-label="Güncel döviz kurları">
      <div className="mx-auto max-w-[1440px] px-4 py-3 md:px-8">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-800 dark:text-sky-300">Markets</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">USD bazlı güncel referans kurlar</p>
          </div>
          <span className="text-[10px] text-slate-400">{payload?.source || (error ? "Veri alınamadı" : "Güncelleniyor")}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {(payload?.rates || []).map((rate) => (
            <div key={rate.symbol} className="border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                <span>{rate.symbol}</span>
                <span>{rate.direction === "up" ? "↑" : rate.direction === "down" ? "↓" : "—"}</span>
              </div>
              <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{rate.value.toLocaleString("tr-TR", { maximumFractionDigits: 4 })}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">{SYMBOL_LABELS[rate.symbol]}</div>
            </div>
          ))}
          {!payload && !error && <div className="col-span-full py-2 text-xs text-slate-500">Piyasa verileri yükleniyor...</div>}
          {error && <div className="col-span-full py-2 text-xs text-amber-700 dark:text-amber-300">Piyasa verisi geçici olarak kullanılamıyor.</div>}
        </div>
      </div>
    </section>
  );
}
