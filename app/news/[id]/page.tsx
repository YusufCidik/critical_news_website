import { notFound } from "next/navigation";
import { getStory } from "@/lib/news/feed";
import { NewsDetail } from "@/components/NewsDetail";
export const dynamic = "force-dynamic";
export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{40}$/.test(id)) notFound();
  const story = await getStory(id);
  return <NewsDetail key={id} id={id} initialStory={story} />;
}

