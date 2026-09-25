import type { Metadata } from "next";
import Link from "next/link";
import { contactEmail, siteConfig } from "@codeformattools/seo";
import { ContactActions } from "@/components/contact-actions";

export const metadata: Metadata = {
  title: `Contact | ${siteConfig.name}`,
  description: `Contact ${siteConfig.name} for privacy, security, corrections, and product questions. We respond by email — no account required.`
};

const topics = [
  { id: "privacy", label: "Privacy / data handling", subject: "Privacy question" },
  { id: "security", label: "Security report", subject: "Security report" },
  { id: "bug", label: "Tool bug or incorrect output", subject: "Tool bug report" },
  { id: "docs", label: "Docs / Learn correction", subject: "Docs correction" },
  { id: "legal", label: "Terms / takedown", subject: "Legal / takedown" },
  { id: "other", label: "Something else", subject: `${siteConfig.name} support` }
] as const;

export default function ContactPage() {
  const email = contactEmail();

  return (
    <main className="simple-page container contact-page">
      <div className="eyebrow">CONTACT</div>
      <h1>Talk to us<span className="title-accent">.</span></h1>
      <p className="learn-lead">
        Privacy questions, security reports, corrections, or product issues — email is the fastest path. No accounts, no tickets, no chatbots.
      </p>

      <div className="contact-trust">
        <span>Typical reply: 1–2 business days</span>
        <span>Security reports prioritized</span>
        <span>No signup required</span>
      </div>

      <div className="contact-panel">
        <div className="contact-panel-copy">
          <div className="card-eyebrow">EMAIL</div>
          <a className="contact-email-link contact-email-hero" href={`mailto:${email}?subject=${encodeURIComponent(`${siteConfig.name} support`)}`}>{email}</a>
          <p className="contact-hint">Prefer a topic below — it prefills the subject so we can route faster.</p>
        </div>
        <ContactActions email={email} siteName={siteConfig.name} />
      </div>

      <section className="contact-topics seo-block">
        <h2>Pick a topic</h2>
        <ul className="topic-row">
          {topics.map(topic => (
            <li key={topic.id}>
              <a className="topic-chip" href={`mailto:${email}?subject=${encodeURIComponent(topic.subject)}`}>
                {topic.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <div className="contact-grid">
        <section>
          <h2>What to include</h2>
          <ul className="seo-list">
            <li>The page URL (for example <code>/json-formatter</code>)</li>
            <li>What you expected vs what happened</li>
            <li>Browser and device if it is a layout or runtime issue</li>
            <li>For privacy requests: enough detail to identify the request — without pasting private tool input</li>
          </ul>
        </section>
        <section>
          <h2>We can help with</h2>
          <ul className="seo-list">
            <li>Privacy and data-handling questions</li>
            <li>Security concerns and responsible disclosure</li>
            <li>Corrections to docs or tool behavior</li>
            <li>Terms, takedown, and operational issues</li>
          </ul>
        </section>
      </div>

      <section className="contact-note seo-block">
        <h2>Please do not paste secrets</h2>
        <p>
          Tools already run locally in your browser. For support email, avoid sending API keys, production payloads, or personal data unless it is strictly required — and redact when you can.
        </p>
        <p>
          Prefer describing the issue with a tiny redacted sample. Full payloads belong in your local editor, not inbox history.
        </p>
      </section>

      <div className="seo-cta-actions">
        <Link className="button secondary" href="/privacy">Read privacy</Link>
        <Link className="button secondary" href="/performance">Performance budget</Link>
        <Link className="button secondary" href="/learn">Browse Learn guides</Link>
      </div>
    </main>
  );
}
