import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../apps/web/public/blog");
mkdirSync(root, { recursive: true });

const posts = [
  ["format-json-online", "JSON", "{ }", "#22d3ee", "Format JSON"],
  ["format-json-api-response", "API", "{ }", "#818cf8", "API Response"],
  ["validate-json-before-ship", "CHECK", "✓", "#34d399", "Validate JSON"],
  ["minify-json-payloads", "SIZE", "⟦⟧", "#f472b6", "Minify JSON"],
  ["sort-json-keys-for-diffs", "SORT", "A↓", "#a78bfa", "Sort Keys"],
  ["format-sql-queries", "SQL", "SQL", "#38bdf8", "Format SQL"],
  ["yaml-kubernetes-config", "K8s", "≡", "#2dd4bf", "YAML K8s"],
  ["validate-yaml-configs", "YAML", "YAML", "#4ade80", "Validate YAML"],
  ["format-xml-documents", "XML", "</>", "#fb7185", "Format XML"],
  ["convert-json-to-yaml", "CONV", "⇄", "#c084fc", "JSON → YAML"],
  ["convert-csv-to-json", "CSV", "▦", "#fbbf24", "CSV → JSON"],
  ["private-browser-developer-tools", "LOCAL", "🛡", "#67e8f9", "Private Tools"]
];

function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

for (const [slug, tag, glyph, accent, label] of posts) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="${esc(label)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1020"/>
      <stop offset="55%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="glow" x1="0.2" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </linearGradient>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill="#ffffff" fill-opacity="0.08"/>
    </pattern>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <rect width="1200" height="675" fill="url(#dots)"/>
  <circle cx="980" cy="120" r="220" fill="url(#glow)"/>
  <circle cx="180" cy="560" r="180" fill="${accent}" fill-opacity="0.12"/>
  <rect x="64" y="64" width="1072" height="547" rx="28" fill="#0b1220" fill-opacity="0.55" stroke="${accent}" stroke-opacity="0.35" stroke-width="2"/>
  <rect x="96" y="104" width="120" height="36" rx="18" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-opacity="0.55"/>
  <text x="156" y="128" text-anchor="middle" fill="${accent}" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="2">${esc(tag)}</text>
  <text x="600" y="340" text-anchor="middle" fill="${accent}" font-family="Consolas, monospace" font-size="112" font-weight="700">${esc(glyph)}</text>
  <text x="600" y="470" text-anchor="middle" fill="#e5e7eb" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="700">${esc(label)}</text>
  <text x="600" y="520" text-anchor="middle" fill="#94a3b8" font-family="Segoe UI, Arial, sans-serif" font-size="20">CodeFormatterTools Blog</text>
</svg>`;
  writeFileSync(join(root, `${slug}.svg`), svg);
}

console.log(`Wrote ${posts.length} blog covers to ${root}`);
