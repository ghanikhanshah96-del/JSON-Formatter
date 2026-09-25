import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTool } from "@codeformattools/tool-registry";
import { siteConfig, siteOrigin } from "@codeformattools/seo";
import { getLearnGuide, learnGuides } from "@/lib/learn-guides";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return learnGuides.map(guide => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = getLearnGuide((await params).slug);
  if (!guide) return {};
  return {
    title: `${guide.title} | ${siteConfig.name}`,
    description: guide.description,
    alternates: { canonical: `/learn/${guide.slug}` },
    openGraph: {
      title: `${guide.title} | ${siteConfig.name}`,
      description: guide.description,
      url: `${siteOrigin()}/learn/${guide.slug}`,
      siteName: siteConfig.name,
      type: "article",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: siteConfig.name }]
    }
  };
}

export default async function LearnGuidePage({ params }: Props) {
  const guide = getLearnGuide((await params).slug);
  if (!guide) notFound();
  const related = guide.relatedTools.map(id => getTool(id)).filter(Boolean);
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    author: { "@type": "Organization", name: siteConfig.name, url: siteOrigin() },
    publisher: { "@type": "Organization", name: siteConfig.name, url: siteOrigin() },
    mainEntityOfPage: `${siteOrigin()}/learn/${guide.slug}`
  };

  return (
    <main className="learn-article container">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <div className="breadcrumbs">
        <Link href="/">Home</Link><span>/</span>
        <Link href="/learn">Learn</Link><span>/</span>
        <strong>{guide.title}</strong>
      </div>
      <div className="eyebrow">{guide.eyebrow}</div>
      <h1>{guide.title}<span className="title-accent">.</span></h1>
      <p className="learn-lead">{guide.description}</p>
      <p className="learn-minutes-line">{guide.readMinutes} min read · Private browser tools</p>

      <article className="learn-body">
        {guide.sections.map(section => (
          <section key={section.heading} className="seo-block">
            <h2>{section.heading}</h2>
            {section.paragraphs.map(paragraph => <p key={paragraph.slice(0, 48)}>{paragraph}</p>)}
            {section.bullets?.length ? <ul className="seo-list">{section.bullets.map(item => <li key={item}>{item}</li>)}</ul> : null}
          </section>
        ))}
      </article>

      {related.length > 0 ? (
        <section className="learn-tools">
          <h2>Open a tool</h2>
          <div className="learn-tool-links">
            {related.map(tool => tool ? (
              <Link className="button primary" href={`/${tool.slug}`} key={tool.id}>
                {tool.name} <span aria-hidden="true">→</span>
              </Link>
            ) : null)}
          </div>
        </section>
      ) : null}

      <p className="learn-back"><Link href="/learn">← All guides</Link></p>
    </main>
  );
}
