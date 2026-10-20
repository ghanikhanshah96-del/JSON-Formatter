import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../../../supabase/migrations/202610200001_blog_cms.sql", import.meta.url);
const configUrl = new URL("../../../supabase/config.toml", import.meta.url);
const envUrl = new URL("../../../.env.example", import.meta.url);

test("CMS migration enables RLS for every exposed editorial table", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  for (const table of ["profiles", "blog_categories", "blog_assets", "blog_posts", "blog_post_tools", "blog_faqs", "blog_revisions", "blog_redirects", "audit_events"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(sql, /auth\.jwt\(\)->>'aal'.*'aal2'/s);
  const config = await readFile(configUrl, "utf8");
  assert.match(config, /enable_signup = false/i);
});

test("dashboard environment contract documents every required secret and rollout flag", async () => {
  const env = await readFile(envUrl, "utf8");
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "BLOG_MEDIA_BUCKET", "BLOG_SOURCE", "CMS_OWNER_EMAIL"]) {
    assert.match(env, new RegExp(`^${name}=`, "m"));
  }
});
