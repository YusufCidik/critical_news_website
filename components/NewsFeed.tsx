import { NewsArticleCard } from "@/components/NewsArticleCard";
import { uniqueNews } from "@/lib/news/unique";
import type { NewsItem } from "@/lib/store/news-store";
import type { SupportedLanguage } from "@/lib/store/language-store";
export function NewsFeed({ stories, language, category }: { stories: NewsItem[]; language: SupportedLanguage; category?: string }) {
  return <div data-news-feed className="grid items-start gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
    {uniqueNews(stories, false).map((story) => <NewsArticleCard key={story.id} story={story} language={language} category={category} />)}
  </div>;
}

