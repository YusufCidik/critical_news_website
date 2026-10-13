import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import Parser from "rss-parser";
import { generateIntelBriefing, type IntelCategory } from "@/lib/ai/gemini-service";

const FEEDS = [
  "https://feeds.feedburner.com/ndtvprofit-latest",
  "https://www.reutersagency.com/feed/?best-topics=tech&post_type=best",
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://techcrunch.com/feed/",
  "https://www.theverge.com/rss/index.xml",
  "https://www.aljazeera.com/xml/rss/all.xml",
];

const SAFE_SECRET = process.env.CRON_SECRET || "intelmatrix-local-secret";

async function saveIntelMatrixData(items: Array<Record<string, unknown>>) {
  const dataDir = path.join(process.cwd(), "data");
  await fs.mkdir(dataDir, { recursive: true });
  const filePath = path.join(dataDir, "intel-matrix.json");
  await fs.writeFile(filePath, JSON.stringify(items, null, 2), "utf-8");
}

function inferCategory(title: string): IntelCategory {
  if (/ai|llm|chip|model|gpu|robot|automation/i.test(title)) return "AI";
  if (/geopolitic|war|security|diplomacy|sanction|trade|policy|election/i.test(title)) return "Geopolitics";
  return "Tech";
}

async function fetchAndEnrichFeeds() {
  const parser = new Parser();
  const entries: Array<Record<string, unknown>> = [];

  for (const feedUrl of FEEDS) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const items = feed.items ?? [];
      const sourceName = feed.title || feedUrl.split("//")[1]?.split("/")[0] || "Newswire";

      for (const item of items.slice(0, 6)) {
        const title = item.title || "Global intelligence signal";
        const raw = [item.title, item.summary, item.content, item.link].filter(Boolean).join("\n");
        const category = inferCategory(title);
        const structured = await generateIntelBriefing(raw, title);

        entries.push({
          ...structured,
          source: sourceName,
          category,
          published_at: item.isoDate || new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(`Feed ingest failed for ${feedUrl}:`, error);
    }
  }

  return entries;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("x-cron-secret");
  const expected = SAFE_SECRET.startsWith("Bearer ") ? SAFE_SECRET : `Bearer ${SAFE_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await fetchAndEnrichFeeds();
    await saveIntelMatrixData(items);
    return NextResponse.json({ ok: true, count: items.length, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Ingestion failed:", error);
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, string>;
    const providedSecret = body.secret || request.headers.get("x-cron-secret") || request.headers.get("authorization");

    if (!providedSecret || providedSecret !== SAFE_SECRET && providedSecret !== `Bearer ${SAFE_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await fetchAndEnrichFeeds();
    await saveIntelMatrixData(items);
    return NextResponse.json({ ok: true, count: items.length });
  } catch (error) {
    console.error("Post ingest failed:", error);
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}
