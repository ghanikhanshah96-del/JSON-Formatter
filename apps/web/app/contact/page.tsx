import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { SitePageHeading, SitePageSections } from "@/components/site-content-page";
import { sitePageCopy } from "@/lib/site-page-copy";

export const metadata: Metadata = {
  title: sitePageCopy.contact.title,
  description: sitePageCopy.contact.description,
  alternates: { canonical: "/contact" }
};

export default function ContactPage() {
  return (
    <main className="simple-page container contact-page">
      <SitePageHeading page={sitePageCopy.contact} />

      <section className="contact-panel contact-panel-form" aria-label="Contact form">
        <header className="contact-panel-copy">
          <div className="card-eyebrow">MESSAGE</div>
          <h2 className="contact-form-heading">Send a message</h2>
          <p className="contact-hint">
            Use this form to contact us. Tool input stays in your browser, but form messages are sent to us. Do not include passwords, API keys, production credentials, or confidential customer data.
          </p>
        </header>
        <ContactForm />
      </section>
      <SitePageSections page={sitePageCopy.contact} />
    </main>
  );
}
