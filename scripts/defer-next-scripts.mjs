/**
 * Defer Next.js client bundles until first user input on marketing pages.
 * Tool pages hydrate immediately so the workspace is paste-ready.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../apps/web/.next/server/app");

const LOADER = `(function(){var loaded=false;function go(){if(loaded)return;loaded=true;var nodes=document.querySelectorAll("script[data-cft-defer]");nodes.forEach(function(n){var s=document.createElement("script");s.src=n.getAttribute("data-src");s.async=true;if(n.getAttribute("data-type"))s.type=n.getAttribute("data-type");document.body.appendChild(s);});}if(document.getElementById("tool-workspace-root")||document.getElementById("workspace")){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go();}else{["pointerdown","keydown","touchstart"].forEach(function(ev){window.addEventListener(ev,go,{once:true,passive:true});});}})();`;

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

  // Undo a previous defer pass so the loader can be refreshed idempotently.
  html = html.replace(/<script data-cft-loader>[\s\S]*?<\/script>/g, "");
  html = html.replace(
    /<script type="text\/plain" data-cft-defer data-src="([^"]+)"(\s+data-type="module")?><\/script>/g,
    (_, src, typeAttr) => `<script src="${src}"${typeAttr ? ' type="module"' : ""}></script>`
  );

  const next = html.replace(
    /<script src="(\/_next\/static\/[^"]+)"([^>]*)><\/script>/g,
    (match, src, attrs) => {
      if (src.includes("polyfills")) return match;
      const type = /type="module"/.test(attrs) ? "module" : "";
      return `<script type="text/plain" data-cft-defer data-src="${src}"${type ? ` data-type="${type}"` : ""}></script>`;
    }
  );

  if (!next.includes("data-cft-defer")) continue;

  html = next.replace("</body>", `<script data-cft-loader>${LOADER}</script></body>`);
  writeFileSync(file, html);
  changed += 1;
}

console.log(`Deferred Next.js scripts in ${changed} HTML files.`);
