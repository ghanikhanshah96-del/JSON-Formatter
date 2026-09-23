import type { Metadata } from "next";
import { contactEmail, siteConfig } from "@codeformattools/seo";

export const metadata: Metadata = { title: "Contact | Code Format Tools", description: "Contact Code Format Tools about privacy, terms, corrections, and operations." };

export default function Page() {
  const email = contactEmail();
  const mailto = `mailto:${email}?subject=${encodeURIComponent(`${siteConfig.name} support`)}`;
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(`${siteConfig.name} support`)}`;

  return (
    <main className="simple-page container">
      <div className="eyebrow">CONTACT</div>
      <h1>Contact Code Format Tools<span className="title-accent">.</span></h1>
      <p>Use this page for privacy questions, terms questions, correction requests, takedown requests, security concerns, or operational issues with the tools.</p>
      <p className="contact-email-block">
        Email{" "}
        <a className="contact-email-link" href={mailto}>{email}</a>
        . Opens your default email app. Prefer Gmail in the browser?{" "}
        <a className="contact-email-link" href={gmail} target="_blank" rel="noopener noreferrer">Compose in Gmail</a>.
        Please do not include sensitive tool input unless it is necessary for the request.
      </p>
      <h2>What to include</h2>
      <p>Include the page URL, a short description of the issue, and the browser or device if the problem is about layout or behavior. For privacy requests, include enough detail to identify the request without sending private tool input.</p>
    </main>
  );
}
