import { NextResponse } from "next/server";
import { Resend } from "resend";
import { contactEmail, siteConfig } from "@codeformattools/seo";
import {
  isContactHoneypotTriggered,
  topicLabel,
  validateContactInput,
  type ContactInput
} from "@/lib/contact-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: ContactInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  // Honeypot — bots fill hidden fields; humans leave these empty.
  if (isContactHoneypotTriggered(body)) {
    return NextResponse.json({ ok: true });
  }

  const validated = validateContactInput(body);
  if (!validated.ok) {
    return NextResponse.json(
      { ok: false, error: validated.error, errors: validated.errors },
      { status: 400 }
    );
  }

  const { name, email, topic, message } = validated.data;
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
      <p><strong>New contact message</strong> from ${escapeHtml(siteConfig.name)}</p>
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
