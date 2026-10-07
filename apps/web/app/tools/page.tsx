import type { Metadata } from "next";
import { categories, tools } from "@codeformattools/tool-registry";
import { siteConfig, siteOrigin } from "@codeformattools/seo";
import { ToolsGrid } from "@/components/tools-grid";

const title = `All Developer Tools | ${siteConfig.name}`;
const description = "Browse browser-based tools for JSON, SQL, YAML, XML, CSV, validation, formatting, and data conversion.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/tools" },
  openGraph: {
    title,
    description,
    url: `${siteOrigin()}/tools`,
    siteName: siteConfig.name,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: siteConfig.name }]
  }
};

export default function ToolsPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: `${siteOrigin()}/tools`,
    isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteOrigin() },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: tools.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tool.name,
        url: `${siteOrigin()}/${tool.slug}`
      }))
    }
  };

  return <main className="tools-directory-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <section className="tools-section container">
      <div className="section-heading">
        <div>
          <div className="eyebrow">THE TOOLBOX</div>
          <h1>All-in-One Developer Utility Platform</h1>
        </div>
        <p>Format JSON, validate XML, organize YAML, clean SQL, or convert between formats, all locally in your browser.</p>
      </div>
      <ToolsGrid tools={tools} categories={categories} />
    </section>
  </main>;
}
