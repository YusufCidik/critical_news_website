import type { Metadata } from "next";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

export const metadata: Metadata = {
  title: "IntelMatrix",
  description: "Enterprise-grade offline-first intelligence platform for geopolitics, AI, and technology.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className="bg-[#f6f6f4] text-slate-900 antialiased">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
