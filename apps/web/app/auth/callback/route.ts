import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  const requested = request.nextUrl.searchParams.get("next");
  const destination = requested?.startsWith("/admin/") && !requested.startsWith("//") ? requested : "/admin/account";
  return NextResponse.redirect(new URL(destination, request.url));
}
