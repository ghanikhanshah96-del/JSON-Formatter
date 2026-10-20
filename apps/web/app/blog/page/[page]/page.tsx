import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteConfig, siteOrigin } from "@codeformattools/seo";
import { BlogIndex } from "@/components/blog-index";
import { getBlogPageCount, getPublishedBlogPosts } from "@/lib/blog-repository";

type Props = { params: Promise<{ page: string }> };

export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = Number((await params).page);
  const title = `Blog – Page ${page} | ${siteConfig.name}`;
  const description = "Browse practical guides for creating, validating, and formatting structured data with private browser tools.";
  return {
    title,
    description,
    alternates: { canonical: `/blog/page/${page}` },
    openGraph: {
      title,
      description,
      url: `${siteOrigin()}/blog/page/${page}`,
      siteName: siteConfig.name,
      type: "website"
    }
  };
}

export default async function PaginatedBlogPage({ params }: Props) {
  const page = Number((await params).page);
  const [posts, pageCount] = await Promise.all([getPublishedBlogPosts(), getBlogPageCount()]);
  if (!Number.isInteger(page) || page < 2 || page > pageCount) notFound();
  return <BlogIndex posts={posts} page={page} pageCount={pageCount} />;
}
