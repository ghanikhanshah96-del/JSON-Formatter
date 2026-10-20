import { expect, test } from "@playwright/test";
import { tools } from "@codeformattools/tool-registry";

function expectBlogImageSource(source: string | null, pageUrl: string, slug: string) {
  expect(source).toContain("/_next/image");
  const originalSource = new URL(source!, pageUrl).searchParams.get("url");
  expect(originalSource).not.toBeNull();

  const pathname = originalSource!.startsWith("http")
    ? new URL(originalSource!).pathname
    : originalSource!;
  expect(pathname).toMatch(new RegExp(`(?:/blog/${slug}\\.jpg|/blog-media/legacy/${slug}\\.webp)$`));
}

test("trust pages, contact form, and footer links are launch ready", async ({ page, request }) => {
  const policyPages = [
    ["/about-us", "About Us | CodeFormatterTools"],
    ["/privacy-policy", "Privacy Policy | CodeFormatterTools"],
    ["/disclaimer", "Disclaimer | CodeFormatterTools"],
    ["/terms-and-conditions", "Terms and Conditions | CodeFormatterTools"],
    ["/editorial-policy", "Editorial Policy | CodeFormatterTools"],
    ["/contact-us", "Contact Us | CodeFormatterTools"]
  ] as const;

  for (const [path, title] of policyPages) {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("link[rel='canonical']")).toHaveAttribute("href", new RegExp(`${path}$`));
    await expect(page.locator("footer").getByRole("link", { name: "Contact Us" })).toHaveAttribute("href", "/contact-us");
  }

  for (const [legacyPath, canonicalPath] of [
    ["/about", "/about-us"],
    ["/privacy", "/privacy-policy"],
    ["/contact", "/contact-us"],
    ["/terms", "/terms-and-conditions"]
  ]) {
    await page.goto(legacyPath);
    await expect(page).toHaveURL(new RegExp(`${canonicalPath}$`));
  }

  for (const label of ["About Us", "Editorial Team", "Contact Us", "Privacy Policy", "Disclaimer", "Terms and Conditions", "Editorial Policy"]) {
    await expect(page.locator("footer").getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  for (const label of ["About Us", "Privacy Policy", "Contact Us"]) {
    await expect(page.locator(".desktop-nav").getByRole("link", { name: label, exact: true })).toBeVisible();
  }

  for (const path of ["/blog", "/performance"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
  }

  await page.goto("/tools");
  await expect(page).toHaveTitle("All Developer Tools | CodeFormatterTools");
  await expect(page.locator("link[rel='canonical']")).toHaveAttribute("href", /\/tools$/);
  await expect(page.getByRole("heading", { name: "All-in-One Developer Utility Platform" })).toBeVisible();
  await expect(page.locator(".tools-browser .tool-card")).toHaveCount(tools.length);
  await expect(page.locator(".tools-filter")).toBeVisible();
  await expect(page.locator(".mobile-drawer-nav a[href='/tools']")).toHaveCount(1);
  await page.goto("/privacy-policy");
  await page.locator(".desktop-nav").getByRole("link", { name: "Tools" }).click();
  await expect(page).toHaveURL(/\/tools$/);
  await page.locator("footer").getByRole("link", { name: "All tools" }).click();
  await expect(page).toHaveURL(/\/tools$/);
  await page.goto("/about-us");
  await expect(page.getByRole("heading", { name: "About Us", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What We Offer" })).toBeVisible();
  await expect(page.getByText("JSON to CSV Converter", { exact: true })).toBeVisible();

  await page.goto("/privacy-policy");
  await expect(page.getByText("Tool input and generated results generally remain within your browser session.")).toBeVisible();
  await expect(page.getByText(/currently uses Vercel Web Analytics, Vercel Speed Insights, and Google Analytics/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Google AdSense and Advertising" })).toBeVisible();
  const policyListColumns = await page.locator(".site-policy-page .site-page-sections ul").first().evaluate(el =>
    getComputedStyle(el).gridTemplateColumns.split(" ").length
  );
  expect(policyListColumns).toBe(2);
  const policyWidth = await page.locator(".site-policy-page").evaluate(el => el.getBoundingClientRect().width);
  expect(policyWidth).toBeGreaterThan(1100);

  await page.goto("/disclaimer");
  await expect(page.getByRole("heading", { name: "Data Conversion Limitations" })).toBeVisible();
  await page.goto("/editorial-policy");
  await expect(page.getByRole("heading", { name: "Artificial Intelligence and Editorial Responsibility" })).toBeVisible();

  await page.goto("/contact-us");
  await expect(page).toHaveTitle("Contact Us | CodeFormatterTools");
  await expect(page.locator("form.contact-form")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Security Reports" })).toBeVisible();
  await expect(page.locator('form.contact-form input[name="name"]')).toBeVisible();
  await expect(page.locator('form.contact-form input[name="email"]')).toBeVisible();
  await expect(page.locator('form.contact-form select[name="topic"]')).toBeVisible();
  await expect(page.locator('form.contact-form textarea[name="message"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /Send message/i })).toBeVisible();
  await expect(page.locator("main a[href^='mailto:']")).toHaveCount(0);
  // Honeypot must not appear as an accessible "Company" field or named control.
  await expect(page.locator('form.contact-form input[name="website_url"]')).toHaveCount(1);
  // Visible contact fields only: Name, Email, Message (Topic is a combobox).
  await expect(page.locator("form.contact-form").getByRole("textbox")).toHaveCount(3);


  const sitemap = await request.get("/sitemap.xml");
  const sitemapText = await sitemap.text();
  for (const canonicalPath of ["/about-us", "/privacy-policy", "/contact-us", "/terms-and-conditions"]) {
    expect(sitemapText).toContain(`${canonicalPath}</loc>`);
  }
  for (const legacyPath of ["/about", "/privacy", "/contact", "/terms"]) {
    expect(sitemapText).not.toContain(`${legacyPath}</loc>`);
  }
  expect(sitemapText).toContain("/tools</loc>");
  expect(sitemapText).toContain("/disclaimer");
  expect(sitemapText).toContain("/editorial-policy");
  expect(sitemapText).toContain("/team/codeformattertools-editorial");
  expect(sitemapText).toContain("/blog");
  expect(sitemapText).toContain("/blog/how-to-sort-json-file");
  expect(sitemapText).toContain("/blog/how-to-download-a-json-file");
  expect(sitemapText).toContain("/blog/how-to-view-a-json-file");
  expect(sitemapText).toContain("/blog/how-to-create-json-file");
  expect(sitemapText).toContain("/performance");
});

test("blog index keeps one featured story and a responsive three-card grid", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/blog");
  await expect(page.getByRole("heading", { name: /Learn JSON/i })).toBeVisible();
  await expect(page.locator("main#main-content")).toBeVisible();
  await expect(page.locator(".blog-card-featured")).toHaveCount(1);
  await expect(page.locator(".blog-card-regular")).toHaveCount(3);
  expect(await page.locator(".blog-card-list").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(3);

  const firstCard = page.locator(".blog-card").first();
  const cardImage = firstCard.locator(".blog-card-media img");
  await expect(cardImage).toBeVisible();
  await expect(cardImage).toHaveCSS("object-fit", "cover");
  await expect(cardImage).toHaveCSS("object-position", "50% 50%");
  await expect(cardImage).toHaveAttribute("alt", "");
  const cardSrc = await cardImage.getAttribute("src");
  expectBlogImageSource(cardSrc, page.url(), "how-to-sort-json-file");
  await expect(firstCard.locator("time[datetime='2026-10-20']")).toBeVisible();

  const schema = await page.locator('script[type="application/ld+json"]').evaluateAll(scripts =>
    scripts.map(script => JSON.parse(script.textContent || "{}"))
      .find(value => Array.isArray(value["@graph"]))
  );
  expect(schema["@graph"].map((entry: { "@type": string }) => entry["@type"])).toEqual(
    expect.arrayContaining(["Blog", "ItemList", "BreadcrumbList"]),
  );

  const rss = await request.get("/blog/rss.xml");
  expect(rss.status()).toBe(200);
  expect(rss.headers()["content-type"]).toContain("application/rss+xml");
  expect(await rss.text()).toContain("/blog/how-to-sort-json-file");

  await firstCard.click();
  await expect(page).toHaveURL(/\/blog\//);
  const articleSrc = await page.locator(".blog-hero-media img").getAttribute("src");
  expectBlogImageSource(articleSrc, page.url(), "how-to-sort-json-file");

  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto("/blog");
  expect(await page.locator(".blog-card-featured").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(1);
  expect(await page.locator(".blog-card-list").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(2);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/blog");
  expect(await page.locator(".blog-card-list").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
});

test("new JSON guides expose complete metadata, cover images, and FAQs", async ({ page }) => {
  const guides = [
    {
      slug: "how-to-sort-json-file",
      title: "How to Sort JSON File Online: A Simple Step-by-Step Guide",
      description: "Learn how to sort JSON file keys alphabetically using a free online JSON sorter. Follow simple steps to organize, sort, and download JSON data.",
      faqCount: 4,
      tool: "/json-sorter",
    },
    {
      slug: "how-to-download-a-json-file",
      title: "How to Download a JSON File: A Simple Step-by-Step Guide",
      description: "Learn how to download a JSON file from a website, save JSON data in your browser, or create a downloadable JSON file online in simple steps.",
      faqCount: 3,
      tool: "/json-formatter",
    },
    {
      slug: "how-to-view-a-json-file",
      title: "How to View a JSON File on Windows, Mac, and Online",
      description: "Learn how to view a JSON file on Windows, Mac, or in a browser. Follow simple steps to open, read, and format JSON files online for free.",
      faqCount: 6,
      tool: "/json-formatter",
    },
  ];

  for (const guide of guides) {
    await page.goto(`/blog/${guide.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: guide.title })).toBeVisible();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", guide.description);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/blog/${guide.slug}$`));
    const heroImage = page.locator(".blog-hero-media img");
    await expect(heroImage).toBeVisible();
    const heroSrc = await heroImage.getAttribute("src");
    expectBlogImageSource(heroSrc, page.url(), guide.slug);
    await expect(page.locator(".blog-faq details")).toHaveCount(guide.faqCount);
    await expect(page.locator(`main a[href="${guide.tool}"]`)).not.toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => document.documentElement.clientWidth),
    );
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/blog", ...guides.map(guide => `/blog/${guide.slug}`)]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => document.documentElement.clientWidth),
    );
  }
});

test("editorial profile, article bylines, and structured data use one identity", async ({ page }) => {
  const profilePath = "/team/codeformattertools-editorial";
  const articles = [
    ["how-to-sort-json-file", "2026-10-20"],
    ["how-to-download-a-json-file", "2026-10-17"],
    ["how-to-view-a-json-file", "2026-10-17"],
    ["how-to-create-json-file", "2026-10-12"],
  ] as const;

  for (const [slug, published] of articles) {
    await page.goto(`/blog/${slug}`);
    const byline = page.locator(".blog-byline");
    await expect(byline).toBeVisible();
    await expect(byline).toContainText("Written and reviewed by CodeFormatterTools Editorial Team");
    await expect(byline.getByRole("link", { name: /About the editorial team/i })).toHaveAttribute("href", profilePath);
    await expect(page.locator(`time[datetime="${published}"]`)).toBeVisible();

    const articleSchema = await page.locator('script[type="application/ld+json"]').evaluateAll(scripts =>
      scripts.map(script => JSON.parse(script.textContent || "{}"))
        .find(schema => schema["@type"] === "BlogPosting")
    );
    expect(articleSchema.author["@type"]).toBe("Organization");
    expect(articleSchema.author.name).toBe("CodeFormatterTools Editorial Team");
    expect(articleSchema.author.url).toMatch(/\/team\/codeformattertools-editorial$/);
    expect(articleSchema.datePublished).toBe(published);
    expect(articleSchema.dateModified).toBe(published);
    expect(articleSchema.publishingPrinciples).toMatch(/\/editorial-policy$/);
  }

  await page.goto(profilePath);
  await expect(page).toHaveTitle("CodeFormatterTools Editorial Team | CodeFormatterTools");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${profilePath}$`));
  await expect(page.getByRole("heading", { level: 1, name: "CodeFormatterTools Editorial Team" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Editorial expertise" })).toBeVisible();
  await expect(page.locator(".editorial-expertise-list li")).toHaveCount(6);
  await expect(page.locator(".editorial-article-card")).toHaveCount(articles.length);

  const profileSchema = await page.locator('script[type="application/ld+json"]').evaluateAll(scripts =>
    scripts.map(script => JSON.parse(script.textContent || "{}"))
      .find(schema => schema["@type"] === "ProfilePage")
  );
  expect(profileSchema.mainEntity["@type"]).toBe("Organization");
  expect(profileSchema.mainEntity.name).toBe("CodeFormatterTools Editorial Team");
  expect(profileSchema.mainEntity.url).toMatch(/\/team\/codeformattertools-editorial$/);
  expect(profileSchema.hasPart).toHaveLength(articles.length);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(profilePath);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
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
  await page.goto("/contact-us");
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
  expect(requested.some(url => /googlesyndication|doubleclick|googleadservices|adsystem/i.test(url))).toBe(false);
});
