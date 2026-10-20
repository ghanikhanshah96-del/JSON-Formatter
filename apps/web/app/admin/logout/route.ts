import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST(request: NextRequest) {
  if (isSupabaseConfigured()) await (await createSupabaseServerClient()).auth.signOut();
  return NextResponse.redirect(new URL("/admin/login", request.url), 303);
}
