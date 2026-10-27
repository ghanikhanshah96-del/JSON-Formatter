import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { remediatePublishedBlog, verifyRemediatedBlog } from "../lib/blog-format-remediation.ts";

function loadEnvironment() {
  const candidates = [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")];
  for (const file of candidates) {
    try {
      for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
      }
    } catch { /* try the next location */ }
  }
}

loadEnvironment();
const apply = process.argv.includes("--apply");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: posts, error } = await supabase.from("blog_posts").select("id,slug,content_json,image_alt,revision,status").eq("status", "published");
if (error) throw error;

let changed = 0;
for (const post of posts ?? []) {
  const repaired = remediatePublishedBlog(post.slug, post.content_json ?? {}, post.image_alt);
  const verificationIssues = verifyRemediatedBlog(post.slug, repaired.contentJson, repaired.imageAlt);
  if (verificationIssues.length) throw new Error(`${post.slug} failed remediation verification: ${verificationIssues.join("; ")}`);
  const contentChanged = JSON.stringify(repaired.contentJson) !== JSON.stringify(post.content_json);
  const altChanged = repaired.imageAlt !== post.image_alt;
  if (!contentChanged && !altChanged) continue;
  changed += 1;
  console.log(`${apply ? "Updating" : "Would update"}: ${post.slug}${contentChanged ? " content" : ""}${altChanged ? " alt" : ""}`);
  if (!apply) continue;
  const { data: updated, error: updateError } = await supabase.from("blog_posts").update({
    content_json: repaired.contentJson,
    image_alt: repaired.imageAlt,
    revision: post.revision + 1,
    date_modified: new Date().toISOString(),
  }).eq("id", post.id).eq("revision", post.revision).select("id").maybeSingle();
  if (updateError) throw updateError;
  if (!updated) throw new Error(`Revision conflict while updating ${post.slug}.`);
}
console.log(`${apply ? "Updated" : "Dry run found"} ${changed} published post(s).`);
