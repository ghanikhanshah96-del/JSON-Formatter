"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function loginAction(_previous: { error: string }, formData: FormData) {
  if (!isSupabaseConfigured()) return { error: "The dashboard is not configured yet. Add the Supabase environment variables." };
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Unable to sign in with those credentials." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("active,role,password_set_at")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("CMS profile lookup failed after sign in.", { code: profileError.code });
    await supabase.auth.signOut();
    return { error: "Your account was authenticated, but the editorial profile could not be loaded. Please try again or contact the site owner." };
  }
  if (!profile?.active || (profile.role !== "owner" && profile.role !== "editor")) {
    await supabase.auth.signOut();
    return { error: "Your editorial access is not active. Contact the site owner." };
  }
  redirect("/admin");
}

export async function magicLinkAction(_previous: { error: string; message: string }, formData: FormData) {
  if (!isSupabaseConfigured()) return { error: "The dashboard is not configured yet.", message: "" };
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your invited email address.", message: "" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/session` } });
  if (error) return { error: "Unable to send a sign-in link.", message: "" };
  return { error: "", message: "Check your email for a secure sign-in link." };
}
