import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import { evaluateCmsAccess } from "./cms-access";

export type CmsRole = "owner" | "editor";
export type CmsUser = {
  id: string;
  email: string;
  displayName: string;
  role: CmsRole;
  aal: "aal1" | "aal2";
  passwordSet: boolean;
};

export async function getCmsUser(): Promise<CmsUser | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const [{ data: auth }, { data: claims }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getClaims()
  ]);
  if (!auth.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,role,active,password_set_at")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!profile?.active || (profile.role !== "owner" && profile.role !== "editor")) return null;
  return {
    id: auth.user.id,
    email: auth.user.email ?? "",
    displayName: profile.display_name,
    role: profile.role,
    aal: claims?.claims?.aal === "aal2" ? "aal2" : "aal1",
    passwordSet: Boolean(profile.password_set_at)
  };
}

export async function requireCmsUser(options: { owner?: boolean; mfa?: boolean } = {}) {
  const user = await getCmsUser();
  if (!user) redirect("/admin/login");
  const access = evaluateCmsAccess(user, options);
  if (access === "password") redirect("/admin/account");
  if (access === "mfa") redirect("/admin/mfa");
  if (access === "owner") redirect("/admin");
  return user;
}

export async function authorizeCmsMutation(options: { owner?: boolean } = {}) {
  const user = await getCmsUser();
  if (!user) throw new Error("Authentication required.");
  if (!user.passwordSet) throw new Error("Complete password setup before using the dashboard.");
  if (user.aal !== "aal2") throw new Error("Multi-factor authentication is required.");
  if (options.owner && user.role !== "owner") throw new Error("Owner access is required.");
  return user;
}
