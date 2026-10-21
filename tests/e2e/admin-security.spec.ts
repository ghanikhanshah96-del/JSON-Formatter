import { expect, test } from "@playwright/test";

test("unauthenticated admin pages redirect to the dedicated login without public chrome or analytics", async ({ page }) => {
  const thirdPartyRequests: string[] = [];
  page.on("request", request => {
    if (/googletagmanager|google-analytics|vercel-(?:scripts|insights)/.test(request.url())) {
      thirdPartyRequests.push(request.url());
    }
  });

  for (const path of ["/admin", "/admin/posts", "/admin/media", "/admin/users", "/admin/audit"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/login(?:\?|$)/);
  }

  await expect(page.locator(".admin-shell")).toBeVisible();
  await expect(page.locator("body > .site-header")).toBeHidden();
  await expect(page.locator("body > .site-footer")).toBeHidden();
  expect(thirdPartyRequests).toEqual([]);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("admin mutation APIs reject cross-origin and unauthenticated requests", async ({ request, baseURL }) => {
  const autosavePayload = { id: null, revision: 0, title: "Unauthorized QA post" };
  const hostileAutosave = await request.post("/api/admin/posts/autosave", {
    headers: { origin: "https://attacker.invalid", "content-type": "application/json" },
    data: autosavePayload,
  });
  expect(hostileAutosave.status()).toBe(403);

  const unauthenticatedAutosave = await request.post("/api/admin/posts/autosave", {
    headers: { origin: new URL(baseURL!).origin, "content-type": "application/json" },
    data: autosavePayload,
  });
  expect(unauthenticatedAutosave.status()).toBe(401);

  const hostileUpload = await request.post("/api/admin/media", {
    headers: { origin: "https://attacker.invalid" },
    multipart: { alt: "QA" },
  });
  expect(hostileUpload.status()).toBe(403);
});

test("admin login remains usable without horizontal overflow on a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: /editorial sign in/i })).toBeVisible();
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
});
