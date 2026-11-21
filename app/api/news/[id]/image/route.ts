import { getStory } from "@/lib/news/feed";
import { allowedURL, articleImages, publisherFetch } from "@/lib/news/images";
import { readResponseBytes } from "@/lib/http/response";

export const dynamic = "force-dynamic";

async function fetchImage(url: string) {
  try {
    const response = await publisherFetch(url, true);
    const type = response.headers.get("content-type")?.split(";")[0] || "";
    if (!/^image\/(jpeg|png|webp|avif|gif)$/.test(type)) {
      await response.body?.cancel();
      return null;
    }
    const body = await readResponseBytes(response, 6_000_000);
    return new Response(body, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600, s-maxage=86400", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return null;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{40}$/.test(id)) return new Response(null, { status: 404 });
  const story = await getStory(id);
  if (!story) return new Response(null, { status: 404 });
  if (story.image_url && allowedURL(story.image_url, true)) {
    const image = await fetchImage(story.image_url);
    if (image) return image;
  }
  try {
    const candidates = await articleImages(story.id, story.source_url);
    for (const url of candidates.filter((url) => url !== story.image_url).slice(0, 2)) {
      const image = await fetchImage(url);
      if (image) return image;
    }
  } catch { /* A missing image uses the existing card placeholder. */ }
  return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
}
