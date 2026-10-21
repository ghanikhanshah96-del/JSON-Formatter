"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

const GOOGLE_ANALYTICS_ID = "G-MZTR2SCLZS";

export function GoogleAnalytics() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
        strategy="lazyOnload"
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
      >{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GOOGLE_ANALYTICS_ID}', {
            anonymize_ip: true,
            allow_google_signals: false,
            allow_ad_personalization_signals: false,
            page_location: window.location.origin + window.location.pathname
          });
        `}</Script>
    </>
  );
}
