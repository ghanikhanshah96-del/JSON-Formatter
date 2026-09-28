import { test, expect } from "@playwright/test";
import { fillAndRun, fillToolInput, runTool } from "./tool-helpers";

test("tool pages have server rendered metadata and working JSON processing", async ({ page }) => {
  await page.goto("/json-formatter");
  await expect(page).toHaveTitle(/JSON Formatter/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/json-formatter$/);
  await expect(page.getByRole("heading", { name: "JSON Formatter Online." })).toBeVisible();
  await fillAndRun(page, '{"id":9123372036854000123,"a":1,"a":2}');
  await expect(page.getByText("Completed with warnings")).toBeVisible();
  await expect(page.getByText(/Duplicate key "a"/)).toBeVisible();
  await expect(page.locator(".output-pane .cm-content")).toContainText("9123372036854000123");
});

test("editing clears output until the action button is clicked again", async ({ page }) => {
  await page.goto("/json-minifier");
  await fillAndRun(page, '{ "old": 1 }');
  await expect(page.locator(".output-pane .cm-content")).toContainText('{"old":1}');
  await fillToolInput(page, '{ "new": 2 }');
  await expect(page.locator(".output-pane .cm-content")).toHaveCount(0);
  await expect(page.locator(".status-message")).toContainText(/click the button to run/i);
  await runTool(page);
  await expect(page.locator(".output-pane .cm-content")).toContainText('{"new":2}');
});

test("theme persists and narrow layout has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("codeformattertools.theme", "light"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: /Switch to dark theme/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("tool input is absent from outgoing requests", async ({ page }) => {
  const sentinel = "PRIVATE_PHASE0_SENTINEL_58291";
  const requests: string[] = [];
  page.on("request", request => requests.push(`${request.url()} ${request.postData() || ""}`));
  await page.goto("/json-validator");
  await fillAndRun(page, `{"secret":"${sentinel}"}`);
  await expect(page.getByText("Valid input")).toBeVisible();
  expect(requests.some(request => request.includes(sentinel))).toBe(false);
});

test("homepage stays within its initial script budget", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const scripts = await page.evaluate(() => performance.getEntriesByType("resource").filter(entry => entry.initiatorType === "script").map(entry => ({ name: entry.name, transferSize: (entry as PerformanceResourceTiming).transferSize })));
  const transferred = scripts.reduce((sum, script) => sum + script.transferSize, 0);
  console.log(`Homepage script transfer: ${transferred} bytes`);
  expect(transferred).toBeLessThan(500_000);
  expect(scripts.some(script => script.name.includes("tool.worker"))).toBe(false);
});

test("homepage category chips filter in place without navigation", async ({ page }) => {
  await page.goto("/");
  const grid = page.locator(".tools-browser .tool-grid");
  await expect(grid.locator(".tool-card")).toHaveCount(15);
  await page.locator('label[for="tools-cat-json"]').click();
  await expect(page).toHaveURL(/\/(?:$|\?|#)/);
  await expect(grid.locator(".tool-card:visible")).toHaveCount(4);
  await expect(grid.getByRole("heading", { name: "JSON Formatter" })).toBeVisible();
  await expect(grid.locator('.tool-card[data-category="sql"]:visible')).toHaveCount(0);
  await page.locator('label[for="tools-cat-converters"]').click();
  await expect(grid.locator(".tool-card:visible")).toHaveCount(4);
  await expect(grid.getByRole("heading", { name: "JSON to XML Converter" })).toBeVisible();
  await expect(grid.locator('.tool-card[data-category="json"]:visible')).toHaveCount(0);
  await page.locator('label[for="tools-cat-all"]').click();
  await expect(grid.locator(".tool-card:visible")).toHaveCount(15);
});

test("tools do not auto-process without the action button", async ({ page }) => {
  await page.goto("/json-formatter");
  await fillToolInput(page, '{"a":1}');
  await expect(page.locator(".status-message")).toHaveText("Ready — click the button to run");
  await expect(page.locator(".output-pane .cm-content")).toHaveCount(0);
  await runTool(page);
  await expect(page.locator(".output-pane .cm-content")).toContainText('"a": 1');
});
