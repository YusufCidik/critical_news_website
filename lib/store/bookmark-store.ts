import { create } from "zustand";
import type { NewsItem } from "@/lib/store/news-store";

interface BookmarkState {
  bookmarks: NewsItem[];
  isBookmarked: (id: string) => boolean;
  toggleBookmark: (story: NewsItem) => void;
  clearBookmarks: () => void;
}

const STORAGE_KEY = "intelmatrix_bookmarks";

function loadBookmarks(): NewsItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as NewsItem[];
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

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: loadBookmarks(),

  isBookmarked: (id: string) => {
    return get().bookmarks.some((b) => b.id === id);
  },

  toggleBookmark: (story: NewsItem) => {
    const current = get().bookmarks;
    const exists = current.some((b) => b.id === story.id);
    const updated = exists
      ? current.filter((b) => b.id !== story.id)
      : [story, ...current];
    saveBookmarks(updated);
    set({ bookmarks: updated });
  },

  clearBookmarks: () => {
    saveBookmarks([]);
    set({ bookmarks: [] });
  },
}));
