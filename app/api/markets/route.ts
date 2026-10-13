import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SYMBOLS = ["EUR", "TRY", "GBP", "JPY", "CHF", "CAD"];

export async function GET() {
  try {
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=USD&to=${SYMBOLS.join(",")}`,
      { next: { revalidate: 300 } }
    );

    if (!response.ok) {
      throw new Error(`Market data failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { amount?: number; base?: string; date?: string; rates?: Record<string, number> };
    const rates = Object.entries(payload.rates || {}).map(([symbol, value]) => ({
      symbol,
      value,
      change: null,
      direction: "flat" as const,
    }));

    return NextResponse.json({ base: payload.base || "USD", date: payload.date, rates, source: "Frankfurter / ECB" });
  } catch (error) {
    console.error("Market data request failed:", error);
    return NextResponse.json({ error: "Piyasa verisi şu anda alınamıyor." }, { status: 502 });
  }
}
