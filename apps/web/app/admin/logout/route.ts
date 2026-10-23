import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { hasAllowedMutationOrigin } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  if (!hasAllowedMutationOrigin(request, { requireOrigin: true })) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (isSupabaseConfigured()) await (await createSupabaseServerClient()).auth.signOut();
  return NextResponse.redirect(new URL("/admin/login", request.url), 303);
}
