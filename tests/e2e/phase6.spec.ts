import { expect, test } from "@playwright/test";
import { categories, tools } from "@codeformattools/tool-registry";

test("all tool pages expose unique SEO sections and structured data", async ({ page }) => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const tool of tools) {
    await page.goto(`/${tool.slug}`);
    await expect(page).toHaveTitle(tool.seo.title);
    await expect(page.locator("meta[name='description']")).toHaveAttribute("content", tool.seo.description);
    await expect(page.locator("link[rel='canonical']")).toHaveAttribute("href", new RegExp(`/${tool.slug}$`));
    await expect(page.getByRole("heading", { name: `${tool.headline}.` })).toBeVisible();
    await page.locator(".seo-deep-details").evaluate((el: HTMLDetailsElement) => { el.open = true; });
    const detailsBeforeFaq = await page.evaluate(() => {
      const details = document.querySelector(".seo-deep-details");
      const faq = document.querySelector(".tool-faq");
      return Boolean(details && faq && details.compareDocumentPosition(faq) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(detailsBeforeFaq).toBe(true);
    await expect(page.locator(".seo-deep-details")).toHaveCSS("grid-column-end", "-1");
    const faqGridColumns = await page.locator(".tool-faq .faq-list").evaluate(el =>
      getComputedStyle(el).gridTemplateColumns.split(" ").length
    );
    expect(faqGridColumns).toBe(2);
    const itemGridColumns = await page.locator(".seo-deep-details .seo-item-grid").evaluateAll(grids =>
      grids.map(grid => getComputedStyle(grid).gridTemplateColumns.split(" ").length)
    );
    for (const columns of itemGridColumns) expect(columns).toBe(3);
    await expect(page.getByText(tool.about).first()).toBeVisible();
    await expect(page.locator(".example-code")).toContainText(tool.example.split("\n")[0]);
    for (const item of tool.commonErrors) await expect(page.locator(".error-grid strong").getByText(item.title, { exact: true })).toBeVisible();
    for (const item of tool.faq) await expect(page.locator(".faq-list .faq-trigger").getByText(item.question, { exact: true })).toBeVisible();
    for (const related of tool.relatedTools) await expect(page.locator(".related").getByRole("link", { name: new RegExp(related.replace(/-/g, ".*"), "i") })).toBeVisible();

    const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => JSON.parse(node.textContent || "{}")));
    expect(schemas.some(schema => schema["@type"] === "WebApplication" && schema.name === tool.name)).toBe(true);
    expect(schemas.some(schema => schema["@type"] === "BreadcrumbList" && schema.itemListElement.length === 3)).toBe(true);
    expect(schemas.some(schema => schema["@type"] === "FAQPage" && schema.mainEntity.length === tool.faq.length)).toBe(true);
    titles.add(await page.title());
    descriptions.add(await page.locator("meta[name='description']").getAttribute("content") || "");
  }
  expect(titles.size).toBe(tools.length);
  expect(descriptions.size).toBe(tools.length);
});

test("tool FAQs and policy lists collapse to one column on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const homeFaqColumns = await page.locator(".home-seo .faq-list").evaluate(el =>
    getComputedStyle(el).gridTemplateColumns.split(" ").length
  );
  expect(homeFaqColumns).toBe(1);

  await page.goto("/json-validator");
  const faqColumns = await page.locator(".tool-faq .faq-list").evaluate(el =>
    getComputedStyle(el).gridTemplateColumns.split(" ").length
  );
  expect(faqColumns).toBe(1);

  await page.goto("/privacy-policy");
  const policyListColumns = await page.locator(".site-policy-page .site-page-sections ul").first().evaluate(el =>
    getComputedStyle(el).gridTemplateColumns.split(" ").length
  );
  expect(policyListColumns).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
});

test("opening an FAQ does not stretch the item in the adjacent column", async ({ page }) => {
  await page.goto("/csv-to-json");
  const columns = page.locator(".tool-faq .faq-column");
  const columnLayout = await columns.evaluateAll(elements => {
    const boxes = elements.map(el => el.getBoundingClientRect());
    return {
      widthDifference: Math.abs(boxes[0].width - boxes[1].width),
      gap: boxes[1].left - boxes[0].right,
      firstItemWidth: elements[0].querySelector(".faq-item")?.getBoundingClientRect().width ?? 0,
      secondItemWidth: elements[1].querySelector(".faq-item")?.getBoundingClientRect().width ?? 0
    };
  });
  expect(columnLayout.widthDifference).toBeLessThanOrEqual(1);
  expect(columnLayout.gap).toBeGreaterThanOrEqual(24);
  expect(Math.abs(columnLayout.firstItemWidth - columnLayout.secondItemWidth)).toBeLessThanOrEqual(1);
  const leftFirstItem = columns.nth(0).locator(".faq-item").first();
  const rightFirstItem = columns.nth(1).locator(".faq-item").first();
  const initialHeight = await rightFirstItem.evaluate(el => el.getBoundingClientRect().height);
  await expect(rightFirstItem.locator(".faq-index")).toHaveText("06");

  await leftFirstItem.locator(".faq-trigger").click();

  await expect(leftFirstItem).toHaveAttribute("open", "");
  await expect.poll(() => rightFirstItem.evaluate(el => el.getBoundingClientRect().height)).toBe(initialHeight);

  await page.goto("/");
  const homeFaqColumns = await page.locator(".home-seo .faq-list").evaluate(el =>
    getComputedStyle(el).gridTemplateColumns.split(" ").length
  );
  expect(homeFaqColumns).toBe(2);
});

test("sitemap, robots, category navigation, and page budget are launch ready", async ({ page, request }) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const sitemapText = await sitemap.text();
  for (const tool of tools) expect(sitemapText).toContain(`/${tool.slug}`);
  for (const category of categories) expect(sitemapText).toContain(`/tools/${category.id}`);

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  const robotsText = await robots.text();
  expect(robotsText).toContain("Allow: /");
  expect(robotsText).toContain("Sitemap:");

  for (const category of categories) {
    await page.goto(`/tools/${category.id}`);
    await expect(page).toHaveTitle(`${category.name} | CodeFormatterTools`);
    await expect(page.locator("link[rel='canonical']")).toHaveAttribute("href", new RegExp(`/tools/${category.id}$`));
    for (const tool of tools.filter(item => item.category === category.id)) await expect(page.getByRole("link", { name: new RegExp(tool.name) })).toBeVisible();
  }

  await page.goto("/json-to-yaml");
  await page.waitForLoadState("networkidle");
  const transferred = await page.evaluate(() => performance.getEntriesByType("resource").filter(entry => entry.initiatorType === "script").reduce((sum, entry) => sum + ((entry as PerformanceResourceTiming).transferSize || 0), 0));
  expect(transferred).toBeLessThan(1_200_000);
});
