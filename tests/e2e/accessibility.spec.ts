import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const representativePages = [
  "/",
  "/tools",
  "/json-formatter",
  "/blog",
  "/blog/how-to-download-a-json-file",
  "/about-us",
  "/privacy-policy",
  "/contact-us",
  "/team/codeformattertools-editorial",
  "/admin/login",
] as const;

for (const path of representativePages) {
  test(`${path} has no automatically detectable WCAG A/AA violations`, async ({ page }) => {
    const response = await page.goto(path, { waitUntil: "networkidle" });
    expect(response?.ok(), `${path} returned HTTP ${response?.status()}`).toBe(true);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}
