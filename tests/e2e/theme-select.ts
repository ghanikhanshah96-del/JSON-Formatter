import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

/** ThemeSelect trigger for a toolbar option (Indent, Mode, Dialect, …). */
export function themeSelect(page: Page, label: string): Locator {
  return page.locator(".theme-select").filter({ has: page.locator(".theme-select-label", { hasText: label }) }).locator(".theme-select-trigger");
}

export async function expectThemeValue(page: Page, label: string, value: string) {
  await expect(themeSelect(page, label)).toHaveAttribute("data-value", value);
}

export async function pickThemeValue(page: Page, label: string, value: string) {
  const trigger = themeSelect(page, label);
  await trigger.click();
  await page.locator(`.theme-select-menu [role='option'][data-value='${value}']`).click();
  await expectThemeValue(page, label, value);
}

export async function expectThemeOptionAbsent(page: Page, label: string, optionLabel: string) {
  const trigger = themeSelect(page, label);
  await trigger.click();
  await expect(page.locator(".theme-select-menu [role='option']", { hasText: optionLabel })).toHaveCount(0);
  await page.keyboard.press("Escape");
}
