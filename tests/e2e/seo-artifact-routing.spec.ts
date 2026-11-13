import { expect, test } from "@playwright/test";

const toolSlugs = [
  "json-formatter",
  "json-validator",
  "json-minifier",
  "json-sorter",
  "sql-formatter",
  "yaml-formatter",
  "yaml-validator",
  "xml-formatter",
  "xml-validator",
  "json-to-yaml",
  "yaml-to-json",
  "json-to-xml",
  "xml-to-json",
  "json-to-csv",
  "csv-to-json",
];

test("numeric React-key artifacts permanently redirect to canonical tool routes", async ({ request }) => {
  for (const slug of toolSlugs) {
    for (const suffix of [0, 16]) {
      const response = await request.get(`/${slug}-${suffix}`, { maxRedirects: 0 });
      expect(response.status(), `${slug}-${suffix}`).toBe(308);
      expect(response.headers().location, `${slug}-${suffix}`).toBe(`/${slug}`);
    }
  }
});

test("serialized link keys cannot be mistaken for tool URLs", async ({ page, request }) => {
  const blogResponse = await request.get("/blog/how-to-sort-json-file");
  expect(blogResponse.status()).toBe(200);
  expect(await blogResponse.text()).not.toContain("/json-sorter-0");

  const toolResponse = await request.get("/xml-formatter");
  expect(toolResponse.status()).toBe(200);
  expect(await toolResponse.text()).not.toMatch(/["\\]xml-validator-0/);

  await page.goto("/blog/how-to-sort-json-file");
  expect(await page.locator('a[href="/json-sorter"]').count()).toBeGreaterThan(0);
  await expect(page.locator('a[href="/json-sorter-0"]')).toHaveCount(0);

  await page.goto("/xml-formatter");
  expect(await page.locator('a[href="/xml-validator"]').count()).toBeGreaterThan(0);
  await expect(page.locator('a[href="/xml-validator-0"]')).toHaveCount(0);
});
