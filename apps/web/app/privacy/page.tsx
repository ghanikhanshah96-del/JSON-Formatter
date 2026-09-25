import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@codeformattools/seo";

export const metadata: Metadata = {
  title: `Privacy | ${siteConfig.name}`,
  description: `How ${siteConfig.name} handles your data and browser preferences. Tool input is processed locally and never uploaded.`
};

export default function PrivacyPage() {
  return (
    <main className="simple-page container">
      <div className="eyebrow">PRIVACY</div>
      <h1>Your data<br /><em>stays yours.</em></h1>
      <p>
        Text and files you enter into {siteConfig.name} are processed in a browser worker on your device. They are not sent to {siteConfig.name} servers or analytics for formatting, validation, minification, sorting, or conversion.
      </p>
      <h2>Tool input</h2>
      <p>
        Tool input and output stay in the browser session. {siteConfig.name} does not save pasted text, uploaded files, generated output, or diagnostics. Browser tests also check that private tool input is absent from outgoing requests.
      </p>
      <h2>Preferences</h2>
      <p>
        {siteConfig.name} stores interface preferences in your browser, such as theme, indentation, SQL dialect, keyword case, query spacing, and conversion mode. These preferences are stored with local storage and can be cleared from your browser settings.
      </p>
      <h2>Analytics and performance</h2>
      <p>
        {siteConfig.name} uses Vercel Web Analytics and Vercel Speed Insights to measure page views, tool lands, pastes, starts, outcomes, copy/download actions, related-tool clicks, and Core Web Vitals. These events do not include pasted input, uploaded files, generated output, diagnostics text, query strings, or URL fragments.
      </p>
      <h2>Network requests</h2>
      <p>
        Your browser loads the site&apos;s code, static assets, Vercel analytics scripts, and Vercel performance scripts. At this stage, {siteConfig.name} does not run advertising scripts, tracking pixels, or account systems unless you explicitly configure AdSense environment variables.
      </p>
      <h2>Cookies and consent</h2>
      <p>
        The current site does not use cookies for advertising or account tracking, so there is no consent banner. If ads or additional providers are added later, this page and the consent behavior must be reviewed before launch.
      </p>
      <h2>Contact</h2>
      <p>
        Use the <Link href="/contact">Contact</Link> page for privacy questions, corrections, or takedown requests.
      </p>
    </main>
  );
}
