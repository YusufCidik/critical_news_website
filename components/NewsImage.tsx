/* eslint-disable @next/next/no-img-element -- Publisher RSS images use arbitrary hosts and a native error fallback. */
"use client";

import { useState } from "react";

export function NewsImage({ src, eager = false }: { src?: string | null; eager?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const usable = src && failedSrc !== src;
  return (
    <div className="relative h-full w-full bg-[linear-gradient(135deg,#dce8ef,#f1f4f6_55%,#d7e0e6)]">
      <div className="absolute inset-0 flex items-center justify-center p-3" role={usable ? undefined : "img"} aria-label={usable ? undefined : "IntelMatrix"}>
        <span className="font-serif text-sm font-bold tracking-widest text-slate-500">INTELMATRIX</span>
      </div>
      {usable && <img src={src} alt="" loading={eager ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" className="relative h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" onError={() => setFailedSrc(src)} />}
    </div>
  );
}
