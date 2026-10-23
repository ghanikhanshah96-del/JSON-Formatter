"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCmsUser } from "@/lib/cms-auth";

export async function updatePasswordAction(_previous: { error: string }, formData: FormData) {
  const user = await getCmsUser();
  if (!user) return { error: "Your session has expired. Request a new sign-in link." };
  if (user.passwordSet && user.aal !== "aal2") {
    return { error: "Verify your authenticator before changing an existing password." };
  }
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (password.length < 12) return { error: "Use at least 12 characters." };
  if (password !== confirmation) return { error: "The passwords do not match." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  if (!user.passwordSet) {
    const admin = createSupabaseAdminClient();
    const profile = await admin.from("profiles")
      .update({ password_set_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("active", true)
      .is("password_set_at", null)
      .select("user_id")
      .maybeSingle();
    if (profile.error || !profile.data) {
      return { error: "Your password was updated, but account setup could not be completed. Try again or contact an owner." };
    }
    await admin.from("audit_events").insert({
      actor_id: user.id,
      action: "user.password_configured",
      entity_type: "profile",
      entity_id: user.id,
      metadata: {}
    });
  }
  redirect("/admin/mfa");
}
