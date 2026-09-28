import { permanentRedirect } from "next/navigation";
import { blogPosts } from "@/lib/learn-guides";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return blogPosts.map(post => ({ slug: post.slug }));
}

export default async function LearnSlugRedirect({ params }: Props) {
  const { slug } = await params;
  permanentRedirect(`/blog/${slug}`);
}
