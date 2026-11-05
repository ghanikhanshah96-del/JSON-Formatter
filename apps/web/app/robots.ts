import type { MetadataRoute } from "next";
import { siteOrigin } from "@codeformattools/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "Googlebot", allow: "/" },
      { userAgent: "Googlebot-Image", allow: "/" },
      { userAgent: "Mediapartners-Google", allow: "/" },
      { userAgent: "Google-Display-Ads-Bot", allow: "/" },
      { userAgent: "bingbot", allow: "/" },
    ],
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
