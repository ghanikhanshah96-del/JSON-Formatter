import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const email = process.env.CMS_OWNER_EMAIL?.trim().toLowerCase();
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

if (!url || !publishableKey || !email) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and CMS_OWNER_EMAIL.");
}

const supabase = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const { error } = await supabase.auth.signInWithOtp({
  email,
  options: { shouldCreateUser: false, emailRedirectTo: `${siteUrl}/auth/session` }
});

if (error) throw error;
process.stdout.write("Owner sign-in email sent.\n");
