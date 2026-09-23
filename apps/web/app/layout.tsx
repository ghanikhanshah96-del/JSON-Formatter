import type { Metadata } from "next";
import Link from "next/link";
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
  title: { default: `${siteConfig.name} - Private developer tools`, template: "%s" },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
  openGraph: { title: siteConfig.name, description: siteConfig.description, url: siteOrigin(), siteName: siteConfig.name, type: "website", images: [{ url: "/og-image.png", width: 1200, height: 630, alt: siteConfig.name }] },
  twitter: { card: "summary_large_image", title: siteConfig.name, description: siteConfig.description, images: ["/og-image.png"] },
  verification,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>
    <header className="site-header"><div className="container header-inner">
      <HomeBrandLink className="brand" aria-label={`${siteConfig.name} home`}><span className="brand-mark">{`{ }`}</span><span>Code Format Tools<span className="brand-dot">.</span></span></HomeBrandLink>
      <nav className="top-nav" aria-label="Primary navigation"><Link href="/#tools">All tools</Link><Link href="/about">About</Link><Link href="/privacy">Privacy</Link><ThemeToggle /></nav>
    </div></header>
    {children}
    <footer className="site-footer"><div className="container footer-inner"><div><HomeBrandLink className="brand footer-brand" aria-label={`${siteConfig.name} home`}><span className="brand-mark">{`{ }`}</span><span>Code Format Tools<span className="brand-dot">.</span></span></HomeBrandLink><p>Useful tools. Your data stays yours.</p></div><div className="footer-links"><Link href="/about">About</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact</Link></div></div></footer>
    <Observability />
  </body></html>;
}
