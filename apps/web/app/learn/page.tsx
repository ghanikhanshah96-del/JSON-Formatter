import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig, siteOrigin } from "@codeformattools/seo";
import { learnGuides } from "@/lib/learn-guides";

export const metadata: Metadata = {
  title: `Learn | ${siteConfig.name}`,
  description: "Practical guides for formatting, validating, and converting JSON, YAML, SQL, XML, and CSV with private browser tools.",
  alternates: { canonical: "/learn" },
  openGraph: {
    title: `Learn | ${siteConfig.name}`,
    description: "Short developer guides that link into real tools — not a blog farm.",
    url: `${siteOrigin()}/learn`,
    siteName: siteConfig.name,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: siteConfig.name }]
  }
};

export default function LearnIndexPage() {
  return (
    <main className="learn-page container">
      <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><strong>Learn</strong></div>
      <div className="eyebrow">DOCS · LEARN</div>
      <h1>Guides that ship with the tools<span className="title-accent">.</span></h1>
      <p className="learn-lead">
        Short, practical write-ups for common developer tasks. Each guide links into a live CodeFormatterTools workspace — no accounts, no uploads.
      </p>
      <div className="learn-grid">
        {learnGuides.map(guide => (
          <Link className="learn-card" href={`/learn/${guide.slug}`} key={guide.slug}>
            <div className="learn-card-meta">
              <span className="card-eyebrow">{guide.eyebrow}</span>
              <span className="learn-minutes">{guide.readMinutes} min</span>
            </div>
            <h2>{guide.title}</h2>
            <p>{guide.description}</p>
            <span className="card-link">Read guide <span aria-hidden="true">→</span></span>
          </Link>
        ))}
      </div>
    </main>
  );
}
