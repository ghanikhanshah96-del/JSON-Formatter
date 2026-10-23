import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../../../supabase/migrations/202610200001_blog_cms.sql", import.meta.url);
const archiveMigrationUrl = new URL("../../../supabase/migrations/202610210001_atomic_archive_post.sql", import.meta.url);
const adminSecurityMigrationUrl = new URL("../../../supabase/migrations/202610220002_admin_security_rbac_media.sql", import.meta.url);
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

test("post archive is an atomic revision-checked database operation", async () => {
  const sql = await readFile(archiveMigrationUrl, "utf8");
  assert.match(sql, /for update/i);
  assert.match(sql, /Revision conflict/i);
  assert.match(sql, /insert into public\.blog_revisions/i);
  assert.match(sql, /insert into public\.audit_events/i);
  assert.match(sql, /security invoker/i);
});

test("admin security migration enforces onboarding, RBAC, and server-only media writes", async () => {
  const sql = await readFile(adminSecurityMigrationUrl, "utf8");
  assert.match(sql, /add column if not exists password_set_at timestamptz/i);
  assert.match(sql, /password_set_at is not null/s);
  assert.match(sql, /coalesce\(\(select auth\.jwt\(\)->>'aal'\), ''\) = 'aal2'/s);
  assert.match(sql, /revoke insert, update, delete on public\.blog_assets from authenticated/i);
  for (const policy of ["blog_media_editor_insert", "blog_media_editor_update", "blog_media_editor_delete"]) {
    assert.match(sql, new RegExp(`drop policy if exists ${policy} on storage\\.objects`, "i"));
  }
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /final active owner cannot be demoted or deactivated/i);
  assert.match(sql, /blog_assets_guard_references/i);
  assert.match(sql, /blog_posts_guard_asset_availability/i);
});

test("dashboard environment contract documents every required secret and rollout flag", async () => {
  const env = await readFile(envUrl, "utf8");
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "BLOG_MEDIA_BUCKET", "BLOG_SOURCE", "CMS_OWNER_EMAIL"]) {
    assert.match(env, new RegExp(`^${name}=`, "m"));
  }
});
