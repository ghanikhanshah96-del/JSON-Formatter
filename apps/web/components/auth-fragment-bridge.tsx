"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/** Compatibility for older links that return credentials in a URL fragment. */
export function AuthFragmentBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!window.location.hash) return;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const authError = params.get("error") || params.get("error_code");
    if (!accessToken && !refreshToken && !authError) return;

    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);

    if (!accessToken || !refreshToken || authError) {
      router.replace("/admin/login?error=invalid_or_expired_link");
      return;
    }

    void createSupabaseBrowserClient().auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then((result: { error: unknown }) => {
        router.replace(result.error ? "/admin/login?error=invalid_or_expired_link" : "/admin/account");
        router.refresh();
      });
  }, [router]);

  return null;
}
