import { test, expect } from "@playwright/test";
import { pickThemeValue } from "./theme-select";
import { fillAndRun, openWorkspace, runTool } from "./tool-helpers";

test("XML formatter handles attributes, comments, CDATA, and indentation", async ({ page }) => {
  await page.goto("/xml-formatter");
  await expect(page).toHaveTitle(/XML Formatter/);
  await openWorkspace(page);
  await pickThemeValue(page, "Indent", "4");
  await fillAndRun(page, '<root><item id="1">A &amp; B</item><!-- note --><![CDATA[<raw>]]></root>');
  const output = page.locator(".output-pane .cm-content");
  await expect(output).toContainText('<item id="1">A &amp; B</item>');
  await expect(output).toContainText("<!-- note -->");
  await expect(output).toContainText("<![CDATA[<raw>]]>");
  await expect(page.locator(".output-pane .cm-line").nth(1)).toHaveText('    <item id="1">A &amp; B</item>');
});

test("XML validator locates syntax errors and blocks DOCTYPE", async ({ page }) => {
  await page.goto("/xml-validator");
  await fillAndRun(page, "<root><item></root>");
  await expect(page.locator(".diagnostic.error")).toContainText(/line 1, column/);
  await fillAndRun(page, '<!DOCTYPE r SYSTEM "https://example.invalid/x.dtd"><r/>');
  await expect(page.locator(".diagnostic.error")).toContainText(/DOCTYPE/);
  await fillAndRun(page, "<root/>");
  await expect(page.getByText("Valid input")).toBeVisible();
});

test("XML category and mobile file flow work", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tools/xml");
  await expect(page.getByRole("link", { name: /XML Formatter/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /XML Validator/ })).toBeVisible();
  await page.goto("/xml-formatter");
  await openWorkspace(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "sample.xml", mimeType: "application/xml", buffer: Buffer.from("<root><item>ok</item></root>") });
  await runTool(page);
  await expect(page.locator(".output-pane .cm-content")).toContainText("<item>ok</item>");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("XML source never appears in outgoing requests", async ({ page }) => {
  const sentinel = "PRIVATE_XML_SENTINEL_54129";
  const requests: string[] = [];
  page.on("request", request => requests.push(`${request.url()} ${request.postData() || ""}`));
  await page.goto("/xml-validator");
  await fillAndRun(page, `<root>${sentinel}</root>`);
  await expect(page.getByText("Valid input")).toBeVisible();
  expect(requests.some(request => request.includes(sentinel))).toBe(false);
});
