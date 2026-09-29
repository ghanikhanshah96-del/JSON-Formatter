import { createRequire } from "module";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "apps", "web", "public");
const jobs = [
  ["icon-192.svg", "icon-192.png", 192],
  ["icon-512.svg", "icon-512.png", 512],
  ["apple-touch-icon.svg", "apple-touch-icon.png", 180],
  ["og-image.svg", "og-image.png", 1200, 630]
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const [src, out, w, h = w] of jobs) {
  const svg = readFileSync(join(pub, src), "utf8");
  const sized = svg.replace(/<svg\b/, `<svg width="${w}" height="${h}"`);
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:#fff">${sized}</body></html>`
  );
  await page.locator("svg").screenshot({ path: join(pub, out) });
  console.log("wrote", out);
}

await browser.close();
