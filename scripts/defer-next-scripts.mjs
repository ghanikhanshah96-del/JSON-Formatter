/**
 * Defer Next.js client bundles until first user input on every prerendered page.
 * Interaction arms workspace open via sessionStorage + pointerdown.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../apps/web/.next/server/app");

const LOADER = `(function(){var loaded=false;function go(){if(loaded)return;loaded=true;var nodes=document.querySelectorAll("script[data-cft-defer]");nodes.forEach(function(n){var s=document.createElement("script");s.src=n.getAttribute("data-src");s.async=true;if(n.getAttribute("data-type"))s.type=n.getAttribute("data-type");document.body.appendChild(s);});}["pointerdown","keydown","touchstart"].forEach(function(ev){window.addEventListener(ev,go,{once:true,passive:true});});})();`;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".html") && !name.startsWith("_")) out.push(full);
  }
  return out;
}

let changed = 0;
for (const file of walk(root)) {
  let html = readFileSync(file, "utf8");
  if (html.includes("data-cft-defer")) continue;

  const next = html.replace(
    /<script src="(\/_next\/static\/[^"]+)"([^>]*)><\/script>/g,
    (match, src, attrs) => {
      if (src.includes("polyfills")) return match;
      const type = /type="module"/.test(attrs) ? "module" : "";
      return `<script type="text/plain" data-cft-defer data-src="${src}"${type ? ` data-type="${type}"` : ""}></script>`;
    }
  );

  if (next === html) continue;

  html = next.includes("data-cft-loader")
    ? next
    : next.replace("</body>", `<script data-cft-loader>${LOADER}</script></body>`);

  writeFileSync(file, html);
  changed += 1;
}

console.log(`Deferred Next.js scripts in ${changed} HTML files.`);
