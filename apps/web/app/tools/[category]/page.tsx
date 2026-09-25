import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, getCategory, getCategoryTools } from "@codeformattools/tool-registry";
import { siteConfig, siteOrigin } from "@codeformattools/seo";
import { iconForTool } from "@/lib/tool-icons";

type Props = { params: Promise<{ category: string }> };
export function generateStaticParams() { return categories.map(category => ({ category: category.id })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = getCategory((await params).category);
  if (!category) return {};
  return {
    title: `${category.name} | ${siteConfig.name}`,
    description: category.description,
    alternates: { canonical: `/tools/${category.id}` },
    openGraph: {
      title: `${category.name} | ${siteConfig.name}`,
      description: category.description,
      url: `${siteOrigin()}/tools/${category.id}`,
      siteName: siteConfig.name,
      type: "website",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: siteConfig.name }]
    }
  };
}

export default async function CategoryPage({ params }: Props) {
  const category = getCategory((await params).category);
  if (!category) notFound();
  const items = getCategoryTools(category.id);
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    description: category.description,
    url: `${siteOrigin()}/tools/${category.id}`,
    isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteOrigin() },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tool.name,
        url: `${siteOrigin()}/${tool.slug}`
      }))
    }
  };

  return <main className="container category-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><strong>{category.name}</strong></div>
    <div className="eyebrow">BROWSE BY FORMAT</div>
    <h1>{category.name}<span className="title-accent">.</span></h1>
    <p className="category-lead">{category.description}</p>
    <p className="category-support">Open any tool below to format, validate, or convert data directly in your browser. No signup and no upload required.</p>
    <div className="tool-grid">{items.map(tool => (
      <Link className="tool-card" href={`/${tool.slug}`} key={tool.id}>
        <div className="card-top"><span className="card-icon" aria-hidden="true">{iconForTool(tool.id)}</span></div>
        <div className="card-eyebrow">{tool.eyebrow}</div>
        <h2>{tool.name}</h2>
        <p>{tool.cardDescription}</p>
        <span className="card-link">Open tool <span aria-hidden="true">→</span></span>
      </Link>
    ))}</div>
    <div className="category-footer-links">
      <Link href="/#tools">All developer tools</Link>
      <Link href="/privacy">Privacy</Link>
      <Link href="/about">About</Link>
    </div>
  </main>;
}
