import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedOtpTypes = new Set<EmailOtpType>([
  "email",
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change"
]);

function safeAdminDestination(request: NextRequest, type: EmailOtpType) {
  const requested = request.nextUrl.searchParams.get("next");
  if (requested && (requested === "/admin" || requested.startsWith("/admin/")) && !requested.startsWith("//")) {
    return requested;
  }
  return type === "invite" || type === "recovery" ? "/admin/account" : "/admin";
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type") as EmailOtpType | null;

  if (!tokenHash || !rawType || !allowedOtpTypes.has(rawType)) {
    return NextResponse.redirect(new URL("/admin/login?error=invalid_or_expired_link", request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: rawType });

  if (error) {
    return NextResponse.redirect(new URL("/admin/login?error=invalid_or_expired_link", request.url));
  }

  return NextResponse.redirect(new URL(safeAdminDestination(request, rawType), request.url));
}
