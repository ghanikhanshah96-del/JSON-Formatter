import type { NextRequest } from "next/server";

export function hasAllowedMutationOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const allowed = new Set([request.nextUrl.origin]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try { allowed.add(new URL(siteUrl).origin); } catch { /* invalid configuration is not an allowed origin */ }
  }
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  if (forwardedHost) allowed.add(`${forwardedProtocol}://${forwardedHost}`);
  return allowed.has(origin);
}
