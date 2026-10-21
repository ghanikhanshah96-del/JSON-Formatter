"use server";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { blogPostInputSchema, estimateReadMinutes } from "@/lib/blog-schema";
import { authorizeCmsMutation } from "@/lib/cms-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BLOG_CACHE_TAG } from "@/lib/blog-repository";

export type SavePostState = { ok: boolean; error: string; id?: string; revision?: number; status?: string };

export async function savePostPayload(raw: unknown, intent: "draft" | "save" | "publish") {
  await authorizeCmsMutation();
  const parsed = blogPostInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the post fields." } satisfies SavePostState;
  const payload = { ...parsed.data, readMinutes: estimateReadMinutes(parsed.data) };
  const supabase = await createSupabaseServerClient();
  const previous = payload.id ? await supabase.from("blog_posts").select("slug").eq("id", payload.id).maybeSingle() : null;
  const { data, error } = await supabase.rpc("cms_save_post", { p_payload: payload, p_action: intent });
  if (error) {
    const message = error.message.includes("Revision conflict")
      ? "This post was changed in another session. Reload before saving again."
      : error.message.includes("duplicate key") ? "That slug is already in use." : error.message;
    return { ok: false, error: message } satisfies SavePostState;
  }
  const saved = data?.[0];
  revalidateTag(BLOG_CACHE_TAG, "max");
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
  revalidatePath("/blog/rss.xml");
  if (payload.slug) revalidatePath(`/blog/${payload.slug}`);
  if (previous?.data?.slug && previous.data.slug !== payload.slug) revalidatePath(`/blog/${previous.data.slug}`);
  return { ok: true, error: "", id: saved?.post_id, revision: saved?.new_revision, status: saved?.saved_status } satisfies SavePostState;
}

export async function savePostAction(_previous: SavePostState, formData: FormData): Promise<SavePostState> {
  const rawIntent = formData.get("intent");
  const intent = rawIntent === "publish" ? "publish" : rawIntent === "save" ? "save" : "draft";
  try {
    const result = await savePostPayload(JSON.parse(String(formData.get("payload") ?? "{}")), intent);
    if (result.ok && result.status === "published") updateTag(BLOG_CACHE_TAG);
    return result;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to save the post." };
  }
}

export async function archivePostAction(formData: FormData) {
  await authorizeCmsMutation();
  const id = String(formData.get("id") ?? "");
  const revision = Number(formData.get("revision"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("cms_archive_post", { p_id: id, p_expected_revision: revision });
  if (error) {
    if (error.message.includes("Revision conflict")) throw new Error("The post changed before it could be archived.");
    throw new Error(error.message);
  }
  updateTag(BLOG_CACHE_TAG); revalidatePath("/blog"); revalidatePath("/sitemap.xml"); revalidatePath("/blog/rss.xml");
  redirect("/admin/posts?archived=1");
}
