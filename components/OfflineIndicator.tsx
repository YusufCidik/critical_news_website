"use client";

import { WifiOff } from "lucide-react";

interface OfflineIndicatorProps {
  online: boolean;
}

export function OfflineIndicator({ online }: OfflineIndicatorProps) {
  if (online) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900">
      <WifiOff className="h-4 w-4" />
      Çevrimdışı · kayıtlı haberler
    </div>
  );
}
