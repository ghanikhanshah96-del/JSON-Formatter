"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseConfig } from "./config";

let client: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = requireSupabaseConfig();
  client ??= createBrowserClient(url, publishableKey);
  return client;
}
