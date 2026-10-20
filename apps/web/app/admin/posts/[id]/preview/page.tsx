import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogArticleBody } from "@/components/blog-article-body";
import { getAdminPost } from "@/lib/admin-blog";
import { requireCmsUser } from "@/lib/cms-auth";

export const metadata: Metadata = { title: "Article preview", robots: { index: false, follow: false } };

export default async function PostPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCmsUser();
  const post = await getAdminPost((await params).id);
  if (!post) notFound();
  return <main className="learn-article blog-article container">
    <div className="admin-success" style={{ marginTop: 18 }}>Private preview · Revision {post.expectedRevision} · <Link href={`/admin/posts/${post.id}/edit`}>Return to editor</Link></div>
    <header className="blog-article-hero"><div className="blog-article-hero-grid"><div className="blog-article-hero-copy"><div className="eyebrow">{post.eyebrow}</div><h1>{post.title}<span className="title-accent">.</span></h1><p className="learn-lead">{post.description}</p><p className="learn-minutes-line">{post.readMinutes} min read · {post.status}</p></div><figure className="blog-hero-media">{post.image ? <Image src={post.image} alt={post.imageAlt} fill priority sizes="640px" style={{ objectPosition: post.imagePosition }} /> : null}</figure></div></header>
    <BlogArticleBody post={{ slug: post.slug, intro: post.intro, sections: [...post.sections, ...(post.faqs.length ? [{ heading: "Frequently Asked Questions", blocks: post.faqs.flatMap(item => [{ type: "subheading" as const, text: item.question }, { type: "paragraph" as const, text: item.answer }]) }] : [])] }} />
  </main>;
}
