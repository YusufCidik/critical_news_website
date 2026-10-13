import { create } from "zustand";

export interface MultiPerspective {
  western_narrative: string;
  eastern_narrative: string;
  synthesis: string;
}

export interface ButterflyEffectItem {
  timeline: "short_term" | "long_term";
  impact: string;
}

export interface NewsItem {
  id: string;
  original_title: string;
  translated_title: string;
  executive_summary: string;
  impact_score: number;
  category: "AI" | "Teknoloji" | "Jeopolitik" | "Ekonomi" | "Bilim" | "Spor" | "Kültür" | "Sağlık" | "İklim" | "Savunma" | "Enerji" | "Seyahat" | "Dünya" | "Tech" | "Geopolitics";
  multi_perspective: MultiPerspective;
  butterfly_effect: ButterflyEffectItem[];
  source?: string;
  source_url?: string;
  image_url?: string | null;
  is_breaking?: boolean;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface NewsState {
  items: NewsItem[];
  activeItem: NewsItem | null;
  loading: boolean;
  error: string | null;
  setItems: (items: NewsItem[]) => void;
  setActiveItem: (item: NewsItem | null) => void;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
}

export const useNewsStore = create<NewsState>((set) => ({
  items: [],
  activeItem: null,
  loading: true,
  error: null,
  setItems: (items) => set({ items }),
  setActiveItem: (item) => set({ activeItem: item }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
