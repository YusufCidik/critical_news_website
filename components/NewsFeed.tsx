import { NewsArticleCard } from "@/components/NewsArticleCard";
import { uniqueNews } from "@/lib/news/unique";
import type { NewsItem } from "@/lib/store/news-store";
import type { SupportedLanguage } from "@/lib/store/language-store";
export function NewsFeed({ stories, language }: { stories: NewsItem[]; language: SupportedLanguage }) {
  return <div data-news-feed className="grid items-start gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
    {uniqueNews(stories).map((story) => <NewsArticleCard key={story.id} story={story} language={language} />)}
  </div>;
}

