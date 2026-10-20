import { createClient } from "@supabase/supabase-js";
import { requireServiceRoleConfig } from "./config";

export function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = requireServiceRoleConfig();
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
