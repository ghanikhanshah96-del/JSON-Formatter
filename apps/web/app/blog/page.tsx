import type { Metadata } from "next";
import { siteConfig, siteOrigin } from "@codeformattools/seo";
import { BlogIndex } from "@/components/blog-index";

export const metadata: Metadata = {
  title: `Blog | ${siteConfig.name}`,
  description: "Practical guides to creating, viewing, downloading, sorting, validating, and formatting JSON files with private browser tools.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: `Blog | ${siteConfig.name}`,
    description: "Step-by-step developer guides that link into real tools — private by default.",
    url: `${siteOrigin()}/blog`,
    siteName: siteConfig.name,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: siteConfig.name }]
  }
};

export default function BlogIndexPage() {
  return <BlogIndex />;
}
