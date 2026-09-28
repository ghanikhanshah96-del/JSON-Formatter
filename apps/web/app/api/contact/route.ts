import { NextResponse } from "next/server";
import { Resend } from "resend";
import { contactEmail, siteConfig } from "@codeformattools/seo";

export const runtime = "nodejs";

const TOPICS = new Set(["privacy", "security", "bug", "docs", "legal", "other"]);
const MAX_NAME = 120;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 5000;
const MIN_MESSAGE = 10;

type Body = {
  name?: string;
  email?: string;
  topic?: string;
  message?: string;
  company?: string; // legacy honeypot
  website_url?: string; // honeypot
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function topicLabel(topic: string): string {
  switch (topic) {
    case "privacy": return "Privacy / data handling";
    case "security": return "Security report";
    case "bug": return "Tool bug or incorrect output";
    case "docs": return "Docs / Blog correction";
    case "legal": return "Terms / takedown";
    default: return "General support";
  }
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  // Honeypot — bots fill hidden fields; humans leave these empty.
  const trap = String(body.website_url ?? body.company ?? "").trim();
  if (trap) {
    return NextResponse.json({ ok: true });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const topic = String(body.topic ?? "other").trim();
  const message = String(body.message ?? "").trim();

  if (!name || name.length > MAX_NAME) {
    return NextResponse.json({ ok: false, error: "Please enter your name (max 120 characters)." }, { status: 400 });
  }
  if (!email || email.length > MAX_EMAIL || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!TOPICS.has(topic)) {
    return NextResponse.json({ ok: false, error: "Please choose a valid topic." }, { status: 400 });
  }
  if (message.length < MIN_MESSAGE || message.length > MAX_MESSAGE) {
    return NextResponse.json({ ok: false, error: `Message must be between ${MIN_MESSAGE} and ${MAX_MESSAGE} characters.` }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL || contactEmail();

  if (!apiKey || !from) {
    return NextResponse.json({
      ok: false,
      error: "Contact form is not configured yet. Set RESEND_API_KEY and RESEND_FROM_EMAIL on the server."
    }, { status: 503 });
  }

  const resend = new Resend(apiKey);
  const subject = `[${siteConfig.name}] ${topicLabel(topic)} — ${name}`;
  const text = [
    `New contact message from ${siteConfig.name}`,
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Topic: ${topicLabel(topic)}`,
    "",
    "Message:",
    message,
    "",
    `Sent: ${new Date().toISOString()}`
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#15332d">
      <p><strong>New contact message</strong> from ${siteConfig.name}</p>
      <p><strong>Name:</strong> ${escapeHtml(name)}<br/>
      <strong>Email:</strong> ${escapeHtml(email)}<br/>
      <strong>Topic:</strong> ${escapeHtml(topicLabel(topic))}</p>
      <p><strong>Message</strong></p>
      <pre style="white-space:pre-wrap;background:#f5f6f1;padding:12px;border-radius:8px">${escapeHtml(message)}</pre>
    </div>
  `;

  try {
    const result = await resend.emails.send({
      from,
      to: [to],
      replyTo: email,
      subject,
      text,
      html
    });
    if (result.error) {
      console.error("Resend error:", result.error);
      return NextResponse.json({ ok: false, error: "Could not send your message. Please try again shortly." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact send failed:", error);
    return NextResponse.json({ ok: false, error: "Could not send your message. Please try again shortly." }, { status: 502 });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
