import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type NewsCategory = "AI" | "Teknoloji" | "Jeopolitik" | "Ekonomi" | "Bilim" | "Spor" | "Kültür" | "Sağlık" | "İklim" | "Savunma" | "Enerji" | "Seyahat" | "Dünya" | "Tech" | "Geopolitics";
export type ButterflyTimeline = "short_term" | "long_term";

export interface MultiPerspective {
  western_narrative: string;
  eastern_narrative: string;
  synthesis: string;
}

export interface ButterflyEffectItem {
  timeline: ButterflyTimeline;
  impact: string;
}

export interface NewsItemRecord {
  id: string;
  original_title: string;
  translated_title: string;
  executive_summary: string;
  impact_score: number;
  category: NewsCategory;
  multi_perspective: MultiPerspective;
  butterfly_effect: ButterflyEffectItem[];
  source?: string;
  source_url?: string;
  image_url?: string | null;
  is_breaking?: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ExecutiveBriefingRecord {
  id: string;
  title: string;
  summary: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface SyncQueueItem {
  id: string;
  payload: Record<string, unknown>;
  created_at: string;
  status: "pending" | "synced";
}

interface IntelMatrixDBSchema extends DBSchema {
  news_items: {
    key: string;
    value: NewsItemRecord;
    indexes: {
      "by-category": NewsCategory;
      "by-published": string;
    };
  };
  executive_briefings: {
    key: string;
    value: ExecutiveBriefingRecord;
  };
  sync_queue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      "by-status": string;
    };
  };
}

export const DB_NAME = "IntelMatrixDB";
export const DB_VERSION = 2;

export async function openIntelMatrixDB(): Promise<IDBPDatabase<IntelMatrixDBSchema>> {
  return openDB<IntelMatrixDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(database, _oldVersion, _newVersion, transaction) {
      if (!database.objectStoreNames.contains("news_items")) {
        const newsStore = database.createObjectStore("news_items", { keyPath: "id" });
        newsStore.createIndex("by-category", "category");
        newsStore.createIndex("by-published", "published_at");
      } else {
        const newsStore = transaction.objectStore("news_items");
        if (newsStore && !newsStore.indexNames.contains("by-category")) {
          newsStore.createIndex("by-category", "category");
        }
        if (newsStore && !newsStore.indexNames.contains("by-published")) {
          newsStore.createIndex("by-published", "published_at");
        }
      }

      if (!database.objectStoreNames.contains("executive_briefings")) {
        database.createObjectStore("executive_briefings", { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains("sync_queue")) {
        const queueStore = database.createObjectStore("sync_queue", { keyPath: "id" });
        queueStore.createIndex("by-status", "status");
      }
    },
  });
}

export async function saveNewsItems(items: NewsItemRecord[]): Promise<void> {
  if (!items.length) return;
  const db = await openIntelMatrixDB();
  const tx = db.transaction("news_items", "readwrite");
  const store = tx.objectStore("news_items");
  await Promise.all(items.map((item) => store.put(item)));
  await tx.done;
}

export async function getAllNewsItems(): Promise<NewsItemRecord[]> {
  const db = await openIntelMatrixDB();
  return db.getAll("news_items");
}

export async function getNewsItemById(id: string): Promise<NewsItemRecord | undefined> {
  const db = await openIntelMatrixDB();
  return db.get("news_items", id);
}

export async function saveExecutiveBriefing(item: ExecutiveBriefingRecord): Promise<void> {
  const db = await openIntelMatrixDB();
  const tx = db.transaction("executive_briefings", "readwrite");
  tx.objectStore("executive_briefings").put(item);
  await tx.done;
}

export async function getExecutiveBriefings(): Promise<ExecutiveBriefingRecord[]> {
  const db = await openIntelMatrixDB();
  return db.getAll("executive_briefings");
}

export async function addSyncQueueItem(payload: Record<string, unknown>): Promise<void> {
  const db = await openIntelMatrixDB();
  const tx = db.transaction("sync_queue", "readwrite");
  tx.objectStore("sync_queue").put({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    payload,
    created_at: new Date().toISOString(),
    status: "pending",
  });
  await tx.done;
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await openIntelMatrixDB();
  const values = await db.getAll("sync_queue");
  return values.filter((item) => item.status === "pending");
}

export async function markSyncQueueItemDone(id: string): Promise<void> {
  const db = await openIntelMatrixDB();
  const tx = db.transaction("sync_queue", "readwrite");
  const store = tx.objectStore("sync_queue");
  const current = await store.get(id);
  if (!current) {
    await tx.done;
    return;
  }
  await store.put({ ...current, status: "synced" });
  await tx.done;
}

export async function clearSyncQueue(): Promise<void> {
  const db = await openIntelMatrixDB();
  const tx = db.transaction("sync_queue", "readwrite");
  tx.objectStore("sync_queue").clear();
  await tx.done;
}
