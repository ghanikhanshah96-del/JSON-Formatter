import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { blogPosts as staticBlogPosts, type BlogContentBlock, type BlogPost } from "./learn-guides";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./supabase/config";

export const BLOG_PAGE_SIZE = 9;
export const BLOG_CACHE_TAG = "blog:list";

type PostRow = {
  id: string;
  slug: string;
  title: string;
  meta_title: string | null;
  description: string;
  eyebrow: string;
  category_slug: string;
  author_id: string;
  date_published: string | null;
  date_modified: string;
  read_minutes: number;
  image_url: string;
  image_alt: string;
  image_position: string | null;
  noindex: boolean;
  content_json: { version?: number; intro?: string[]; sections?: { heading: string; blocks: BlogContentBlock[] }[] } | null;
  blog_post_tools?: { tool_id: string; sort_order: number }[];
  blog_faqs?: { question: string; answer: string; sort_order: number }[];
};

function sourceMode() {
  return (process.env.BLOG_SOURCE ?? "static").toLowerCase();
}

function publicClient() {
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

function mapRow(row: PostRow): BlogPost {
  const sections = [...(row.content_json?.sections ?? [])];
  const faqs = [...(row.blog_faqs ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  if (faqs.length) sections.push({
    heading: "Frequently Asked Questions",
    blocks: faqs.flatMap(item => [
      { type: "subheading", text: item.question } as const,
      { type: "paragraph", text: item.answer } as const
    ])
  });
  return {
    slug: row.slug,
    title: row.title,
    metaTitle: row.meta_title ?? undefined,
    description: row.description,
    eyebrow: row.eyebrow,
    category: row.category_slug.toUpperCase(),
    authorId: "codeformattertools-editorial",
    datePublished: row.date_published ?? row.date_modified.slice(0, 10),
    dateModified: row.date_modified.slice(0, 10),
    relatedTools: [...(row.blog_post_tools ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(item => item.tool_id),
    readMinutes: row.read_minutes,
    image: row.image_url,
    imageAlt: row.image_alt,
    imagePosition: row.image_position ?? undefined,
    noindex: row.noindex,
    intro: row.content_json?.intro ?? [],
    sections
  };
}

async function queryPosts(): Promise<BlogPost[]> {
  const { data, error } = await publicClient()
    .from("blog_posts")
    .select("id,slug,title,meta_title,description,eyebrow,category_slug,author_id,date_published,date_modified,read_minutes,image_url,image_alt,image_position,noindex,content_json,blog_post_tools(tool_id,sort_order),blog_faqs(question,answer,sort_order)")
    .eq("status", "published")
    .order("date_published", { ascending: false })
    .order("date_modified", { ascending: false });
  if (error) throw new Error(`Unable to load blog posts: ${error.message}`);
  return (data as unknown as PostRow[]).map(mapRow);
}

const cachedPosts = unstable_cache(queryPosts, ["published-blog-posts"], {
  tags: [BLOG_CACHE_TAG],
  revalidate: 3600
});

export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  if (!isSupabaseConfigured() || sourceMode() === "static") return staticBlogPosts;
  if (sourceMode() === "shadow") {
    try { await cachedPosts(); } catch { /* parity mode must not affect visitors */ }
    return staticBlogPosts;
  }
  return cachedPosts();
}

export async function getPublishedBlogPost(slug: string): Promise<BlogPost | undefined> {
  return (await getPublishedBlogPosts()).find(post => post.slug === slug);
}

export async function getBlogRedirect(slug: string): Promise<string | undefined> {
  if (!isSupabaseConfigured() || sourceMode() !== "supabase") return undefined;
  const { data, error } = await publicClient()
    .from("blog_redirects")
    .select("blog_posts!inner(slug,status)")
    .eq("from_slug", slug)
    .maybeSingle();
  if (error || !data) return undefined;
  const joined = data.blog_posts as unknown as { slug: string; status: string };
  return joined.status === "published" ? joined.slug : undefined;
}

export async function getBlogPageCount() {
  return Math.max(1, Math.ceil((await getPublishedBlogPosts()).length / BLOG_PAGE_SIZE));
}
