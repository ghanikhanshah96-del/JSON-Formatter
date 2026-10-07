import type { MetadataRoute } from "next";
import { categories, tools } from "@codeformattools/tool-registry";
import { siteOrigin } from "@codeformattools/seo";
import { blogPosts } from "@/lib/learn-guides";

function priorityFor(path: string): number {
  if (path === "") return 1;
  if (path === "/blog" || path === "/performance") return 0.7;
  if (path.startsWith("/blog/")) return 0.65;
  if (path.startsWith("/tools/")) return 0.6;
  if (["/about", "/privacy", "/disclaimer", "/terms", "/editorial-policy", "/contact"].includes(path)) return 0.3;
  if (
    path.includes("formatter") ||
    path.includes("validator") ||
    path.includes("minifier") ||
    path.includes("sorter") ||
    path.includes("to-")
  ) return 0.8;
  return 0.5;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteOrigin();
  const paths = [
    "",
    "/about",
    "/privacy",
    "/disclaimer",
    "/terms",
    "/editorial-policy",
    "/contact",
    "/tools",
    "/blog",
    "/performance",
    ...blogPosts.map(post => `/blog/${post.slug}`),
    ...categories.map(category => `/tools/${category.id}`),
    ...tools.map(tool => `/${tool.slug}`)
  ];
  return paths.map(path => ({
    url: `${base}${path}`,
    changeFrequency: "monthly" as const,
    priority: priorityFor(path)
  }));
}
