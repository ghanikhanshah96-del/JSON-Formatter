import { expect, test } from "@playwright/test";
import { siteConfig } from "@codeformattools/seo";

test("trust pages, contact, and footer links are launch ready", async ({ page, request }) => {
  for (const path of ["/about", "/privacy", "/terms", "/contact", "/learn", "/performance"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("footer").getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
  }

  await page.goto("/privacy");
  await expect(page.getByText("Tool input and output stay in the browser session.")).toBeVisible();
  await expect(page.getByText(`${siteConfig.name} uses Vercel Web Analytics and Vercel Speed Insights`)).toBeVisible();

  await page.goto("/contact");
  await expect(page).toHaveTitle(`Contact | ${siteConfig.name}`);
  await expect(page.locator("main a[href^='mailto:']").first()).toBeVisible();
  await expect(page.locator("main a[href^='mailto:']").first()).toHaveAttribute("href", /mailto:.+@.+/);
  await expect(page.locator("main a[href*='mail.google.com']")).toBeVisible();

  const sitemap = await request.get("/sitemap.xml");
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain("/contact");
  expect(sitemapText).toContain("/learn");
  expect(sitemapText).toContain("/performance");
});

test("ad regions only mount when AdSense is configured", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", request => requested.push(request.url()));
  await page.goto("/json-formatter");
  const slot = page.locator(".ad-slot-placeholder");
  const count = await slot.count();
  if (count > 0) {
    await expect(slot).toHaveAttribute("data-ads-provider", "google");
    expect(await slot.evaluate(element => (element as HTMLElement).offsetHeight)).toBeGreaterThanOrEqual(90);
  }
  expect(requested.some(url => /googlesyndication|doubleclick|googleadservices|googletagmanager|google-analytics|adsystem/i.test(url))).toBe(false);
});
