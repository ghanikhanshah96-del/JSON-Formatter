import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";

export type CmsRole = "owner" | "editor";
export type CmsUser = { id: string; email: string; displayName: string; role: CmsRole; aal: "aal1" | "aal2" };

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
    .select("display_name,role,active")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!profile?.active || (profile.role !== "owner" && profile.role !== "editor")) return null;
  return {
    id: auth.user.id,
    email: auth.user.email ?? "",
    displayName: profile.display_name,
    role: profile.role,
    aal: claims?.claims?.aal === "aal2" ? "aal2" : "aal1"
  };
}

export async function requireCmsUser(options: { owner?: boolean; mfa?: boolean } = {}) {
  const user = await getCmsUser();
  if (!user) redirect("/admin/login");
  if (options.mfa !== false && user.aal !== "aal2") redirect("/admin/mfa");
  if (options.owner && user.role !== "owner") redirect("/admin");
  return user;
}

export async function authorizeCmsMutation(options: { owner?: boolean } = {}) {
  const user = await getCmsUser();
  if (!user) throw new Error("Authentication required.");
  if (user.aal !== "aal2") throw new Error("Multi-factor authentication is required.");
  if (options.owner && user.role !== "owner") throw new Error("Owner access is required.");
  return user;
}
