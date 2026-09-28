"use client";

import { useState, type FormEvent } from "react";

const TOPICS = [
  { id: "privacy", label: "Privacy / data handling" },
  { id: "security", label: "Security report" },
  { id: "bug", label: "Tool bug or incorrect output" },
  { id: "docs", label: "Docs / Learn correction" },
  { id: "legal", label: "Terms / takedown" },
  { id: "other", label: "Something else" }
] as const;

type Status = "idle" | "sending" | "success" | "error";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<string>("other");
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, topic, message, website_url: hp })
      });
      const data = await response.json().catch(() => ({ ok: false, error: "Unexpected response." }));
      if (!response.ok || !data.ok) {
        setStatus("error");
        setError(typeof data.error === "string" ? data.error : "Could not send your message.");
        return;
      }
      setStatus("success");
      setName("");
      setEmail("");
      setTopic("other");
      setMessage("");
      setHp("");
    } catch {
      setStatus("error");
      setError("Network error. Check your connection and try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="contact-form contact-form-success" role="status">
        <h2>Message sent</h2>
        <p>Thanks — we usually reply within 1–2 business days. Security reports are prioritized.</p>
        <button type="button" className="button secondary" onClick={() => setStatus("idle")}>
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate>
      <div className="contact-form-grid">
        <label className="contact-field">
          <span>Name</span>
          <input
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={120}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
          />
        </label>
        <label className="contact-field">
          <span>Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
      </div>

      <label className="contact-field">
        <span>Topic</span>
        <select name="topic" value={topic} onChange={e => setTopic(e.target.value)} required>
          {TOPICS.map(item => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </label>

      <label className="contact-field">
        <span>Message</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={7}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="What happened, which page URL, and what you expected…"
        />
      </label>

      {/* Spam honeypot: excluded from a11y tree; nonsense name avoids "Company" exposure */}
      <div className="contact-honeypot" aria-hidden="true" hidden inert>
        <input
          name="website_url"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={hp}
          onChange={e => setHp(e.target.value)}
        />
      </div>

      {error ? <p className="contact-form-error" role="alert">{error}</p> : null}

      <div className="contact-form-actions">
        <button type="submit" className="button primary" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send message"}
        </button>
        <p className="contact-form-note">We never share your email. Avoid pasting secrets or full production payloads.</p>
      </div>
    </form>
  );
}
