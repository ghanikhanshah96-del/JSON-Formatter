import type { Metadata } from "next";
import { SiteContentPage } from "@/components/site-content-page";
import { sitePageCopy } from "@/lib/site-page-copy";

export const metadata: Metadata = {
  title: sitePageCopy.terms.title,
  description: sitePageCopy.terms.description,
  alternates: { canonical: "/terms" }
};

export default function TermsPage() { return <SiteContentPage page={sitePageCopy.terms} />; }
