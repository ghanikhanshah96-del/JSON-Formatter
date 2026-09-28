"use client";

import { useId, useState, type FormEvent } from "react";
import {
  CONTACT_LIMITS,
  CONTACT_TOPICS,
  validateContactInput,
  type ContactFieldErrors
} from "@/lib/contact-validation";

type Status = "idle" | "sending" | "success" | "error";
type Field = keyof ContactFieldErrors;

export function ContactForm() {
  const formId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<string>("other");
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});

  function clearFieldError(field: Field) {
    setFieldErrors(current => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function validateField(field: Field, nextValues?: Partial<{ name: string; email: string; topic: string; message: string }>) {
    const result = validateContactInput({
      name: nextValues?.name ?? name,
      email: nextValues?.email ?? email,
      topic: nextValues?.topic ?? topic,
      message: nextValues?.message ?? message
    });
    const messageForField = result.ok ? undefined : result.errors[field];
    setFieldErrors(current => {
      const next = { ...current };
      if (messageForField) next[field] = messageForField;
      else delete next[field];
      return next;
    });
    return !messageForField;
  }

  function markTouched(field: Field) {
    setTouched(current => ({ ...current, [field]: true }));
    validateField(field);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ name: true, email: true, topic: true, message: true });
    const local = validateContactInput({ name, email, topic, message });
    if (!local.ok) {
      setFieldErrors(local.errors);
      setStatus("error");
      setError(local.error);
      return;
    }

    setStatus("sending");
    setError("");
    setFieldErrors({});
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: local.data.name,
          email: local.data.email,
          topic: local.data.topic,
          message: local.data.message,
          website_url: hp
        })
      });
      const data = await response.json().catch(() => ({ ok: false, error: "Unexpected response." }));
      if (!response.ok || !data.ok) {
        setStatus("error");
        if (data.errors && typeof data.errors === "object") {
          setFieldErrors(data.errors as ContactFieldErrors);
        }
        setError(typeof data.error === "string" ? data.error : "Could not send your message.");
        return;
      }
      setStatus("success");
      setName("");
      setEmail("");
      setTopic("other");
      setMessage("");
      setHp("");
      setFieldErrors({});
      setTouched({});
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

  const nameErrorId = `${formId}-name-error`;
  const emailErrorId = `${formId}-email-error`;
  const topicErrorId = `${formId}-topic-error`;
  const messageErrorId = `${formId}-message-error`;
  const messageCount = message.trim().length;
  const messageTooShort = messageCount > 0 && messageCount < CONTACT_LIMITS.messageMin;

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate>
      <div className="contact-form-grid">
        <label className={`contact-field${fieldErrors.name && touched.name ? " has-error" : ""}`}>
          <span>Name <em aria-hidden="true">*</em></span>
          <input
            name="name"
            type="text"
            autoComplete="name"
            autoCapitalize="words"
            spellCheck={false}
            required
            minLength={CONTACT_LIMITS.nameMin}
            maxLength={CONTACT_LIMITS.nameMax}
            pattern="[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ '.\-]*"
            title="Letters only. Spaces, hyphens, and apostrophes are allowed."
            value={name}
            aria-invalid={Boolean(fieldErrors.name && touched.name)}
            aria-describedby={[
              fieldErrors.name && touched.name ? nameErrorId : null,
              `${formId}-name-hint`
            ].filter(Boolean).join(" ") || undefined}
            onChange={e => {
              setName(e.target.value);
              clearFieldError("name");
              if (status === "error") setError("");
            }}
            onBlur={() => markTouched("name")}
            placeholder="Your name"
          />
          <span className="contact-field-hint" id={`${formId}-name-hint`}>
            Letters only — no numbers or special characters
          </span>
          {fieldErrors.name && touched.name ? (
            <span className="contact-field-error" id={nameErrorId} role="alert">{fieldErrors.name}</span>
          ) : null}
        </label>
        <label className={`contact-field${fieldErrors.email && touched.email ? " has-error" : ""}`}>
          <span>Email <em aria-hidden="true">*</em></span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            maxLength={CONTACT_LIMITS.emailMax}
            value={email}
            aria-invalid={Boolean(fieldErrors.email && touched.email)}
            aria-describedby={fieldErrors.email && touched.email ? emailErrorId : undefined}
            onChange={e => {
              setEmail(e.target.value);
              clearFieldError("email");
              if (status === "error") setError("");
            }}
            onBlur={() => markTouched("email")}
            placeholder="you@example.com"
          />
          {fieldErrors.email && touched.email ? (
            <span className="contact-field-error" id={emailErrorId} role="alert">{fieldErrors.email}</span>
          ) : null}
        </label>
      </div>

      <label className={`contact-field${fieldErrors.topic && touched.topic ? " has-error" : ""}`}>
        <span>Topic <em aria-hidden="true">*</em></span>
        <select
          name="topic"
          value={topic}
          required
          aria-invalid={Boolean(fieldErrors.topic && touched.topic)}
          aria-describedby={fieldErrors.topic && touched.topic ? topicErrorId : undefined}
          onChange={e => {
            setTopic(e.target.value);
            clearFieldError("topic");
            if (status === "error") setError("");
          }}
          onBlur={() => markTouched("topic")}
        >
          {CONTACT_TOPICS.map(item => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
        {fieldErrors.topic && touched.topic ? (
          <span className="contact-field-error" id={topicErrorId} role="alert">{fieldErrors.topic}</span>
        ) : null}
      </label>

      <label className={`contact-field${fieldErrors.message && touched.message ? " has-error" : ""}`}>
        <span>Message <em aria-hidden="true">*</em></span>
        <textarea
          name="message"
          required
          minLength={CONTACT_LIMITS.messageMin}
          maxLength={CONTACT_LIMITS.messageMax}
          rows={7}
          value={message}
          aria-invalid={Boolean(fieldErrors.message && touched.message)}
          aria-describedby={[
            fieldErrors.message && touched.message ? messageErrorId : null,
            `${formId}-message-hint`
          ].filter(Boolean).join(" ") || undefined}
          onChange={e => {
            setMessage(e.target.value);
            clearFieldError("message");
            if (status === "error") setError("");
          }}
          onBlur={() => markTouched("message")}
          placeholder="What happened, which page URL, and what you expected…"
        />
        <span className={`contact-field-hint${messageTooShort ? " is-warning" : ""}`} id={`${formId}-message-hint`}>
          {messageCount}/{CONTACT_LIMITS.messageMax}
          {messageTooShort ? ` · at least ${CONTACT_LIMITS.messageMin} characters` : ""}
        </span>
        {fieldErrors.message && touched.message ? (
          <span className="contact-field-error" id={messageErrorId} role="alert">{fieldErrors.message}</span>
        ) : null}
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
        <p className="contact-form-note">We never share your email. Avoid pasting secrets or full production payloads. Fields marked * are required.</p>
      </div>
    </form>
  );
}
