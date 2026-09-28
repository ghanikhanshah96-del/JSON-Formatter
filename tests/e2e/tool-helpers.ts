import { expect, type Page } from "@playwright/test";

/** Open the deferred workspace gate if present, then wait for the run control. */
export async function openWorkspace(page: Page) {
  const open = page.getByRole("button", { name: /Open workspace/i });
  if (await open.count()) {
    await open.click();
  }
  await expect(page.locator(".run-button")).toBeVisible({ timeout: 20_000 });
}

/** Fill the first tool input editor (textarea fallback or CodeMirror). */
export async function fillToolInput(page: Page, text: string) {
  await openWorkspace(page);
  const pane = page.locator(".editor-pane").first();
  const fallback = pane.locator("textarea.editor-fallback-textarea");
  const cm = pane.locator(".cm-content");

  if (await fallback.count()) {
    await fallback.fill(text);
  } else if (await cm.count()) {
    await cm.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.insertText(text);
  } else {
    await pane.locator("textarea").first().fill(text);
  }

  // Confirm React state accepted the input (run button enables).
  await expect(page.locator(".run-button")).toBeEnabled({ timeout: 15_000 });
}

/** Fill input and click the primary action button (no auto-process). */
export async function fillAndRun(page: Page, text: string) {
  await fillToolInput(page, text);
  await page.locator(".run-button").click();
}

export async function runTool(page: Page) {
  await expect(page.locator(".run-button")).toBeEnabled({ timeout: 15_000 });
  await page.locator(".run-button").click();
}
