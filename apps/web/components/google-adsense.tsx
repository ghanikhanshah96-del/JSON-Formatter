"use client";

import { usePathname } from "next/navigation";

export const GOOGLE_ADSENSE_CLIENT = "ca-pub-8270477962353734";

/** Load AdSense once on public pages while keeping the editorial admin isolated. */
export function GoogleAdSense() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <script
      id="google-adsense"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${GOOGLE_ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
    />
  );
}
