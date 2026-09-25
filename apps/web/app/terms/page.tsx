import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@codeformattools/seo";

export const metadata: Metadata = {
  title: `Terms | ${siteConfig.name}`,
  description: `Terms for using ${siteConfig.name} developer tools.`
};

export default function TermsPage() {
  return (
    <main className="simple-page container">
      <div className="eyebrow">TERMS</div>
      <h1>Terms of use<span className="title-accent">.</span></h1>
      <p>
        {siteConfig.name} provides browser-based developer utilities for formatting, validating, minifying, sorting, and converting structured data. You are responsible for reviewing results before using them in production systems.
      </p>
      <h2>Use of the tools</h2>
      <p>
        You may use the tools for ordinary development, debugging, documentation, and data preparation work. Do not use {siteConfig.name} to interfere with the service, overload the site, reverse engineer abuse protections, or attempt to process data in a way that harms other users.
      </p>
      <h2>Accuracy</h2>
      <p>
        {siteConfig.name} aims to preserve data carefully and show warnings when formats do not map cleanly. The tools cannot guarantee that a query is semantically valid, that converted data fits every downstream application, or that generated output is suitable for a specific production use.
      </p>
      <h2>Availability</h2>
      <p>
        The service is provided as is and may change, pause, or stop without notice. We do not promise uninterrupted availability or fitness for a particular purpose.
      </p>
      <h2>Contact</h2>
      <p>
        Use the <Link href="/contact">Contact</Link> page for terms, privacy, or operational questions.
      </p>
    </main>
  );
}
