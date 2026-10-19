import type { Metadata } from "next";
import { siteConfig, siteOrigin } from "@codeformattools/seo";
import { BlogIndex } from "@/components/blog-index";
import { defaultEditorialProfile } from "@/lib/editorial-team";
import { blogPosts } from "@/lib/learn-guides";

const blogTitle = `JSON Guides and Tutorials | ${siteConfig.name}`;
const blogDescription = "Practical guides to creating, viewing, downloading, sorting, validating, and formatting JSON files with private browser tools.";
const blogUrl = `${siteOrigin()}/blog`;

export const metadata: Metadata = {
  title: blogTitle,
  description: blogDescription,
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": "/blog/rss.xml" }
  },
  openGraph: {
    title: blogTitle,
    description: "Step-by-step developer guides that link into real tools — private by default.",
    url: blogUrl,
    siteName: siteConfig.name,
    type: "website",
    images: [{ url: blogPosts[0]?.image ?? "/og-image.png", width: 1200, height: 630, alt: "CodeFormatterTools JSON guides" }]
  }
};

export default function BlogIndexPage() {
  const editorialProfileUrl = `${siteOrigin()}${defaultEditorialProfile.path}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": `${blogUrl}#blog`,
        name: "CodeFormatterTools JSON Guides and Tutorials",
        description: blogDescription,
        url: blogUrl,
        inLanguage: "en",
        publisher: {
          "@type": "Organization",
          name: siteConfig.name,
          url: siteOrigin(),
          logo: { "@type": "ImageObject", url: `${siteOrigin()}/icon-192.png` }
        },
        author: {
          "@type": "Organization",
          "@id": `${editorialProfileUrl}#editorial-team`,
          name: defaultEditorialProfile.name,
          url: editorialProfileUrl
        },
        blogPost: blogPosts.map(post => ({
          "@type": "BlogPosting",
          headline: post.title,
          url: `${siteOrigin()}/blog/${post.slug}`,
          image: `${siteOrigin()}${post.image}`,
          datePublished: post.datePublished,
          dateModified: post.dateModified
        }))
      },
      {
        "@type": "ItemList",
        "@id": `${blogUrl}#article-list`,
        numberOfItems: blogPosts.length,
        itemListElement: blogPosts.map((post, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: post.title,
          url: `${siteOrigin()}/blog/${post.slug}`
        }))
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteOrigin() },
          { "@type": "ListItem", position: 2, name: "Blog", item: blogUrl }
        ]
      }
    ]
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <BlogIndex />
  </>;
}
