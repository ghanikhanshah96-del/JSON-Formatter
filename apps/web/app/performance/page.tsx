import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig, siteOrigin } from "@codeformattools/seo";
import { MAX_EDITOR_INPUT_LABEL } from "@codeformattools/tool-core";

export const metadata: Metadata = {
  title: `Performance | ${siteConfig.name}`,
  description: `CodeFormatterTools performance budget: fast first paint targets, local processing up to ${MAX_EDITOR_INPUT_LABEL}, and no upload for tool input.`,
  alternates: { canonical: "/performance" }
};

export default function PerformancePage() {
  const budget = siteConfig.performance;
  return (
    <main className="simple-page container performance-page">
      <div className="eyebrow">PERFORMANCE BUDGET</div>
      <h1>Speed is a feature<span className="title-accent">.</span></h1>
      <p>
        Developers notice friction. CodeFormatterTools is built to open quickly, process locally, and stay responsive — without sending your input to a server.
      </p>

      <div className="perf-grid">
        <div className="perf-card">
          <strong>Open target</strong>
          <p className="perf-metric">&lt; {budget.openTargetMs / 1000}s</p>
          <p>Interactive tool chrome on a warm load. We keep the homepage and tool shells lean so you can paste immediately.</p>
        </div>
        <div className="perf-card">
          <strong>Local input ceiling</strong>
          <p className="perf-metric">{MAX_EDITOR_INPUT_LABEL}</p>
          <p>Each workspace accepts up to {MAX_EDITOR_INPUT_LABEL} in the browser. Larger files are rejected with a clear error instead of freezing the tab.</p>
        </div>
        <div className="perf-card">
          <strong>Processing timeout</strong>
          <p className="perf-metric">{budget.processingTimeoutMs / 1000}s</p>
          <p>Long-running worker jobs stop with guidance so pathological input cannot hang the page forever.</p>
        </div>
        <div className="perf-card">
          <strong>Network for your data</strong>
          <p className="perf-metric">0 B</p>
          <p>Tool input is processed in a browser worker. Formatting, validation, and conversion do not upload your paste or files.</p>
        </div>
      </div>

      <h2>What we measure</h2>
      <ul className="seo-list">
        <li>Tool land → paste → run → copy/download funnel events</li>
        <li>Worker duration for successful and failed executions</li>
        <li>Input size buckets so we can protect the experience as usage grows</li>
      </ul>

      <h2>How to keep it fast on your side</h2>
      <p>For multi-megabyte documents, minify first when possible, or split work. Prefer the matching dialect/mode so the worker does not waste cycles on retries.</p>

      <div className="seo-cta-actions" style={{ marginTop: 28 }}>
        <Link className="button primary" href="/json-formatter">Try JSON Formatter</Link>
        <Link className="button secondary" href="/learn/private-browser-developer-tools">Read the privacy guide</Link>
      </div>
      <p className="learn-back" style={{ marginTop: 24 }}><Link href="/">← Home</Link> · Site: {siteOrigin().replace("https://", "")}</p>
    </main>
  );
}
