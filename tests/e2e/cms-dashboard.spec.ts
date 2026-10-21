import { createHmac } from "node:crypto";
import path from "node:path";
import { expect, test } from "@playwright/test";

const enabled = process.env.CMS_E2E === "1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const testEmail = `cms-e2e-${Date.now()}@example.com`;
const testPassword = "Local-CMS-test-password-2026";
const slug = `cms-e2e-${Date.now()}`;
let userId = "";

function serviceHeaders(extra: Record<string, string> = {}) {
  return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", ...extra };
}

function decodeBase32(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of value.replace(/=+$/g, "").toUpperCase()) bits += alphabet.indexOf(character).toString(2).padStart(5, "0");
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

function totp(secret: string) {
  const counter = Math.floor(Date.now() / 30_000);
  const buffer = Buffer.alloc(8); buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 15;
  const number = ((digest[offset] & 127) << 24) | ((digest[offset + 1] & 255) << 16) | ((digest[offset + 2] & 255) << 8) | (digest[offset + 3] & 255);
  return String(number % 1_000_000).padStart(6, "0");
}

test.describe("blog dashboard", () => {
  test.skip(!enabled || !supabaseUrl || !serviceKey, "Set CMS_E2E=1 and local Supabase environment values.");
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test.beforeAll(async () => {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, { method: "POST", headers: serviceHeaders(), body: JSON.stringify({ email: testEmail, password: testPassword, email_confirm: true }) });
    const user = await userResponse.json() as { id?: string; message?: string };
    if (!userResponse.ok || !user.id) throw new Error(user.message ?? "Unable to create CMS test user.");
    userId = user.id;
    const profile = await fetch(`${supabaseUrl}/rest/v1/profiles`, { method: "POST", headers: serviceHeaders({ Prefer: "resolution=merge-duplicates" }), body: JSON.stringify({ user_id: userId, email: testEmail, display_name: "CMS E2E Editor", role: "editor", active: true }) });
    if (!profile.ok) throw new Error(await profile.text());
  });

  test.afterAll(async () => {
    if (slug) {
      const postLookup = await fetch(`${supabaseUrl}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}&select=id`, { headers: serviceHeaders() });
      if (!postLookup.ok) throw new Error(`Unable to find CMS test post for cleanup: ${await postLookup.text()}`);
      const posts = await postLookup.json() as Array<{ id: string }>;
      for (const post of posts) {
        const postCleanup = await fetch(`${supabaseUrl}/rest/v1/blog_posts?id=eq.${post.id}`, {
          method: "DELETE",
          headers: serviceHeaders({ Prefer: "return=representation" }),
        });
        if (!postCleanup.ok) throw new Error(`Unable to remove CMS test post: ${await postCleanup.text()}`);
        const deleted = await postCleanup.json() as unknown[];
        if (deleted.length !== 1) throw new Error("CMS test post cleanup did not delete exactly one row.");
      }
    }
    if (userId) {
      const assetResponse = await fetch(`${supabaseUrl}/rest/v1/blog_assets?created_by=eq.${userId}&select=storage_path`, { headers: serviceHeaders() });
      if (assetResponse.ok) {
        const assets = await assetResponse.json() as Array<{ storage_path: string }>;
        for (const asset of assets) {
          const encodedPath = asset.storage_path.split("/").map(encodeURIComponent).join("/");
          await fetch(`${supabaseUrl}/storage/v1/object/blog-media/${encodedPath}`, { method: "DELETE", headers: serviceHeaders() });
        }
      }
      await fetch(`${supabaseUrl}/rest/v1/blog_assets?created_by=eq.${userId}`, { method: "DELETE", headers: serviceHeaders() });
      const auditCleanup = await fetch(`${supabaseUrl}/rest/v1/audit_events?actor_id=eq.${userId}`, { method: "DELETE", headers: serviceHeaders() });
      if (!auditCleanup.ok) throw new Error(`Unable to remove CMS test audit events: ${await auditCleanup.text()}`);
    }
    if (userId) {
      const userCleanup = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: serviceHeaders() });
      if (!userCleanup.ok) throw new Error(`Unable to remove CMS test user: ${await userCleanup.text()}`);
    }
  });

  test("editor enrolls MFA, creates, previews, publishes, uploads media, and archives", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email", { exact: true }).first().fill(testEmail);
    await page.getByLabel("Password", { exact: true }).fill(testPassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/mfa$/, { timeout: 20_000 });
    const manual = page.locator(".admin-code");
    await expect(manual).toBeVisible({ timeout: 20_000 });
    const secret = (await manual.textContent())?.trim() ?? "";
    await page.getByLabel("Authentication code").fill(totp(secret));
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.goto("/admin/posts/new");
    await page.getByLabel("Article title").fill("CMS end-to-end JSON publishing test");
    await page.getByLabel("Description / excerpt").fill("A complete end-to-end article used to verify secure editorial publishing and public rendering.");
    await page.getByLabel("Introduction").fill("This article verifies the complete editorial workflow from a protected dashboard.");
    await page.getByLabel("Section 1 heading").fill("Verified publishing workflow");
    await page.getByLabel("Paragraph text").fill("The structured editor saves this paragraph without allowing executable HTML.");
    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel("Image URL").fill("/blog/how-to-create-json-file.png");
    await page.getByLabel("Alt text").fill("JSON editorial dashboard end-to-end test cover");
    await page.getByLabel("SEO title").fill("CMS End-to-End JSON Publishing Test");
    await page.getByLabel("Change summary").fill("Created by automated browser verification");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]+\/edit\?saved=1$/, { timeout: 20_000 });
    await expect(page.getByText(/Draft saved|Draft autosaved/)).toBeVisible();

    const preview = page.getByRole("link", { name: "Preview" });
    const previewPagePromise = page.context().waitForEvent("page");
    await preview.click();
    const previewPage = await previewPagePromise;
    await previewPage.waitForLoadState();
    await expect(previewPage.getByText("Private preview")).toBeVisible();
    await expect(previewPage.getByRole("heading", { name: /CMS end-to-end JSON publishing test/ })).toBeVisible();
    await previewPage.close();

    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published successfully.")).toBeVisible();
    await page.goto(`/blog/${slug}`);
    await expect(page.getByRole("heading", { name: /CMS end-to-end JSON publishing test/ })).toBeVisible();

    await page.goto("/admin/media");
    await page.getByLabel("Image").setInputFiles(path.resolve("apps/web/public/blog/how-to-create-json-file.png"));
    await page.getByLabel("Default alt text").fill("Uploaded through the protected media pipeline");
    await page.getByRole("button", { name: "Upload", exact: true }).click();
    await expect(page.getByText("Image uploaded.")).toBeVisible({ timeout: 30_000 });

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/posts");
    const row = page.getByRole("row").filter({ hasText: slug });
    await row.getByRole("button", { name: "Archive" }).click();
    await expect(page).toHaveURL(/\/admin\/posts\?archived=1$/);
    await page.goto(`/blog/${slug}`);
    await expect(page).toHaveTitle(/404|not found/i);
  });
});
