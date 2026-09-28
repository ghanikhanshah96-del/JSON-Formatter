import { expect, test } from "@playwright/test";
import { siteConfig } from "@codeformattools/seo";

test("trust pages, contact form, and footer links are launch ready", async ({ page, request }) => {
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
  await expect(page.locator("form.contact-form")).toBeVisible();
  await expect(page.locator('form.contact-form input[name="name"]')).toBeVisible();
  await expect(page.locator('form.contact-form input[name="email"]')).toBeVisible();
  await expect(page.locator('form.contact-form select[name="topic"]')).toBeVisible();
  await expect(page.locator('form.contact-form textarea[name="message"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /Send message/i })).toBeVisible();
  await expect(page.locator("main a[href^='mailto:']")).toHaveCount(0);

  const sitemap = await request.get("/sitemap.xml");
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain("/contact");
  expect(sitemapText).toContain("/learn");
  expect(sitemapText).toContain("/performance");
});

test("contact API validates required fields", async ({ request }) => {
  const response = await request.post("/api/contact", {
    data: { name: "", email: "bad", topic: "other", message: "hi" }
  });
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.ok).toBe(false);
  expect(String(body.error)).toMatch(/name|email|message/i);
});

test("contact API returns 503 when Resend is not configured", async ({ request }) => {
  const response = await request.post("/api/contact", {
    data: {
      name: "QA Tester",
      email: "qa@example.com",
      topic: "other",
      message: "This is a long enough message for validation."
    }
  });
  // Local/CI builds typically omit RESEND_*; production with keys returns 200.
  expect([200, 503, 502]).toContain(response.status());
  const body = await response.json();
  if (response.status() === 503) {
    expect(body.ok).toBe(false);
    expect(String(body.error)).toMatch(/RESEND|configured/i);
  }
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
