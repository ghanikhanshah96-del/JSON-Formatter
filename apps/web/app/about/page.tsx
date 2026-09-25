import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@codeformattools/seo";

export const metadata: Metadata = {
  title: `About ${siteConfig.name}`,
  description: `Why ${siteConfig.name} builds fast, private browser-based developer tools for JSON, SQL, YAML, XML, and CSV.`
};

export default function AboutPage() {
  return (
    <main className="simple-page container">
      <div className="eyebrow">ABOUT {siteConfig.name.toUpperCase()}</div>
      <h1>Small tools.<br /><em>Better work.</em></h1>
      <p>
        {siteConfig.name} makes focused tools for developers working with structured data. Formatting, validation, and conversion should feel fast, clear, and private enough for everyday work.
      </p>
      <p>
        Every tool follows the same promise: useful work happens in your browser, errors should be understandable, and the interface should stay calm while you inspect real data.
      </p>
      <h2>What we build</h2>
      <p>
        Launch coverage includes JSON, SQL, YAML, XML, CSV, and format converters — plus a Learn hub for practical workflows. Tool pages include examples, common mistakes, and related tools so you can move through a job without searching again.
      </p>
      <h2>What we avoid</h2>
      <p>
        {siteConfig.name} does not require an account, does not upload tool input for processing, and does not ship thin doorway pages for search traffic. Each page is meant to be useful on its own.
      </p>
      <div className="seo-cta-actions" style={{ marginTop: 28 }}>
        <Link className="button primary" href="/#tools">Explore tools</Link>
        <Link className="button secondary" href="/performance">Performance budget</Link>
      </div>
    </main>
  );
}
