import type { NextRequest } from "next/server";

export function hasAllowedMutationOrigin(request: NextRequest, options: { requireOrigin?: boolean } = {}) {
  const origin = request.headers.get("origin");
  if (!origin) return !options.requireOrigin;
  const allowed = new Set([request.nextUrl.origin]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try { allowed.add(new URL(siteUrl).origin); } catch { /* invalid configuration is not an allowed origin */ }
  }
  const host = request.headers.get("host");
  if (host && /^[a-z0-9.\-\[\]:]+$/i.test(host)) {
    allowed.add(`${request.nextUrl.protocol}//${host}`);
  }
  return allowed.has(origin);
}
