import "server-only";

import { createSupabaseServerClient } from "./supabase/server";
import type { BlogContentBlock } from "./learn-guides";
import type { BlogPostInput } from "./blog-schema";

export type AdminPostSummary = {
  id: string; slug: string; title: string; status: "draft" | "published" | "archived";
  category_slug: string; date_published: string | null; date_modified: string; revision: number;
};

export type AdminPostEditorValue = BlogPostInput & { status: "draft" | "published" | "archived" };

export async function getAdminPosts() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("blog_posts")
    .select("id,slug,title,status,category_slug,date_published,date_modified,revision,draft_payload")
    .order("date_modified", { ascending: false });
  if (error) throw new Error(error.message);
  return data.map(post => {
    const draft = post.status !== "published" && post.draft_payload && typeof post.draft_payload === "object"
      ? post.draft_payload as { title?: string; slug?: string; category?: string }
      : null;
    return {
      id: post.id,
      slug: draft?.slug || post.slug,
      title: draft?.title || post.title,
      status: post.status,
      category_slug: draft?.category || post.category_slug,
      date_published: post.date_published,
      date_modified: post.date_modified,
      revision: post.revision
    } as AdminPostSummary;
  });
}

export async function getAdminPost(id: string): Promise<AdminPostEditorValue | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("blog_posts")
    .select("id,slug,title,meta_title,description,eyebrow,category_slug,author_id,content_json,draft_payload,image_url,image_alt,image_position,read_minutes,status,noindex,date_published,revision,blog_post_tools(tool_id,sort_order),blog_faqs(question,answer,sort_order)")
    .eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  if (data.draft_payload && data.status !== "published") {
    const draft = data.draft_payload as unknown as BlogPostInput;
    return { ...draft, id: data.id, expectedRevision: data.revision, status: data.status };
  }
  const content = data.content_json as { intro?: string[]; sections?: { heading: string; blocks: BlogContentBlock[] }[] };
  return {
    id: data.id,
    expectedRevision: data.revision,
    slug: data.slug,
    title: data.title,
    metaTitle: data.meta_title ?? "",
    description: data.description,
    eyebrow: data.eyebrow,
    category: data.category_slug,
    authorId: "codeformattertools-editorial",
    datePublished: data.date_published ?? "",
    relatedTools: [...(data.blog_post_tools ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(item => item.tool_id),
    readMinutes: data.read_minutes,
    image: data.image_url,
    imageAlt: data.image_alt,
    imagePosition: data.image_position,
    intro: content.intro ?? [],
    sections: content.sections ?? [],
    faqs: [...(data.blog_faqs ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(item => ({ question: item.question, answer: item.answer })),
    noindex: data.noindex,
    changeSummary: "",
    status: data.status
  };
}

export async function getAdminAssets() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("blog_assets")
    .select("id,public_url,original_name,mime_type,width,height,size_bytes,default_alt,created_by,created_at,deleted_at")
    .is("deleted_at", null).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function getAdminAudit() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("audit_events")
    .select("id,action,entity_type,entity_id,metadata,created_at,profiles!audit_events_actor_id_fkey(display_name,email)")
    .order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return data;
}

export async function getAdminProfiles() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("profiles")
    .select("user_id,email,display_name,role,active,password_set_at,created_at").order("created_at");
  if (error) throw new Error(error.message);
  return data;
}
