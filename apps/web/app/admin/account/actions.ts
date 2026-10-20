"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCmsUser } from "@/lib/cms-auth";

export async function updatePasswordAction(_previous: { error: string }, formData: FormData) {
  const user = await getCmsUser();
  if (!user) return { error: "Your session has expired. Request a new sign-in link." };
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (password.length < 12) return { error: "Use at least 12 characters." };
  if (password !== confirmation) return { error: "The passwords do not match." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/admin/mfa");
}
