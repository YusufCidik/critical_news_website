import { create } from "zustand";
import type { NewsItem } from "@/lib/store/news-store";

interface BookmarkState {
  bookmarks: NewsItem[];
  isBookmarked: (id: string) => boolean;
  toggleBookmark: (story: NewsItem) => void;
  hydrateBookmarks: () => void;
  clearBookmarks: () => void;
}

const STORAGE_KEY = "intelmatrix_bookmarks";

function loadBookmarks(): NewsItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((item): item is NewsItem => item && typeof item.id === "string" && typeof item.original_title === "string");
    }
  } catch {
    // ignore
  }
  return [];
}

function saveBookmarks(bookmarks: NewsItem[]): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    }
  } catch {
    // ignore
  }
}

let hydrated = false;

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  hydrateBookmarks: () => {
    if (hydrated || typeof window === "undefined") return;
    hydrated = true;
    set({ bookmarks: loadBookmarks() });
  },

  isBookmarked: (id: string) => {
    return get().bookmarks.some((b) => b.id === id);
  },

  toggleBookmark: (story: NewsItem) => {
    get().hydrateBookmarks();
    const current = get().bookmarks;
    const exists = current.some((b) => b.id === story.id);
    const updated = exists
      ? current.filter((b) => b.id !== story.id)
      : [story, ...current];
    saveBookmarks(updated);
    set({ bookmarks: updated });
  },

  clearBookmarks: () => {
    get().hydrateBookmarks();
    saveBookmarks([]);
    set({ bookmarks: [] });
  },
}));
