import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const enabled = process.env.ADMIN_E2E === "1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function totp(secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of secret.replace(/=+$/g, "").toUpperCase()) {
    bits += alphabet.indexOf(character).toString(2).padStart(5, "0");
  }
  const key = Buffer.from((bits.match(/.{8}/g) ?? []).map(value => Number.parseInt(value, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return value.toString().padStart(6, "0");
}

test("complete protected onboarding, dark dashboard, media removal, and user revocation", async ({ browser }) => {
  test.skip(!enabled || !supabaseUrl || !serviceRoleKey, "Requires an isolated Supabase QA environment.");
  test.setTimeout(90_000);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const suffix = randomUUID();
  const ownerEmail = `qa-owner-${suffix}@example.test`;
  const editorEmail = `qa-editor-${suffix}@example.test`;
  const initialPassword = `Initial-${suffix}-Secure!`;
  const finalPassword = `Final-${suffix}-Secure!`;
  const ownerAuth = await admin.auth.admin.createUser({ email: ownerEmail, password: initialPassword, email_confirm: true });
  const editorAuth = await admin.auth.admin.createUser({ email: editorEmail, password: initialPassword, email_confirm: true });
  if (ownerAuth.error || !ownerAuth.data.user || editorAuth.error || !editorAuth.data.user) {
    throw ownerAuth.error ?? editorAuth.error ?? new Error("Unable to create QA users.");
  }
  const ownerId = ownerAuth.data.user.id;
  const editorId = editorAuth.data.user.id;

  try {
    const profiles = await admin.from("profiles").insert([
      { user_id: ownerId, email: ownerEmail, display_name: "QA Security Owner", role: "owner", active: true, password_set_at: null },
      { user_id: editorId, email: editorEmail, display_name: "QA Revocation Editor", role: "editor", active: true, password_set_at: new Date().toISOString() }
    ]);
    if (profiles.error) throw profiles.error;

    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/admin/login");
    await page.getByLabel("Email").first().fill(ownerEmail);
    await page.getByLabel("Password").fill(initialPassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/account$/);

    // An authenticated session must still be unable to skip durable password completion.
    await page.goto("/admin/mfa");
    await expect(page).toHaveURL(/\/admin\/account$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/account$/);

    await page.getByLabel("New password").fill(finalPassword);
    await page.getByLabel("Confirm password").fill(finalPassword);
    await page.getByRole("button", { name: /save password/i }).click();
    await expect(page).toHaveURL(/\/admin\/mfa$/);
    const manualKey = (await page.locator(".admin-code").textContent())?.trim() ?? "";
    expect(manualKey).not.toBe("");
    await page.getByLabel("Authentication code").fill(totp(manualKey));
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.evaluate(() => localStorage.setItem("codeformattertools.theme", "dark"));
    for (const [path, heading] of [["/admin", "Dashboard"], ["/admin/posts", "Posts"], ["/admin/media", "Media"], ["/admin/users", "Users and access"], ["/admin/audit", "Audit history"]]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expect(page.locator("#admin-theme-toggle [data-theme-label]")).toHaveText("Dark");
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    }

    await page.goto("/admin/media");
    await page.getByLabel("Image").setInputFiles({
      name: "qa-removable.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("/9j/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAC0AUADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAcI/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AlQDTaTgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//Z", "base64")
    });
    await page.getByLabel("Default alt text").fill("QA removable media image");
    await page.getByRole("button", { name: "Upload" }).click();
    const mediaCard = page.locator("article", { hasText: "qa-removable.jpg" });
    await expect(mediaCard).toBeVisible();
    page.once("dialog", dialog => dialog.accept());
    await mediaCard.getByRole("button", { name: "Remove media" }).click();
    await expect(mediaCard).toHaveCount(0);

    await page.goto("/admin/users");
    const editorRow = page.locator("tr", { hasText: "QA Revocation Editor" });
    page.once("dialog", dialog => dialog.accept());
    await editorRow.getByRole("button", { name: "Revoke access" }).click();
    await expect(editorRow.getByText("Revoked", { exact: true })).toBeVisible();

    const revokedContext = await browser.newContext();
    const revokedPage = await revokedContext.newPage();
    await revokedPage.goto("/admin/login");
    await revokedPage.getByLabel("Email").first().fill(editorEmail);
    await revokedPage.getByLabel("Password").fill(initialPassword);
    await revokedPage.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(revokedPage).toHaveURL(/\/admin\/login/);
    await revokedContext.close();
    await context.close();
  } finally {
    const testAssets = await admin.from("blog_assets").select("id,storage_path").eq("created_by", ownerId).like("original_name", "qa-removable.%");
    if (testAssets.data?.length) {
      await admin.storage.from(process.env.BLOG_MEDIA_BUCKET ?? "blog-media").remove(testAssets.data.map(asset => asset.storage_path));
      await admin.from("blog_assets").delete().in("id", testAssets.data.map(asset => asset.id));
    }
    await admin.from("audit_events").delete().in("actor_id", [ownerId, editorId]);
    await admin.auth.admin.deleteUser(editorId);
    await admin.auth.admin.deleteUser(ownerId);
  }
});
