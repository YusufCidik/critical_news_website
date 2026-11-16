import { getStory } from "@/lib/news/feed";
import { allowedURL, articleImages, publisherFetch } from "@/lib/news/images";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{40}$/.test(id)) return new Response(null, { status: 404 });
  const story = await getStory(id);
  if (!story) return new Response(null, { status: 404 });
  const candidates = story.image_url && allowedURL(story.image_url, true) ? [story.image_url] : [];
  try { candidates.push(...await articleImages(id, story.source_url)); } catch {}
  for (const url of [...new Set(candidates)]) {
    try {
      const response = await publisherFetch(url, true);
      const type = response.headers.get("content-type")?.split(";")[0] || "";
      if (!/^image\/(jpeg|png|webp|avif|gif)$/.test(type) || Number(response.headers.get("content-length")) > 6000000) continue;
      const reader = response.body?.getReader();
      if (!reader) continue;
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 6000000) { await reader.cancel(); throw new Error("Image too large"); } chunks.push(part.value); }
      return new Response(Buffer.concat(chunks), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600, s-maxage=86400", "X-Content-Type-Options": "nosniff" } });
    } catch {}
  }
  return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
}
