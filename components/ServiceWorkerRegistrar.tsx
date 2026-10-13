"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        console.info("Service worker registered.");
      })
      .catch((error) => {
        console.warn("Service worker registration failed:", error);
      });
  }, []);

  return null;
}
