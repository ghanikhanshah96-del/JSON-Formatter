import { expect, test } from "@playwright/test";
import { fillAndRun, fillToolInput, openWorkspace } from "./tool-helpers";

test("production security headers are present and the app still executes", async ({ page, request }) => {
  const response = await request.get("/json-formatter");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).toContain("script-src-attr 'none'");
  expect(headers["content-security-policy"]).toContain("form-action 'self'");
  expect(headers["content-security-policy"]).not.toContain("unsafe-eval");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  await page.goto("/json-formatter");
  await fillAndRun(page, '{"ok":true}');
  await expect(page.locator(".output-pane .cm-content")).toContainText('"ok": true');
});

test("CodeMirror editors expose accessible textbox names", async ({ page }) => {
  await page.goto("/json-formatter");
  await openWorkspace(page);
  await expect(page.getByRole("textbox", { name: "Input JSON" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Formatted JSON" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Format JSON|Processing/ })).toBeVisible();
  await fillAndRun(page, "{bad,}");
  await expect(page.locator(".status-message")).toBeVisible();
  await expect(page.locator(".diagnostic.error")).toContainText(/JSON|Unexpected|Expected/i);
});

test("legacy browser preferences migrate to CodeFormatterTools storage keys", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("formatbase.theme", "dark");
    localStorage.setItem("codeformattools.theme", "light");
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const values = await page.evaluate(() => ({
    next: localStorage.getItem("codeformattertools.theme"),
    oldBrand: localStorage.getItem("formatbase.theme"),
    oldCodeFormat: localStorage.getItem("codeformattools.theme")
  }));
  expect(values).toEqual({ next: "light", oldBrand: null, oldCodeFormat: null });
});

for (const [path, sentinel] of [
  ["/json-formatter", "CODEFORMATTERTOOLS_PRIVATE_SENTINEL_987654321"],
  ["/sql-formatter", "CODEFORMATTERTOOLS_PRIVATE_SENTINEL_987654321"],
  ["/yaml-formatter", "CODEFORMATTERTOOLS_PRIVATE_SENTINEL_987654321"],
  ["/xml-formatter", "CODEFORMATTERTOOLS_PRIVATE_SENTINEL_987654321"]
] as const) {
  test(`tool input is not transmitted for ${path}`, async ({ page }) => {
    const requests: string[] = [];
    page.on("request", request => requests.push(`${request.url()} ${request.postData() || ""}`));
    await page.goto(path);
    let sample = `{"secret":"${sentinel}"}`;
    if (path.includes("sql")) sample = `select '${sentinel}' as secret`;
    else if (path.includes("yaml")) sample = `secret: ${sentinel}`;
    else if (path.includes("xml")) sample = `<root>${sentinel}</root>`;
    await fillAndRun(page, sample);
    await expect(page.locator(".status-message")).not.toContainText("Ready when you are");
    expect(requests.some(request => request.includes(sentinel))).toBe(false);
  });
}

test("reduced motion preference disables active animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/json-formatter");
  await fillToolInput(page, '{"ok":true}');
  const duration = await page.locator(".status-dot").evaluate(element => getComputedStyle(element).animationDuration);
  const name = await page.locator(".status-dot").evaluate(element => getComputedStyle(element).animationName);
  expect(duration === "0.001ms" || duration === "0s" || name === "none").toBe(true);
});

test("worker postMessage failure recovers on the next operation", async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    let failedOnce = false;
    window.Worker = class RecoverableWorker extends NativeWorker {
      postMessage(message: unknown, transfer?: Transferable[]): void {
        if (!failedOnce) {
          failedOnce = true;
          throw new Error("simulated worker postMessage failure");
        }
        super.postMessage(message, transfer ?? []);
      }
    };
  });
  await page.goto("/json-formatter");
  await fillAndRun(page, '{"first":true}');
  await expect(page.locator(".diagnostic.error")).toContainText(/worker could not process/i);
  await fillAndRun(page, '{"second":true}');
  await expect(page.locator(".output-pane .cm-content")).toContainText('"second": true');
});
