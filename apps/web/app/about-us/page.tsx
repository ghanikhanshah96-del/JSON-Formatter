import type { Metadata } from "next";
import { SiteContentPage } from "@/components/site-content-page";
import { sitePageCopy } from "@/lib/site-page-copy";

export const metadata: Metadata = {
  title: sitePageCopy.about.title,
  description: sitePageCopy.about.description,
  alternates: { canonical: "/about-us" }
};

export default function AboutUsPage() { return <SiteContentPage page={sitePageCopy.about} />; }