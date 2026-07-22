import { getAllBlog } from "@/lib/content";

function escape(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;"); }

export function GET() {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nomu.dev";
  const items = getAllBlog().map(({ metadata }) => `<item><title>${escape(metadata.title)}</title><link>${origin}/blog/${metadata.slug}</link><guid>${origin}/blog/${metadata.slug}</guid><description>${escape(metadata.description)}</description><pubDate>${new Date(`${metadata.publishedAt}T00:00:00Z`).toUTCString()}</pubDate></item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Nomu — Blog</title><link>${origin}/blog</link><description>Thoughts on systems, design, learning, and building in public.</description>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
