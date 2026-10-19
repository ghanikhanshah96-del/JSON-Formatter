import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTool } from "@codeformattools/tool-registry";
import { siteConfig, siteOrigin } from "@codeformattools/seo";
import { FaqAccordion } from "@/components/faq-accordion";
import { formatEditorialDate, getEditorialProfile } from "@/lib/editorial-team";
import { getBlogPost, blogPosts, type BlogContentBlock } from "@/lib/learn-guides";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return blogPosts.map(post => ({ slug: post.slug }));
}

function renderLinkedText(text: string, links: { text: string; href: string }[] = []): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  links.forEach((link, index) => {
    const linkStart = text.indexOf(link.text, cursor);
    if (linkStart < 0) return;
    if (linkStart > cursor) nodes.push(text.slice(cursor, linkStart));
    nodes.push(<Link href={link.href} key={`${link.href}-${index}`}>{link.text}</Link>);
    cursor = linkStart + link.text.length;
  });

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function renderBlogBlocks(blocks: BlogContentBlock[], keyPrefix: string) {
  return blocks.map((block, index) => {
    if (block.type === "paragraph") return <p key={`${keyPrefix}-p-${index}`}>{renderLinkedText(block.text, block.links)}</p>;
    if (block.type === "subheading") return <h3 key={`${keyPrefix}-h-${index}`}>{block.text}</h3>;
    if (block.type === "code") {
      return <pre className="blog-code" key={`${keyPrefix}-code-${index}`}><code>{block.code}</code></pre>;
    }
    const List = block.ordered ? "ol" : "ul";
    const isCompact = block.items.length >= 4 && block.items.every(item => item.length <= 72);
    return <List className={`seo-list${isCompact ? " seo-list-compact" : ""}`} key={`${keyPrefix}-list-${index}`}>
      {block.items.map(item => <li key={item}>{item}</li>)}
    </List>;
  });
}

function splitBlogSubsections(blocks: BlogContentBlock[]) {
  const firstSubheading = blocks.findIndex(block => block.type === "subheading");
  if (firstSubheading < 0) return { prelude: blocks, subsections: [] };

  const prelude = blocks.slice(0, firstSubheading);
  const subsections: { heading: string; blocks: BlogContentBlock[] }[] = [];
  blocks.slice(firstSubheading).forEach(block => {
    if (block.type === "subheading") {
      subsections.push({ heading: block.text, blocks: [] });
      return;
    }
    subsections.at(-1)?.blocks.push(block);
  });
  return { prelude, subsections };
}

function getFaqItems(blocks: BlogContentBlock[]) {
  const items: { question: string; answer: string }[] = [];
  let question = "";
  let answers: string[] = [];

  function flush() {
    if (question && answers.length > 0) items.push({ question, answer: answers.join(" ") });
  }

  blocks.forEach(block => {
    if (block.type === "subheading") {
      flush();
      question = block.text;
      answers = [];
    } else if (block.type === "paragraph") {
      answers.push(block.text);
    }
  });
  flush();
  return items;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getBlogPost((await params).slug);
  if (!post) return {};
  const editorialProfile = getEditorialProfile(post.authorId);
  const editorialProfileUrl = `${siteOrigin()}${editorialProfile.path}`;
  return {
    title: `${post.metaTitle ?? post.title} | ${siteConfig.name}`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: `${post.metaTitle ?? post.title} | ${siteConfig.name}`,
      description: post.description,
      url: `${siteOrigin()}/blog/${post.slug}`,
      siteName: siteConfig.name,
      type: "article",
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
      authors: [editorialProfileUrl],
      section: post.category,
      images: [{ url: post.image, width: 1200, height: 675, alt: post.imageAlt }]
    }
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = getBlogPost((await params).slug);
  if (!post) notFound();
  const editorialProfile = getEditorialProfile(post.authorId);
  const editorialProfileUrl = `${siteOrigin()}${editorialProfile.path}`;
  const related = post.relatedTools.map(id => getTool(id)).filter(Boolean);
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: [`${siteOrigin()}${post.image}`],
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    articleSection: post.category,
    inLanguage: "en",
    author: {
      "@type": "Organization",
      "@id": `${editorialProfileUrl}#editorial-team`,
      name: editorialProfile.name,
      url: editorialProfileUrl,
      description: editorialProfile.role
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteOrigin(),
      logo: { "@type": "ImageObject", url: `${siteOrigin()}/icon-192.png` }
    },
    publishingPrinciples: `${siteOrigin()}/editorial-policy`,
    mainEntityOfPage: `${siteOrigin()}/blog/${post.slug}`
  };

  return (
    <main className="learn-article blog-article container">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <header className="blog-article-hero">
        <div className="breadcrumbs">
          <Link href="/">Home</Link><span>/</span>
          <Link href="/blog">Blog</Link><span>/</span>
          <strong>{post.title}</strong>
        </div>
        <div className="blog-article-hero-grid">
          <div className="blog-article-hero-copy">
            <div className="eyebrow">{post.eyebrow}</div>
            <h1>{post.title}<span className="title-accent">.</span></h1>
            <p className="learn-lead">{post.description}</p>
            <p className="learn-minutes-line">
              {post.readMinutes} min read · Published <time dateTime={post.datePublished}>{formatEditorialDate(post.datePublished)}</time>
            </p>
            <div className="blog-byline">
              <span className="blog-byline-mark" aria-hidden="true">{"{ }"}</span>
              <div className="blog-byline-copy">
                <strong>Written and reviewed by {editorialProfile.name}</strong>
                <span>{editorialProfile.role}</span>
                <Link href={editorialProfile.path}>About the editorial team <span aria-hidden="true">→</span></Link>
              </div>
            </div>
          </div>
          <figure className="blog-hero-media">
            <Image
              src={post.image}
              alt={post.imageAlt}
              fill
              priority
              sizes="(max-width: 650px) calc(100vw - 28px), 640px"
              style={{ objectPosition: post.imagePosition ?? "center center" }}
            />
          </figure>
        </div>
      </header>

      <article className="learn-body">
        <div className="blog-intro">
          {post.intro.map(paragraph => <p key={paragraph.slice(0, 48)}>{paragraph}</p>)}
        </div>
        {post.sections.map(section => {
          if (section.heading === "Frequently Asked Questions") {
            return <section key={section.heading} className="seo-block blog-faq">
              <h2>{section.heading}</h2>
              <FaqAccordion items={getFaqItems(section.blocks)} group={`blog-faq-${post.slug}`} />
            </section>;
          }

          const { prelude, subsections } = splitBlogSubsections(section.blocks);
          return <section key={section.heading} className="seo-block">
            <h2>{section.heading}</h2>
            {renderBlogBlocks(prelude, `${section.heading}-prelude`)}
            {subsections.length > 0 ? <div className="blog-subheading-grid">
              {subsections.map((subsection, subsectionIndex) => <div className="blog-subsection" key={subsection.heading}>
                <h3>{subsection.heading}</h3>
                {renderBlogBlocks(subsection.blocks, `${section.heading}-${subsectionIndex}`)}
              </div>)}
            </div> : null}
          </section>;
        })}
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
