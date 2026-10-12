import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteConfig, siteOrigin } from "@codeformattools/seo";
import { BlogIndex, blogPageCount } from "@/components/blog-index";

type Props = { params: Promise<{ page: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return Array.from({ length: Math.max(0, blogPageCount - 1) }, (_, index) => ({ page: String(index + 2) }));
}

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
  if (!Number.isInteger(page) || page < 2 || page > blogPageCount) notFound();
  return <BlogIndex page={page} />;
}
