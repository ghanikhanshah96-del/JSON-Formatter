import { test, expect } from "@playwright/test";
import { expectThemeOptionAbsent, pickThemeValue } from "./theme-select";
import { fillAndRun, openWorkspace, runTool } from "./tool-helpers";

test("YAML formatter handles anchors, comments, and indentation", async ({ page }) => {
  await page.goto("/yaml-formatter");
  await expect(page).toHaveTitle(/YAML Formatter/);
  await openWorkspace(page);
  await expectThemeOptionAbsent(page, "Indent", "Tab");
  await pickThemeValue(page, "Indent", "4");
  await fillAndRun(page, "base: &base {a: 1}\ncopy: *base\n");
  await expect(page.locator(".output-pane .cm-content")).toContainText("&base");
  await expect(page.locator(".output-pane .cm-content")).toContainText("*base");
  await expect(page.locator(".output-pane .cm-line").nth(1)).toHaveText("    a: 1");
  await pickThemeValue(page, "Indent", "2");
  await runTool(page);
  await expect(page.locator(".output-pane .cm-line").nth(1)).toHaveText("  a: 1");
});

test("YAML formatter does not destructively remove comments", async ({ page }) => {
  await page.goto("/yaml-formatter");
  await fillAndRun(page, "# application config\nserver:\n  # production host\n  host: example.com\n");
  await expect(page.locator(".diagnostic.warning")).toContainText(/comments are not reformatted/i);
  await expect(page.locator(".output-pane .cm-content")).toHaveCount(0);
  await expect(page.locator(".output-pane .pane-footer")).toContainText(/No output yet/i);
});

test("YAML validator reports syntax and rejects recursive aliases", async ({ page }) => {
  await page.goto("/yaml-validator");
  await fillAndRun(page, "name: [oops");
  await expect(page.locator(".diagnostic.error")).toContainText(/line 1, column/);
  await fillAndRun(page, "loop: &loop\n  self: *loop");
  await expect(page.locator(".diagnostic.error")).toContainText(/node safety limit/);
  await fillAndRun(page, "name: api");
  await expect(page.getByText("Valid input")).toBeVisible();
});

test("YAML category, file action, and mobile layout work", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tools/yaml");
  await expect(page.getByRole("link", { name: /YAML Formatter/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /YAML Validator/ })).toBeVisible();
  await page.goto("/yaml-formatter");
  await openWorkspace(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "config.yml", mimeType: "text/plain", buffer: Buffer.from("service: {name: api}") });
  await runTool(page);
  await expect(page.locator(".output-pane .cm-content")).toContainText("name: api");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("YAML source is absent from outgoing requests", async ({ page }) => {
  const sentinel = "PRIVATE_YAML_SENTINEL_31683";
  const requests: string[] = [];
  page.on("request", request => requests.push(`${request.url()} ${request.postData() || ""}`));
  await page.goto("/yaml-validator");
  await fillAndRun(page, `secret: ${sentinel}`);
  await expect(page.getByText("Valid input")).toBeVisible();
  expect(requests.some(request => request.includes(sentinel))).toBe(false);
});
