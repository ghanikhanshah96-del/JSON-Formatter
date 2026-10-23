"use server";

import { revalidatePath } from "next/cache";
import { authorizeCmsMutation } from "@/lib/cms-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function inviteUserAction(formData: FormData) {
  const owner = await authorizeCmsMutation({ owner: true });
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const role = formData.get("role") === "owner" ? "owner" : "editor";
  if (!email || displayName.length < 2) throw new Error("Enter a valid email and display name.");
  const admin = createSupabaseAdminClient();
  const invite = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/session` });
  if (invite.error || !invite.data.user) throw new Error(invite.error?.message ?? "Invite failed.");
  const profile = await admin.from("profiles").upsert({
    user_id: invite.data.user.id, email, display_name: displayName, role, active: true, password_set_at: null
  });
  if (profile.error) {
    await admin.auth.admin.deleteUser(invite.data.user.id);
    throw new Error(profile.error.message);
  }
  await admin.from("audit_events").insert({ actor_id: owner.id, action: "user.invited", entity_type: "profile", entity_id: invite.data.user.id, metadata: { role } });
  revalidatePath("/admin/users");
}

export async function updateUserAction(formData: FormData) {
  await authorizeCmsMutation({ owner: true });
  const userId = String(formData.get("userId") ?? "");
  if (!uuidPattern.test(userId)) throw new Error("Invalid user.");
  const role = formData.get("role") === "owner" ? "owner" : "editor";
  const active = formData.get("active") === "true";
  const supabase = await createSupabaseServerClient();
  const result = await supabase.rpc("cms_update_profile_access", { p_user_id: userId, p_role: role, p_active: active });
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/admin/users");
}

export async function revokeUserAccessAction(formData: FormData) {
  await authorizeCmsMutation({ owner: true });
  const userId = String(formData.get("userId") ?? "");
  const role = formData.get("role") === "owner" ? "owner" : "editor";
  if (!uuidPattern.test(userId)) throw new Error("Invalid user.");
  const supabase = await createSupabaseServerClient();
  const result = await supabase.rpc("cms_update_profile_access", { p_user_id: userId, p_role: role, p_active: false });
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/admin/users");
}

export async function restoreUserAccessAction(formData: FormData) {
  await authorizeCmsMutation({ owner: true });
  const userId = String(formData.get("userId") ?? "");
  const role = formData.get("role") === "owner" ? "owner" : "editor";
  if (!uuidPattern.test(userId)) throw new Error("Invalid user.");
  const supabase = await createSupabaseServerClient();
  const result = await supabase.rpc("cms_update_profile_access", { p_user_id: userId, p_role: role, p_active: true });
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/admin/users");
}
