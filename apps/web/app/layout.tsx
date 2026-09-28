import type { Metadata, Viewport } from "next";
import { siteConfig, siteOrigin } from "@codeformattools/seo";
import { HomeBrandLink } from "@/components/home-brand-link";
import { Observability } from "@/components/observability";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

const verification: NonNullable<Metadata["verification"]> = {};
if (process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION) verification.google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
if (process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION) verification.other = { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION };

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: { default: "Free Online Developer Tools | Format, Validate & Convert", template: "%s" },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
  openGraph: { title: siteConfig.name, description: siteConfig.description, url: siteOrigin(), siteName: siteConfig.name, type: "website", images: [{ url: "/og-image.png", width: 1200, height: 630, alt: siteConfig.name }] },
  twitter: { card: "summary_large_image", title: siteConfig.name, description: siteConfig.description, images: ["/og-image.png"] },
  verification,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f1" },
    { media: "(prefers-color-scheme: dark)", color: "#101d18" }
  ],
  colorScheme: "light dark"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var k="codeformattertools.theme";var t=localStorage.getItem(k)||localStorage.getItem("codeformattools.theme")||localStorage.getItem("formatbase.theme")||"light";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`
      }}
    />
    <header className="site-header"><div className="container header-inner">
      <HomeBrandLink className="brand" aria-label={`CFT ${siteConfig.name} home`}>
        <span className="brand-mark" aria-hidden="true">{`{ }`}</span>
        <span className="brand-text">
          <span className="brand-text-full">{siteConfig.name}</span>
          <span className="brand-text-compact" aria-hidden="true">CFT</span>
          <span className="brand-dot" aria-hidden="true">.</span>
        </span>
      </HomeBrandLink>
      <nav className="top-nav" aria-label="Primary navigation">
        <a href="/#tools">Tools</a>
        <a href="/learn">Learn</a>
        <a href="/about">About</a>
        <a href="/privacy">Privacy</a>
        <a href="/contact">Contact</a>
        <ThemeToggle />
      </nav>
    </div></header>
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
        <a href="/learn">Learn</a>
        <a href="/performance">Performance</a>
        <a href="/about">About</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/contact">Contact</a>
      </div>
    </div></footer>
    <Observability />
  </body></html>;
}
