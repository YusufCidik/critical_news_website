/* eslint-disable @next/next/no-img-element -- RSS images support native loading and publisher recovery. */
"use client";
import { useState } from "react";
export function NewsImage({ src, id, eager = false }: { src?: string | null; id?: string; eager?: boolean }) {
  const [failed, setFailed] = useState<string[]>([]);
  const recovery = id ? `/api/news/${id}/image` : null;
  const current = [src, recovery].find((url): url is string => Boolean(url) && !failed.includes(url!));
  return <div className="news-image relative h-full w-full bg-[linear-gradient(135deg,#dce8ef,#f1f4f6_55%,#d7e0e6)]">
    <div className="absolute inset-0 flex items-center justify-center p-3" role={current ? undefined : "img"} aria-label={current ? undefined : "IntelMatrix"}>
      <span className="font-serif text-sm font-bold tracking-widest text-slate-500">INTELMATRIX</span>
    </div>
    {current && <img key={current} src={current} alt="" loading={eager ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" className="relative h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" onError={() => setFailed((values) => [...values, current])} />}
  </div>;
}
