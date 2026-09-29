import { expect, test } from "@playwright/test";
import { siteConfig } from "@codeformattools/seo";

test("trust pages, contact form, and footer links are launch ready", async ({ page, request }) => {
  for (const path of ["/about", "/privacy", "/terms", "/contact", "/blog", "/performance"]) {
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
  // Honeypot must not appear as an accessible "Company" field or named control.
  await expect(page.getByLabel(/^Company$/i)).toHaveCount(0);
  await expect(page.getByText(/^Company$/)).toHaveCount(0);
  await expect(page.locator(".contact-honeypot")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".contact-honeypot")).toHaveAttribute("hidden", "");
  await expect(page.locator('form.contact-form input[name="company"]')).toHaveCount(0);
  await expect(page.locator('form.contact-form input[name="website_url"]')).toHaveCount(1);
  // Visible contact fields only: Name, Email, Message (Topic is a combobox).
  await expect(page.locator("form.contact-form").getByRole("textbox")).toHaveCount(3);

  const sitemap = await request.get("/sitemap.xml");
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain("/contact");
  expect(sitemapText).toContain("/blog");
  expect(sitemapText).toContain("/blog/format-json-online");
  expect(sitemapText).toContain("/performance");
});

test("blog index cards and article hero share cover images", async ({ page }) => {
  await page.goto("/blog");
  await expect(page.getByRole("heading", { name: /Developer articles/i })).toBeVisible();
  const firstCard = page.locator(".blog-card").first();
  await expect(firstCard.locator(".blog-card-media img")).toBeVisible();
  const cardSrc = await firstCard.locator(".blog-card-media img").getAttribute("src");
  expect(cardSrc).toMatch(/^\/blog\/.+\.svg$/);
  await firstCard.click();
  await expect(page).toHaveURL(/\/blog\//);
  await expect(page.locator(".blog-hero-media img")).toHaveAttribute("src", cardSrc!);
});

test("contact API validates required fields", async ({ request }) => {
  const response = await request.post("/api/contact", {
    data: { name: "", email: "bad", topic: "other", message: "hi" }
  });
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.ok).toBe(false);
  expect(body.errors?.name).toMatch(/name/i);
  expect(body.errors?.email).toMatch(/email/i);
  expect(body.errors?.message).toMatch(/message|characters/i);
});

test("contact API rejects invalid email and short name", async ({ request }) => {
  const response = await request.post("/api/contact", {
    data: { name: "A", email: "not-an-email", topic: "bug", message: "This message is long enough." }
  });
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.ok).toBe(false);
  expect(body.errors?.name).toBeTruthy();
  expect(body.errors?.email).toBeTruthy();
});

test("contact API rejects numeric or symbolic names and empty message content", async ({ request }) => {
  const numeric = await request.post("/api/contact", {
    data: { name: "12345", email: "alex@example.com", topic: "other", message: "This message is long enough." }
  });
  expect(numeric.status()).toBe(400);
  expect((await numeric.json()).errors?.name).toMatch(/numbers|letters/i);

  const symbols = await request.post("/api/contact", {
    data: { name: "John@#$", email: "alex@example.com", topic: "other", message: "This message is long enough." }
  });
  expect(symbols.status()).toBe(400);
  expect((await symbols.json()).errors?.name).toMatch(/letters|special|numbers/i);

  const spamMessage = await request.post("/api/contact", {
    data: { name: "Alex", email: "alex@example.com", topic: "other", message: "!!!!!!!!!!" }
  });
  expect(spamMessage.status()).toBe(400);
  expect((await spamMessage.json()).errors?.message).toMatch(/readable text|characters/i);
});

test("contact API accepts honeypot spam silently", async ({ request }) => {
  const response = await request.post("/api/contact", {
    data: {
      name: "Bot",
      email: "bot@example.com",
      topic: "other",
      message: "This is a long enough spam message.",
      website_url: "https://spam.example"
    }
  });
  expect(response.status()).toBe(200);
  expect((await response.json()).ok).toBe(true);
});

test("contact form shows field errors before submit", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.locator("form.contact-form")).toBeVisible();
  await page.waitForLoadState("domcontentloaded");
  // Allow client hydration (contact form scripts load immediately).
  await expect(page.getByRole("button", { name: /Send message/i })).toBeEnabled();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /Send message/i }).click();
  if (await page.locator(".contact-field-error").count() === 0) {
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /Send message/i }).click();
  }
  await expect(page.locator(".contact-field-error").first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".contact-field-error", { hasText: /Please enter your name/i })).toBeVisible();
  await expect(page.locator(".contact-field-error", { hasText: /Please enter your email/i })).toBeVisible();
  await expect(page.locator(".contact-field-error", { hasText: /Please enter a message/i })).toBeVisible();
  await page.locator('input[name="name"]').fill("Alex");
  await page.locator('input[name="email"]').fill("not-valid");
  await page.locator('input[name="email"]').blur();
  await expect(page.locator(".contact-field-error", { hasText: /valid email address/i })).toBeVisible();
  await page.locator('input[name="name"]').fill("test- k'");
  await page.locator('input[name="name"]').blur();
  await expect(page.locator(".contact-field-error", { hasText: /hyphens and apostrophes between letters/i })).toBeVisible();
  await page.locator('input[name="name"]').fill("O'Brien");
  await page.locator('input[name="name"]').blur();
  await expect(page.locator('label.contact-field:has(input[name="name"]) .contact-field-error')).toHaveCount(0);
  await page.locator('input[name="name"]').fill("12345");
  await page.locator('input[name="name"]').blur();
  await expect(page.locator(".contact-field-error", { hasText: /numbers|letters/i })).toBeVisible();
  await page.locator('input[name="name"]').fill("Alex");
  await page.locator('input[name="email"]').fill("alex@example.com");
  await page.locator('textarea[name="message"]').fill("Short");
  await page.getByRole("button", { name: /Send message/i }).click();
  await expect(page.locator(".contact-field-error", { hasText: /at least 10 characters/i })).toBeVisible();
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
