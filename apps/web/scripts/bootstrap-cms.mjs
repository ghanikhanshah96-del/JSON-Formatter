import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const email = process.env.CMS_OWNER_EMAIL?.trim().toLowerCase();
const displayName = process.env.CMS_OWNER_DISPLAY_NAME?.trim() || "Site Owner";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

if (!url || !serviceKey || !email) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and CMS_OWNER_EMAIL before bootstrapping.");
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const invite = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo: `${siteUrl}/auth/callback` });
if (invite.error && !/already.*registered/i.test(invite.error.message)) throw invite.error;

let user = invite.data.user;
if (!user) {
  let page = 1;
  while (!user) {
    const listed = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (listed.error) throw listed.error;
    user = listed.data.users.find(item => item.email?.toLowerCase() === email);
    if (user || listed.data.users.length < 1000) break;
    page += 1;
  }
}
if (!user) throw new Error("The owner account could not be found or invited.");

const profile = await supabase.from("profiles").upsert({ user_id: user.id, email, display_name: displayName, role: "owner", active: true });
if (profile.error) throw profile.error;
process.stdout.write(`Owner profile ready for ${email}. Complete the emailed sign-in flow, then enroll MFA at /admin/mfa.\n`);
