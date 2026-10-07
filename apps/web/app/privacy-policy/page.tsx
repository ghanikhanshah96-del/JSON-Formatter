import type { Metadata } from "next";
import { SiteContentPage } from "@/components/site-content-page";
import { sitePageCopy } from "@/lib/site-page-copy";

export const metadata: Metadata = {
  title: sitePageCopy.privacy.title,
  description: sitePageCopy.privacy.description,
  alternates: { canonical: "/privacy-policy" }
};

export default function PrivacyPolicyPage() { return <SiteContentPage page={sitePageCopy.privacy} />; }