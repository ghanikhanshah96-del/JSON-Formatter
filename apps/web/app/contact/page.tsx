import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@codeformattools/seo";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: `Contact | ${siteConfig.name}`,
  description: `Contact ${siteConfig.name} for privacy, security, corrections, and product questions. Send a message from this page — no account required.`
};

export default function ContactPage() {
  return (
    <main className="simple-page container contact-page">
      <div className="eyebrow">CONTACT</div>
      <h1>Talk to us<span className="title-accent">.</span></h1>
      <p className="learn-lead">
        Privacy questions, security reports, corrections, or product issues — send a message below. No accounts, no tickets, no chatbots.
      </p>

      <div className="contact-trust">
        <span>Typical reply: 1–2 business days</span>
        <span>Security reports prioritized</span>
        <span>No signup required</span>
      </div>

      <section className="contact-panel contact-panel-form" aria-label="Contact form">
        <header className="contact-panel-copy">
          <div className="card-eyebrow">MESSAGE</div>
          <h2 className="contact-form-heading">Send a message</h2>
          <p className="contact-hint">
            Fill in the form and we will reply by email. Avoid pasting secrets or full production payloads.
          </p>
        </header>
        <ContactForm />
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
          Tools already run locally in your browser. For support messages, avoid sending API keys, production payloads, or personal data unless it is strictly required — and redact when you can.
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
