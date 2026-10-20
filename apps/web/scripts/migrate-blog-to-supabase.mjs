import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { blogPosts } from "../lib/learn-guides.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const bucket = process.env.BLOG_MEDIA_BUCKET?.trim() || "blog-media";
const ownerEmail = process.env.CMS_OWNER_EMAIL?.trim().toLowerCase();
if (!url || !serviceKey || !ownerEmail) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and CMS_OWNER_EMAIL.");

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const profileResult = await supabase.from("profiles").select("user_id").eq("email", ownerEmail).eq("active", true).maybeSingle();
if (profileResult.error || !profileResult.data) throw new Error("Bootstrap the CMS owner before migrating posts.");
const actorId = profileResult.data.user_id;

function splitFaqs(post) {
  const section = post.sections.find(item => item.heading === "Frequently Asked Questions");
  const faqs = [];
  let question = "";
  let answers = [];
  const flush = () => { if (question && answers.length) faqs.push({ question, answer: answers.join(" ") }); };
  for (const block of section?.blocks ?? []) {
    if (block.type === "subheading") { flush(); question = block.text; answers = []; }
    else if (block.type === "paragraph") answers.push(block.text);
  }
  flush();
  return { faqs, sections: post.sections.filter(item => item !== section) };
}

async function migrateImage(post) {
  if (!post.image.startsWith("/")) return { url: post.image, assetId: null };
  const sourcePath = join(process.cwd(), "public", post.image.replace(/^\//, ""));
  const source = await readFile(sourcePath);
  const output = await sharp(source).rotate().resize({ width: 2000, height: 1400, fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
  const metadata = await sharp(output).metadata();
  const fileName = basename(post.image, extname(post.image));
  const storagePath = `legacy/${fileName}.webp`;
  const upload = await supabase.storage.from(bucket).upload(storagePath, output, { contentType: "image/webp", upsert: true });
  if (upload.error) throw upload.error;
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
  const asset = await supabase.from("blog_assets").upsert({
    storage_path: storagePath, public_url: publicUrl, original_name: basename(post.image), mime_type: "image/webp",
    width: metadata.width, height: metadata.height, size_bytes: output.length,
    sha256: createHash("sha256").update(output).digest("hex"), default_alt: post.imageAlt, created_by: actorId
  }, { onConflict: "storage_path" }).select("id").single();
  if (asset.error) throw asset.error;
  return { url: publicUrl, assetId: asset.data.id };
}

for (const post of blogPosts) {
  const { faqs, sections } = splitFaqs(post);
  const image = await migrateImage(post);
  const row = await supabase.from("blog_posts").upsert({
    slug: post.slug, title: post.title, meta_title: post.metaTitle ?? null, description: post.description,
    eyebrow: post.eyebrow, category_slug: post.category.toLowerCase(), author_id: post.authorId,
    content_json: { version: 1, intro: post.intro, sections }, cover_asset_id: image.assetId,
    image_url: image.url, image_alt: post.imageAlt, image_position: post.imagePosition ?? "center center",
    read_minutes: post.readMinutes, status: "published", noindex: false, date_published: post.datePublished,
    date_modified: `${post.dateModified}T00:00:00Z`, created_by: actorId, updated_by: actorId, published_by: actorId
  }, { onConflict: "slug" }).select("id").single();
  if (row.error) throw row.error;
  await supabase.from("blog_post_tools").delete().eq("post_id", row.data.id);
  if (post.relatedTools.length) {
    const related = await supabase.from("blog_post_tools").insert(post.relatedTools.map((toolId, index) => ({ post_id: row.data.id, tool_id: toolId, sort_order: index })));
    if (related.error) throw related.error;
  }
  await supabase.from("blog_faqs").delete().eq("post_id", row.data.id);
  if (faqs.length) {
    const insertedFaqs = await supabase.from("blog_faqs").insert(faqs.map((faq, index) => ({ post_id: row.data.id, ...faq, sort_order: index })));
    if (insertedFaqs.error) throw insertedFaqs.error;
  }
  process.stdout.write(`Migrated ${post.slug}\n`);
}

const count = await supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "published");
if (count.error) throw count.error;
if ((count.count ?? 0) < blogPosts.length) throw new Error(`Migration parity failed: expected at least ${blogPosts.length} published posts, found ${count.count ?? 0}.`);
process.stdout.write(`Migration complete. ${blogPosts.length} source posts verified. Keep BLOG_SOURCE=shadow for staging parity, then set BLOG_SOURCE=supabase.\n`);
