import { createClient } from "@supabase/supabase-js";
import { blogPosts } from "../lib/learn-guides.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !publishableKey || !serviceKey) throw new Error("Set the Supabase URL, publishable key, and service role key.");

const publicClient = createClient(url, publishableKey, { auth: { persistSession: false } });
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const publicResult = await publicClient.from("blog_posts").select("slug,title,status,date_published,blog_faqs(question),blog_post_tools(tool_id)").order("date_published", { ascending: false });
if (publicResult.error) throw publicResult.error;
const expected = new Map(blogPosts.map(post => [post.slug, post]));
if (publicResult.data.length !== blogPosts.length) throw new Error(`Expected ${blogPosts.length} public posts, found ${publicResult.data.length}.`);
for (const row of publicResult.data) {
  const source = expected.get(row.slug);
  if (!source) throw new Error(`Unexpected public slug: ${row.slug}`);
  if (row.title !== source.title || row.status !== "published" || row.date_published !== source.datePublished) throw new Error(`Metadata mismatch for ${row.slug}.`);
  if (row.blog_post_tools.length !== source.relatedTools.length) throw new Error(`Related-tool mismatch for ${row.slug}.`);
  if (row.blog_faqs.length < 3) throw new Error(`FAQ migration incomplete for ${row.slug}.`);
}

const assets = await admin.from("blog_assets").select("id,storage_path,public_url,size_bytes,width,height").is("deleted_at", null);
if (assets.error) throw assets.error;
if (assets.data.length < blogPosts.length) throw new Error(`Expected at least ${blogPosts.length} migrated assets, found ${assets.data.length}.`);
for (const asset of assets.data) {
  if (!asset.public_url || asset.size_bytes <= 0 || asset.width <= 0 || asset.height <= 0) throw new Error(`Invalid asset metadata for ${asset.storage_path}.`);
}

const anonymousWrite = await publicClient.from("blog_posts").insert({ slug: "must-not-write", title: "Anonymous writes must be rejected", description: "This payload exists only to verify that unauthenticated writes are blocked by grants and RLS.", eyebrow: "SECURITY · TEST", category_slug: "json", content_json: { version: 1, intro: ["Blocked"], sections: [] }, image_url: "/blocked.png", image_alt: "Blocked anonymous test image", read_minutes: 1, created_by: crypto.randomUUID(), updated_by: crypto.randomUUID() });
if (!anonymousWrite.error) throw new Error("Anonymous write unexpectedly succeeded.");
process.stdout.write(`Verified ${publicResult.data.length} public posts, ${assets.data.length} assets, FAQ/tool relations, and anonymous write denial.\n`);
