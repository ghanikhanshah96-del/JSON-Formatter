import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Sora } from "next/font/google";
import { siteConfig, siteOrigin } from "@codeformattools/seo";
import { HomeBrandLink } from "@/components/home-brand-link";
import { Observability } from "@/components/observability";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";
import "./theme-refresh.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap"
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
  display: "swap"
});

const verification: NonNullable<Metadata["verification"]> = {};
if (process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION) verification.google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
if (process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION) verification.other = { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION };

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: { default: "Free Online Developer Tools | Format, Validate & Convert", template: "%s" },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }, { url: "/apple-touch-icon.svg", type: "image/svg+xml" }] },
  manifest: "/manifest.webmanifest",
  openGraph: { title: siteConfig.name, description: siteConfig.description, url: siteOrigin(), siteName: siteConfig.name, type: "website", images: [{ url: "/og-image.png", width: 1200, height: 630, alt: siteConfig.name }] },
  twitter: { card: "summary_large_image", title: siteConfig.name, description: siteConfig.description, images: ["/og-image.png"] },
  verification,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1020" }
  ],
  colorScheme: "light dark"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sora.variable} ${ibmPlexMono.variable}`}>
      <body style={{ fontFamily: "var(--font-sora), var(--font-sans)" }} suppressHydrationWarning>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k="codeformattertools.theme";var t=localStorage.getItem(k)||localStorage.getItem("codeformattools.theme")||localStorage.getItem("formatbase.theme")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{--font-sans:var(--font-sora),Segoe UI,sans-serif;--font-display:var(--font-sora),Segoe UI,sans-serif;--font-mono:var(--font-ibm-plex-mono),Consolas,monospace;--font-body:var(--font-sans)}`
          }}
        />
        <SiteHeader />
        <div id="main-content">{children}</div>
        <footer className="site-footer"><div className="container footer-inner">
          <div>
            <HomeBrandLink className="brand footer-brand" aria-label={`CFT ${siteConfig.name} home`}>
              <span className="brand-mark" aria-hidden="true">{`{ }`}</span>
              <span className="brand-text">
                <span className="brand-text-full">{siteConfig.name}</span>
                <span className="brand-text-compact" aria-hidden="true">CFT</span>
                <span className="brand-dot" aria-hidden="true">.</span>
              </span>
            </HomeBrandLink>
            <p>Useful tools. Runs in your browser. Never uploaded.</p>
          </div>
          <div className="footer-links">
            <a href="/#tools">Tools</a>
            <a href="/blog">Blog</a>
            <a href="/performance">Performance</a>
            <a href="/about">About</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/contact">Contact</a>
          </div>
        </div></footer>
        <Observability />
      </body>
    </html>
  );
}
