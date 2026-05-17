import { getPosts } from "@/lib/posts";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const posts = await getPosts();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

  const items = posts
    .map((post) => {
      const path = post.type === "fragment" ? `/fragments/${post.slug}` : `/writing/${post.slug}`;
      return `<item>
        <title>${escapeXml(post.title)}</title>
        <link>${baseUrl}${path}</link>
        <guid>${baseUrl}${path}</guid>
        <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
        <description>${escapeXml(post.excerpt)}</description>
      </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0">
    <channel>
      <title>The Archive</title>
      <link>${baseUrl}</link>
      <description>A slow publishing system for essays and fragments.</description>
      ${items}
    </channel>
  </rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8"
    }
  });
}
