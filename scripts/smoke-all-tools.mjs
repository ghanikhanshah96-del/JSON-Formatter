/**
 * Functional smoke against a running next server (dev or start).
 * Usage: node scripts/smoke-all-tools.mjs
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

async function openWorkspace(page) {
  const open = page.getByRole("button", { name: /Open workspace/i });
  if (await open.count()) await open.click();
  await page.locator(".run-button").waitFor({ state: "visible", timeout: 20_000 });
}

async function fillInput(page, text) {
  await openWorkspace(page);
  const pane = page.locator(".editor-pane").first();
  const textarea = pane.locator("textarea");
  const cm = pane.locator(".cm-content");
  if (await textarea.count()) await textarea.first().fill(text);
  else await cm.fill(text);
}

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

  await page.goto(`${BASE}/contact`, { waitUntil: "domcontentloaded" });
  if (!(await page.locator("form.contact-form").count())) {
    failures.push("contact page missing form");
  } else if (!(await page.getByRole("button", { name: /send message/i }).count())) {
    failures.push("contact form missing submit button");
  }

  for (const item of cases) {
    try {
      await page.goto(`${BASE}/${item.slug}`, { waitUntil: "domcontentloaded" });
      await expectVisible(page, "h1");
      const privacy = page.locator(".workspace-privacy-bar");
      if (!(await privacy.count())) failures.push(`${item.slug} missing privacy bar`);

      await fillInput(page, item.fill);

      // Assert no auto-process before Run
      await page.waitForTimeout(400);
      const beforeOut = (await page.locator(".output-pane .cm-content").innerText().catch(() => "")).trim();
      const statusText = (await page.locator(".status-message").innerText().catch(() => "")).toLowerCase();
      if (item.expectOut && beforeOut.includes(item.expectOut)) {
        failures.push(`${item.slug}: auto-processed before Run click`);
      }
      if (/valid input|completed successfully/.test(statusText)) {
        failures.push(`${item.slug}: success status before Run click (${statusText})`);
      }

      await page.locator(".run-button").click();

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

  await page.goto(`${BASE}/`);
  const theme = page.getByRole("button", { name: /Switch to (dark|light) theme|Use system theme/i });
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
