import type { NextConfig } from "next";
const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const configuredSupabaseOrigin = configuredSupabaseUrl ? new URL(configuredSupabaseUrl).origin : "";
const configuredSupabasePattern = configuredSupabaseUrl ? (() => {
  const parsed = new URL(configuredSupabaseUrl);
  return { protocol: parsed.protocol.replace(":", "") as "http" | "https", hostname: parsed.hostname, port: parsed.port, pathname: "/storage/v1/object/public/**" };
})() : null;
const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  ...(process.env.NODE_ENV === "production" ? [] : ["'unsafe-eval'"]),
  "https://va.vercel-scripts.com",
  "https://*.vercel-scripts.com",
  "https://www.googletagmanager.com"
].join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  `img-src 'self' data: https://*.supabase.co ${configuredSupabaseOrigin} https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com`,
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src ${scriptSources}`,
  "script-src-attr 'none'",
  "form-action 'self'",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${configuredSupabaseOrigin} https://vitals.vercel-insights.com https://*.vercel-insights.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com`,
  "worker-src 'self' blob:",
  "manifest-src 'self'"
].join("; ");

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowLocalIP: configuredSupabasePattern?.hostname === "127.0.0.1" || configuredSupabasePattern?.hostname === "localhost",
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" },
      ...(configuredSupabasePattern ? [configuredSupabasePattern] : [])
    ]
  },
  transpilePackages: ["@codeformattools/tool-core", "@codeformattools/tool-registry", "@codeformattools/json-engine", "@codeformattools/sql-engine", "@codeformattools/yaml-engine", "@codeformattools/xml-engine", "@codeformattools/csv-engine", "@codeformattools/conversion-engine", "@codeformattools/analytics", "@codeformattools/worker-runtime", "@codeformattools/seo", "@codeformattools/editor"],
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false
  },
  experimental: {
    optimizePackageImports: ["@codeformattools/tool-registry", "@codeformattools/seo"]
  },
  async redirects() {
    return [
      { source: "/learn", destination: "/blog", permanent: true },
      { source: "/learn/:slug", destination: "/blog/:slug", permanent: true },
      { source: "/about", destination: "/about-us", permanent: true },
      { source: "/privacy", destination: "/privacy-policy", permanent: true },
      { source: "/contact", destination: "/contact-us", permanent: true },
      { source: "/terms", destination: "/terms-and-conditions", permanent: true }
    ];
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
        { key: "X-Frame-Options", value: "DENY" }
      ]
    }];
  }
};
export default nextConfig;
