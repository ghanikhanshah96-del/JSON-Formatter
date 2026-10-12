import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig, siteOrigin } from "@codeformattools/seo";
import { blogPosts } from "@/lib/learn-guides";

export const metadata: Metadata = {
  title: `Blog | ${siteConfig.name}`,
  description: "A practical guide to creating, validating, and formatting JSON files with private browser tools.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: `Blog | ${siteConfig.name}`,
    description: "A step-by-step JSON guide that links into real tools — private by default.",
    url: `${siteOrigin()}/blog`,
    siteName: siteConfig.name,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: siteConfig.name }]
  }
};

export default function BlogIndexPage() {
  return (
    <main className="learn-page blog-page container">
      <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><strong>Blog</strong></div>
      <div className="eyebrow">BLOG · GUIDE</div>
      <h1>Learn JSON, then open the tools<span className="title-accent">.</span></h1>
      <p className="learn-lead">
        A practical, beginner-friendly walkthrough for creating a JSON file, understanding its syntax, and checking your work.
      </p>
      <div className="learn-grid blog-grid">
        {blogPosts.map(post => (
          <Link className="learn-card blog-card" href={`/blog/${post.slug}`} key={post.slug}>
            <div className="blog-card-media">
              <img src={post.image} alt={post.imageAlt} width={1200} height={675} loading="lazy" decoding="async" />
            </div>
            <div className="blog-card-body">
              <div className="learn-card-meta">
                <span className="card-eyebrow">{post.eyebrow}</span>
                <span className="learn-minutes">{post.readMinutes} min</span>
              </div>
              <h2>{post.title}</h2>
              <p>{post.description}</p>
              <span className="card-link">Read article <span aria-hidden="true">→</span></span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
