import { expect, test } from "@playwright/test";
import { fillAndRun } from "./tool-helpers";

test("observability scripts initialize without exposing tool input", async ({ page }) => {
  const sentinel = "PRIVATE_PHASE8_SENTINEL_19427";
  const requests: string[] = [];
  page.on("request", request => requests.push(`${request.url()} ${request.postData() || ""}`));
  await page.goto("/json-formatter");
  // Analytics only mount when Vercel/analytics env is enabled; assert privacy either way.
  const analyticsReady = await page.evaluate(() =>
    typeof (window as Window & { va?: unknown; vaq?: unknown }).va === "function"
    || Array.isArray((window as Window & { vaq?: unknown }).vaq)
  ).catch(() => false);
  if (analyticsReady) {
    await expect.poll(() => page.evaluate(() => typeof (window as Window & { si?: unknown; siq?: unknown }).si === "function" || Array.isArray((window as Window & { siq?: unknown }).siq))).toBe(true);
  }
  await fillAndRun(page, `{"secret":"${sentinel}","ok":true}`);
  await expect(page.locator(".output-pane .cm-content")).toContainText('"ok": true');
  expect(requests.some(request => request.includes(sentinel))).toBe(false);
});

test("related-tool clicks remain navigable and measurable", async ({ page }) => {
  await page.goto("/json-formatter");
  await page.locator(".related").getByRole("link", { name: /JSON Validator/ }).click();
  await expect(page).toHaveURL(/\/json-validator$/);
  await expect(page.getByRole("heading", { name: "JSON Validator Online." })).toBeVisible();
});
