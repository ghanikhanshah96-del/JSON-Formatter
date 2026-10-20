import { siteConfig, siteOrigin } from "@codeformattools/seo";
import { getPublishedBlogPosts } from "@/lib/blog-repository";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const blogPosts = (await getPublishedBlogPosts()).filter(post => !post.noindex);
  const origin = siteOrigin();
  const blogUrl = `${origin}/blog`;
  const latestDate = blogPosts[0]?.dateModified ?? "2026-10-20";
  const items = blogPosts.map(post => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${origin}/blog/${post.slug}</link>
      <guid isPermaLink="true">${origin}/blog/${post.slug}</guid>
      <description>${escapeXml(post.description)}</description>
      <category>${escapeXml(post.category)}</category>
      <pubDate>${new Date(`${post.datePublished}T00:00:00Z`).toUTCString()}</pubDate>
    </item>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(`${siteConfig.name} JSON Guides and Tutorials`)}</title>
    <link>${blogUrl}</link>
    <description>Practical guides for creating, viewing, sorting, validating, and formatting structured data.</description>
    <language>en</language>
    <lastBuildDate>${new Date(`${latestDate}T00:00:00Z`).toUTCString()}</lastBuildDate>
    <generator>${escapeXml(siteConfig.name)}</generator>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"
    }
  });
}
