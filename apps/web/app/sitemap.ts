import type { MetadataRoute } from "next";
import { categories, tools } from "@codeformattools/tool-registry";
import { siteOrigin } from "@codeformattools/seo";
import { BLOG_PAGE_SIZE, blogPosts } from "@/lib/learn-guides";

function priorityFor(path: string): number {
  if (path === "") return 1;
  if (path === "/blog" || path === "/performance") return 0.7;
  if (path.startsWith("/blog/")) return 0.65;
  if (path.startsWith("/team/")) return 0.4;
  if (path.startsWith("/tools/")) return 0.6;
  if (["/about-us", "/privacy-policy", "/disclaimer", "/terms-and-conditions", "/editorial-policy", "/contact-us"].includes(path)) return 0.3;
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
  const blogPageCount = Math.max(1, Math.ceil(blogPosts.length / BLOG_PAGE_SIZE));
  const paths = [
    "",
    "/about-us",
    "/privacy-policy",
    "/disclaimer",
    "/terms-and-conditions",
    "/editorial-policy",
    "/contact-us",
    "/team/codeformattertools-editorial",
    "/tools",
    "/blog",
    ...Array.from({ length: Math.max(0, blogPageCount - 1) }, (_, index) => `/blog/page/${index + 2}`),
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
