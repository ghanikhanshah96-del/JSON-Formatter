/**
 * Functional smoke against a running next dev server.
 * Usage: node --experimental-strip-types scripts/smoke-all-tools.mjs
 */
const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:3000";

const cases = [
  { slug: "json-formatter", fill: '{"b":2,"a":1}', expectOut: '"a"' },
  { slug: "json-validator", fill: '{"ok":true}', expectText: "Valid input" },
  { slug: "json-minifier", fill: '{ "x": 1 }', expectOut: '{"x":1}' },
  { slug: "json-sorter", fill: '{"z":1,"a":2}', expectOut: '"a"' },
  { slug: "sql-formatter", fill: "select * from users", expectOut: "SELECT" },
  { slug: "yaml-formatter", fill: "service: {name: api}", expectOut: "name:" },
  { slug: "yaml-validator", fill: "ok: true", expectText: "Valid input" },
  { slug: "xml-formatter", fill: "<root><item>ok</item></root>", expectOut: "<item>" },
  { slug: "xml-validator", fill: "<root><item>ok</item></root>", expectText: "Valid input" },
  { slug: "json-to-yaml", fill: '{"service":"api"}', expectOut: "service" },
  { slug: "yaml-to-json", fill: "service: api", expectOut: "service" },
  { slug: "json-to-csv", fill: '[{"name":"A","age":1}]', expectOut: "name" },
  { slug: "csv-to-json", fill: "name,age\nA,1", expectOut: "name" },
  { slug: "json-to-xml", fill: '{"root":{"item":"ok"}}', expectOut: "root" },
  { slug: "xml-to-json", fill: "<root><item>ok</item></root>", expectOut: "root" }
];

async function main() {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const failures = [];

  for (const path of ["/", "/learn", "/performance", "/contact", "/about", "/privacy"]) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    if (!res?.ok()) failures.push(`${path} status ${res?.status()}`);
    const h1 = page.locator("h1");
    if (!(await h1.count())) failures.push(`${path} missing h1`);
  }

  for (const item of cases) {
    try {
      await page.goto(`${BASE}/${item.slug}`, { waitUntil: "domcontentloaded" });
      await expectVisible(page, "h1");
      const privacy = page.locator(".workspace-privacy-bar");
      if (!(await privacy.count())) failures.push(`${item.slug} missing privacy bar`);
      const input = page.locator(".editor-pane").first().locator(".cm-content");
      await input.click();
      await page.keyboard.press("Control+A");
      await page.keyboard.type(item.fill, { delay: 0 });
      if (item.expectText) {
        await page.getByText(item.expectText).first().waitFor({ timeout: 15000 });
      }
      if (item.expectOut) {
        await page.locator(".output-pane .cm-content").getByText(item.expectOut).first().waitFor({ timeout: 15000 });
      }
      console.log(`ok ${item.slug}`);
    } catch (error) {
      failures.push(`${item.slug}: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`fail ${item.slug}`);
    }
  }

  // Theme toggle smoke
  await page.goto(`${BASE}/`);
  const theme = page.getByRole("button", { name: /Theme:/ });
  await theme.click();
  await theme.click();
  const themeAttr = await page.locator("html").getAttribute("data-theme");
  if (!themeAttr) failures.push("theme attribute missing after toggle");

  await browser.close();
  if (failures.length) {
    console.error("\nFAILURES:\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log(`\nAll ${cases.length} tools + core pages passed.`);
}

async function expectVisible(page, selector) {
  await page.locator(selector).first().waitFor({ state: "visible", timeout: 10000 });
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
