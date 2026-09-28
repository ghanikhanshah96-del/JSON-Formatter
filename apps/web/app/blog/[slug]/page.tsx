import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTool } from "@codeformattools/tool-registry";
import { siteConfig, siteOrigin } from "@codeformattools/seo";
import { getBlogPost, blogPosts } from "@/lib/learn-guides";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return blogPosts.map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getBlogPost((await params).slug);
  if (!post) return {};
  return {
    title: `${post.title} | ${siteConfig.name}`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: `${post.title} | ${siteConfig.name}`,
      description: post.description,
      url: `${siteOrigin()}/blog/${post.slug}`,
      siteName: siteConfig.name,
      type: "article",
      images: [{ url: post.image, width: 1200, height: 675, alt: post.imageAlt }]
    }
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = getBlogPost((await params).slug);
  if (!post) notFound();
  const related = post.relatedTools.map(id => getTool(id)).filter(Boolean);
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: [`${siteOrigin()}${post.image}`],
    author: { "@type": "Organization", name: siteConfig.name, url: siteOrigin() },
    publisher: { "@type": "Organization", name: siteConfig.name, url: siteOrigin() },
    mainEntityOfPage: `${siteOrigin()}/blog/${post.slug}`
  };

  return (
    <main className="learn-article blog-article container">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <div className="breadcrumbs">
        <Link href="/">Home</Link><span>/</span>
        <Link href="/blog">Blog</Link><span>/</span>
        <strong>{post.title}</strong>
      </div>
      <div className="eyebrow">{post.eyebrow}</div>
      <h1>{post.title}<span className="title-accent">.</span></h1>
      <p className="learn-lead">{post.description}</p>
      <p className="learn-minutes-line">{post.readMinutes} min read · Private browser tools</p>

      <figure className="blog-hero-media">
        <img src={post.image} alt={post.imageAlt} width={1200} height={675} decoding="async" />
      </figure>

      <article className="learn-body">
        {post.sections.map(section => (
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

      <p className="learn-back"><Link href="/blog">← All articles</Link></p>
    </main>
  );
}
