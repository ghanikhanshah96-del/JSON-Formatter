import { expect, test } from "@playwright/test";

test("unauthenticated admin pages redirect to the dedicated login without public chrome or analytics", async ({ page }) => {
  const thirdPartyRequests: string[] = [];
  page.on("request", request => {
    if (/googletagmanager|google-analytics|googlesyndication|doubleclick|googleadservices|vercel-(?:scripts|insights)/.test(request.url())) {
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

  const missingOriginDelete = await request.delete("/api/admin/media?id=11111111-1111-4111-8111-111111111111");
  expect(missingOriginDelete.status()).toBe(403);
});

test("admin sign-in is readable and operable in dark mode", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("codeformattertools.theme", "dark"));
  await page.goto("/admin/login");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("heading", { name: /editorial sign in/i })).toBeVisible();
  await expect(page.getByLabel("Email").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.locator("#admin-theme-toggle")).toBeVisible();
  await expect(page.locator("#admin-theme-toggle [data-theme-label]")).toHaveText("Dark");

  const contrast = await page.locator(".admin-login h1").evaluate(element => {
    function rgb(value: string) {
      return (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    }
    function luminance([r, g, b]: number[]) {
      const channels = [r, g, b].map(value => {
        const normalized = value / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    }
    const foreground = luminance(rgb(getComputedStyle(element).color));
    const background = luminance(rgb(getComputedStyle(element.closest(".admin-card")!).backgroundColor));
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});

test("admin login remains usable without horizontal overflow on a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: /editorial sign in/i })).toBeVisible();
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
});
