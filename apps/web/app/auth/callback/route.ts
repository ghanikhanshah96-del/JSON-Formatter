import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/admin/login?error=invalid_or_expired_link", request.url));
  }
  const requested = request.nextUrl.searchParams.get("next");
  const destination = requested && (requested === "/admin" || requested.startsWith("/admin/")) && !requested.startsWith("//") ? requested : "/admin/account";
  return NextResponse.redirect(new URL(destination, request.url));
}
