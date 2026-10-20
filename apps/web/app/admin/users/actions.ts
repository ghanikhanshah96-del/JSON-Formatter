"use server";

import { revalidatePath } from "next/cache";
import { authorizeCmsMutation } from "@/lib/cms-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function inviteUserAction(formData: FormData) {
  const owner = await authorizeCmsMutation({ owner: true });
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const role = formData.get("role") === "owner" ? "owner" : "editor";
  if (!email || displayName.length < 2) throw new Error("Enter a valid email and display name.");
  const admin = createSupabaseAdminClient();
  const invite = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback` });
  if (invite.error || !invite.data.user) throw new Error(invite.error?.message ?? "Invite failed.");
  const profile = await admin.from("profiles").upsert({ user_id: invite.data.user.id, email, display_name: displayName, role, active: true });
  if (profile.error) throw new Error(profile.error.message);
  await admin.from("audit_events").insert({ actor_id: owner.id, action: "user.invited", entity_type: "profile", entity_id: invite.data.user.id, metadata: { role } });
  revalidatePath("/admin/users");
}

export async function updateUserAction(formData: FormData) {
  const owner = await authorizeCmsMutation({ owner: true });
  const userId = String(formData.get("userId") ?? "");
  if (userId === owner.id && formData.get("active") !== "true") throw new Error("You cannot deactivate your own account.");
  const admin = createSupabaseAdminClient();
  const role = formData.get("role") === "owner" ? "owner" : "editor";
  const active = formData.get("active") === "true";
  const result = await admin.from("profiles").update({ role, active }).eq("user_id", userId);
  if (result.error) throw new Error(result.error.message);
  await admin.from("audit_events").insert({ actor_id: owner.id, action: "user.updated", entity_type: "profile", entity_id: userId, metadata: { role, active } });
  revalidatePath("/admin/users");
}
