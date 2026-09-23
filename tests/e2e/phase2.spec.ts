import { test, expect } from "@playwright/test";
import { expectThemeValue, pickThemeValue, themeSelect } from "./theme-select";

test("SQL page exposes the planned controls and formats a query", async ({ page }) => {
  await page.goto("/sql-formatter");
  await expect(page).toHaveTitle(/SQL Formatter/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/sql-formatter$/);
  await expectThemeValue(page, "Dialect", "sql");
  await expectThemeValue(page, "Indent", "2");
  await expectThemeValue(page, "Keywords", "upper");
  await expectThemeValue(page, "Query spacing", "1");
  await page.locator(".editor-pane").first().locator(".cm-content").fill("select id,name from users where active = true;");
  await expect(page.locator(".output-pane .cm-content")).toContainText("SELECT");
  await expect(page.locator(".output-pane .cm-content")).toContainText("FROM users");
});

test("SQL dialect and layout options affect output and persist", async ({ page }) => {
  await page.goto("/sql-formatter");
  await pickThemeValue(page, "Dialect", "sqlite");
  await pickThemeValue(page, "Keywords", "lower");
  await pickThemeValue(page, "Indent", "4");
  await pickThemeValue(page, "Query spacing", "3");
  await page.locator(".editor-pane").first().locator(".cm-content").fill("SELECT id FROM users WHERE id = :id; SELECT name FROM users;");
  await expect(page.locator(".output-pane .cm-content")).toContainText(":id");
  await expect(page.locator(".output-pane .cm-content")).toContainText("select");
  await expect(page.locator(".output-pane .cm-content")).not.toContainText("SELECT");
  const result = await page.locator(".output-pane .cm-content").innerText();
  expect(result).toMatch(/;\n{3,}select/);
  await page.reload();
  await expectThemeValue(page, "Dialect", "sqlite");
  await expectThemeValue(page, "Keywords", "lower");
  await expectThemeValue(page, "Indent", "4");
  await expectThemeValue(page, "Query spacing", "3");
});

test("SQL comments, file input, copy, download, and errors work", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/sql-formatter");
  await page.locator('input[type="file"]').setInputFiles({ name: "query.sql", mimeType: "text/plain", buffer: Buffer.from("-- keep this comment\nselect id from users where id = ?;") });
  await expect(page.locator(".output-pane .cm-content")).toContainText("-- keep this comment");
  await expect(page.locator(".output-pane .cm-content")).toContainText("?");
  await page.getByRole("button", { name: "Copy" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("SELECT");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  expect((await download).suggestedFilename()).toBe("sql-formatter.sql");
  await page.locator(".editor-pane").first().locator(".cm-content").fill("select 'unclosed");
  await expect(page.locator(".diagnostic.error")).toContainText(/line 1, column/);
  await expect(page.locator(".diagnostic-excerpt")).toContainText("^");
  await page.getByRole("button", { name: /Reset/ }).click();
  await expect(page.locator(".output-pane .cm-content")).toBeEmpty();
});

test("SQL category and mobile workspace are usable without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tools/sql");
  await expect(page.getByRole("link", { name: /SQL Formatter/ })).toBeVisible();
  await page.goto("/sql-formatter");
  await expect(themeSelect(page, "Dialect")).toBeVisible();
  await page.locator(".editor-pane").first().locator(".cm-content").fill("select 1;");
  await expect(page.locator(".output-pane .cm-content")).toContainText("SELECT 1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("SQL input never appears in outgoing requests", async ({ page }) => {
  const sentinel = "PRIVATE_SQL_SENTINEL_73294";
  const requests: string[] = [];
  page.on("request", request => requests.push(`${request.url()} ${request.postData() || ""}`));
  await page.goto("/sql-formatter");
  await page.locator(".editor-pane").first().locator(".cm-content").fill(`select '${sentinel}' as secret;`);
  await expect(page.locator(".output-pane .cm-content")).toContainText(sentinel);
  expect(requests.some(request => request.includes(sentinel))).toBe(false);
});
