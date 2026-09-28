/**
 * Run Lighthouse mobile + desktop against a production URL.
 * Usage: node scripts/lighthouse-audit.mjs [baseUrl]
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const base = process.argv[2] || "http://127.0.0.1:3200";
const outDir = join(process.cwd(), "lighthouse-reports");
mkdirSync(outDir, { recursive: true });

const pages = ["/", "/json-formatter", "/blog", "/contact"];
const forms = [
  { id: "mobile", formFactor: "mobile", screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false } },
  { id: "desktop", formFactor: "desktop", screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false } }
];

function loadReport(slug, formId, outJson) {
  const candidates = [
    outJson,
    join(outDir, `${slug}-${formId}.report.json`),
    join(outDir, `${slug}-${formId}`)
  ];
  for (const candidate of candidates) {
    try {
      const report = JSON.parse(readFileSync(candidate, "utf8"));
      if (report?.categories) return report;
    } catch {
      /* try next */
    }
  }
  return null;
}

function runOne(path, form) {
  const url = `${base}${path === "/" ? "/" : path}`;
  const slug = path === "/" ? "home" : path.replace(/^\//, "").replace(/\//g, "-");
  const outJson = join(outDir, `${slug}-${form.id}.json`);
  const args = [
    "lighthouse",
    url,
    "--quiet",
    "--chrome-flags=--headless --no-sandbox --disable-gpu",
    "--output=json",
    `--output-path=${JSON.stringify(outJson)}`,
    `--form-factor=${form.formFactor}`,
    `--screenEmulation.mobile=${form.screenEmulation.mobile}`,
    `--screenEmulation.width=${form.screenEmulation.width}`,
    `--screenEmulation.height=${form.screenEmulation.height}`,
    `--screenEmulation.deviceScaleFactor=${form.screenEmulation.deviceScaleFactor}`,
    "--only-categories=performance",
    "--only-categories=accessibility",
    "--only-categories=best-practices",
    "--only-categories=seo"
  ];
  if (form.id === "desktop") {
    args.push("--preset=desktop");
  }
  console.log(`\n→ ${form.id} ${url}`);
  // Clear stale report so we don't read old scores on failure
  try { if (existsSync(outJson)) writeFileSync(outJson, ""); } catch { /* ignore */ }

  const result = spawnSync("pnpm", ["dlx", ...args], {
    encoding: "utf8",
    shell: true,
    maxBuffer: 20 * 1024 * 1024
  });

  const report = loadReport(slug, form.id, outJson);
  // Windows often fails lighthouse temp-dir cleanup with EBUSY after a successful run
  if (!report?.categories) {
    console.error(result.stderr || result.stdout || "no lighthouse output");
    throw new Error(`Lighthouse failed for ${url} (${form.id}) status=${result.status}`);
  }
  if (result.status !== 0) {
    const errText = `${result.stderr || ""}${result.stdout || ""}`;
    if (!/EBUSY|resource busy|unlink/i.test(errText)) {
      console.warn(`Lighthouse exited ${result.status} but report was written.`);
    }
  }

  const scores = Object.fromEntries(
    Object.entries(report.categories).map(([key, value]) => [key, Math.round((value.score ?? 0) * 100)])
  );
  const failedAudits = Object.values(report.audits)
    .filter(a => a.score !== null && a.score < 1 && a.details?.type !== "opportunity")
    .filter(a => ["error", "fail", "numeric"].includes(a.scoreDisplayMode) || a.scoreDisplayMode === "binary")
    .slice(0, 25)
    .map(a => ({ id: a.id, title: a.title, score: a.score, display: a.displayValue }));
  console.log(JSON.stringify({
    path,
    form: form.id,
    scores,
    LCP: report.audits["largest-contentful-paint"]?.displayValue,
    TBT: report.audits["total-blocking-time"]?.displayValue,
    failedAudits: failedAudits.slice(0, 10)
  }, null, 2));
  return { path, form: form.id, scores, failedAudits };
}

const summary = [];
for (const page of pages) {
  for (const form of forms) {
    summary.push(runOne(page, form));
  }
}

writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary.map(s => ({ path: s.path, form: s.form, scores: s.scores })), null, 2));
const imperfect = summary.filter(s => Object.values(s.scores).some(v => v < 100));
console.log("\n===== SUMMARY =====");
for (const row of summary) {
  console.log(`${row.form.padEnd(8)} ${row.path.padEnd(18)} ${JSON.stringify(row.scores)}`);
}
if (imperfect.length) {
  console.log(`\n${imperfect.length} runs below 100.`);
  process.exitCode = 1;
} else {
  console.log("\nAll runs scored 100 across categories.");
}
