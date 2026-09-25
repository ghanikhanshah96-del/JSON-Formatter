"use client";

import { useState } from "react";

export function ContactActions({ email, siteName }: { email: string; siteName: string }) {
  const [copied, setCopied] = useState(false);
  const mailto = `mailto:${email}?subject=${encodeURIComponent(`${siteName} support`)}`;
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(`${siteName} support`)}`;

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="contact-actions">
      <a className="button primary" href={mailto}>Open email app</a>
      <a className="button secondary" href={gmail} target="_blank" rel="noopener noreferrer">Compose in Gmail</a>
      <button type="button" className="button secondary" onClick={copyEmail}>
        {copied ? "Copied ✓" : "Copy address"}
      </button>
    </div>
  );
}
