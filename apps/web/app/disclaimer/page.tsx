import type { Metadata } from "next";
import { SiteContentPage } from "@/components/site-content-page";
import { sitePageCopy } from "@/lib/site-page-copy";

export const metadata: Metadata = {
  title: sitePageCopy.disclaimer.title,
  description: sitePageCopy.disclaimer.description,
  alternates: { canonical: "/disclaimer" }
};

export default function DisclaimerPage() { return <SiteContentPage page={sitePageCopy.disclaimer} />; }