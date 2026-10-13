import { addSyncQueueItem, getSyncQueue, markSyncQueueItemDone } from "@/lib/offline/idb-schema";

export function isClientOnline(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }

  return navigator.onLine;
}

export async function queueOfflineSync(payload: Record<string, unknown>): Promise<void> {
  await addSyncQueueItem(payload);
}

export async function syncPendingQueue(): Promise<void> {
  if (!isClientOnline()) {
    return;
  }

  const queue = await getSyncQueue();

  for (const item of queue) {
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item.payload),
      });

      if (!response.ok) {
        throw new Error(`Sync failed with status ${response.status}`);
      }

      await markSyncQueueItemDone(item.id);
    } catch (error) {
      console.error("Queued sync failed:", error);
      break;
    }
  }
}

export function registerSyncManager(): void {
  if (typeof window === "undefined") {
    return;
  }

  const handleOnline = () => {
    void syncPendingQueue();
  };

  window.addEventListener("online", handleOnline);

  if (navigator.onLine) {
    void syncPendingQueue();
  }
}
