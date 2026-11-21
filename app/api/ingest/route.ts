import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getStories } from "@/lib/news/feed";

export const maxDuration = 60;

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

async function refresh(request: Request) {
  const secret = process.env.CRON_SECRET?.trim().replace(/^Bearer +/i, "");
  const provided = (request.headers.get("authorization") || request.headers.get("x-cron-secret") || "").replace(/^Bearer +/i, "");
  const headers = { "Cache-Control": "no-store" };
  if (!secret) return NextResponse.json({ error: "Scheduled refresh is not configured" }, { status: 503, headers });
  if (!provided || !timingSafeEqual(digest(secret), digest(provided))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  try {
    const snapshot = await getStories(true);
    const observations = snapshot.sourceHealth.reduce((count, source) => count + Number(source.status !== "unavailable"), 0);
    const ok = observations > 0 && snapshot.stories.length > 0;
    return NextResponse.json({ ok, count: snapshot.stories.length, observedFeeds: observations, generatedAt: snapshot.updatedAt }, { status: ok ? 200 : 502, headers });
  } catch {
    return NextResponse.json({ error: "Feed refresh failed" }, { status: 502, headers });
  }
}

export const GET = refresh;
export const POST = refresh;
