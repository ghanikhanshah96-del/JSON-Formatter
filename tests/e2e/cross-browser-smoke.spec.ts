import { expect, test } from "@playwright/test";
import { expectThemeOptionAbsent } from "./theme-select";
import { fillAndRun, openWorkspace } from "./tool-helpers";

test("core formatter flow works across browsers", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Free Online Developer Tools/ })).toBeVisible();
  await page.goto("/json-formatter");
  await fillAndRun(page, '{"id":9123372036854000123}');
  await expect(page.locator(".output-pane .cm-content")).toContainText("9123372036854000123");
  await page.goto("/json-validator");
  await fillAndRun(page, '{"ok":true}');
  await expect(page.getByText("Valid input")).toBeVisible();
  await page.goto("/json-minifier");
  await fillAndRun(page, '{"space": true}');
  await expect(page.locator(".output-pane .cm-content")).toContainText('{"space":true}');
  await page.goto("/json-sorter");
  await fillAndRun(page, '{"b":2,"a":1,"items":[{"z":1,"a":2}]}');
  await expect(page.locator(".output-pane .cm-content")).toContainText('"a": 1');
  await page.goto("/sql-formatter");
  await fillAndRun(page, "select * from users");
  await expect(page.locator(".output-pane .cm-content")).toContainText("SELECT");
  await page.goto("/yaml-formatter");
  await openWorkspace(page);
  await expectThemeOptionAbsent(page, "Indent", "Tab");
  await fillAndRun(page, "service: {name: api}");
  await expect(page.locator(".output-pane .cm-content")).toContainText("name: api");
  await page.goto("/xml-formatter");
  await fillAndRun(page, "<root><item>ok</item></root>");
  await expect(page.locator(".output-pane .cm-content")).toContainText("<item>ok</item>");
  await page.goto("/json-to-yaml");
  await fillAndRun(page, '{"service":"api"}');
  await expect(page.locator(".output-pane .cm-content")).toContainText("service");
  await expect(page.locator(".output-pane .cm-content")).toContainText("api");
  for (const route of ["/about", "/privacy", "/contact"]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
  }
});

test("mobile layout has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/json-formatter");
  await fillAndRun(page, '{"ok":true}');
  await expect(page.locator(".output-pane .cm-content")).toContainText('"ok": true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/privacy");
  await expect(page.locator("footer")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
