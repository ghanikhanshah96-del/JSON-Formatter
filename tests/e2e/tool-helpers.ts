import { expect, type Page } from "@playwright/test";

/** Wait for the interactive workspace (tool pages auto-hydrate). */
export async function openWorkspace(page: Page) {
  const open = page.getByRole("button", { name: /Open workspace/i });
  if (await open.isVisible().catch(() => false)) {
    await open.click();
  }
  await expect(page.locator(".run-button")).toBeVisible({ timeout: 20_000 });
}

/** Fill the first tool input editor (textarea fallback or CodeMirror). */
export async function fillToolInput(page: Page, text: string) {
  await openWorkspace(page);
  const pane = page.locator(".editor-pane").first();
  const surface = pane.locator("textarea.editor-fallback-textarea, .cm-content").first();
  await expect(surface).toBeVisible({ timeout: 20_000 });

  const fallback = pane.locator("textarea.editor-fallback-textarea");
  if (await fallback.count()) {
    await fallback.fill(text);
  } else {
    const cm = pane.locator(".cm-content");
    await cm.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.insertText(text);
  }

  // Confirm React state accepted the input (run button enables).
  await expect(page.locator(".run-button")).toBeEnabled({ timeout: 15_000 });
}

/** Fill input and click the primary action button (no auto-process). */
export async function fillAndRun(page: Page, text: string) {
  await fillToolInput(page, text);
  const run = page.locator(".run-button");
  await expect(run).toBeEnabled({ timeout: 15_000 });
  await run.click({ timeout: 15_000 });
}

export async function runTool(page: Page) {
  await expect(page.locator(".run-button")).toBeEnabled({ timeout: 15_000 });
  await page.locator(".run-button").click();
}
