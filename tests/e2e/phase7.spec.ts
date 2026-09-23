import { expect, test } from "@playwright/test";

test("trust pages, contact, and footer links are launch ready", async ({ page, request }) => {
  for (const path of ["/about", "/privacy", "/terms", "/contact"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("footer").getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
  }

  await page.goto("/privacy");
  await expect(page.getByText("Tool input and output stay in the browser session.")).toBeVisible();
  await expect(page.getByText("Code Format Tools uses Vercel Web Analytics and Vercel Speed Insights")).toBeVisible();

  await page.goto("/contact");
  await expect(page).toHaveTitle("Contact | Code Format Tools");
  await expect(page.locator("main a[href^='mailto:']")).toBeVisible();
  await expect(page.locator("main a[href^='mailto:']")).toHaveAttribute("href", /mailto:.+@.+/);
  await expect(page.locator("main a[href*='mail.google.com']")).toBeVisible();

  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain("/contact");
});

test("ad regions are reserved for Google Ads and no ad provider scripts load without config", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", request => requested.push(request.url()));
  await page.goto("/json-formatter");
  const slot = page.locator(".ad-slot-placeholder");
  await expect(slot).toHaveAttribute("data-ads-enabled", "true");
  await expect(slot).toHaveAttribute("data-ads-provider", "google");
  expect(await slot.evaluate(element => (element as HTMLElement).offsetHeight)).toBeGreaterThanOrEqual(90);
  expect(requested.some(url => /googlesyndication|doubleclick|googleadservices|googletagmanager|google-analytics|adsystem/i.test(url))).toBe(false);
});
