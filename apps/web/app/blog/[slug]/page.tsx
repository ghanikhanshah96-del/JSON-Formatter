import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getTool } from "@codeformattools/tool-registry";
import { siteConfig, siteOrigin } from "@codeformattools/seo";
import { BlogArticleBody } from "@/components/blog-article-body";
import { formatEditorialDate, getEditorialProfile } from "@/lib/editorial-team";
import { blogPosts } from "@/lib/learn-guides";
import { getBlogRedirect, getPublishedBlogPost } from "@/lib/blog-repository";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return blogPosts.map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedBlogPost((await params).slug);
  if (!post) return {};
  const editorialProfile = getEditorialProfile(post.authorId);
  const editorialProfileUrl = `${siteOrigin()}${editorialProfile.path}`;
  return {
    title: `${post.metaTitle ?? post.title} | ${siteConfig.name}`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    robots: post.noindex ? { index: false, follow: false } : undefined,
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
  const slug = (await params).slug;
  const post = await getPublishedBlogPost(slug);
  if (!post) {
    const redirectSlug = await getBlogRedirect(slug);
    if (redirectSlug) permanentRedirect(`/blog/${redirectSlug}`);
    notFound();
  }
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

      <BlogArticleBody post={post} />

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
