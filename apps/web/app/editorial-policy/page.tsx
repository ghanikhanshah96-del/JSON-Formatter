import type { Metadata } from "next";
import { SiteContentPage } from "@/components/site-content-page";
import { sitePageCopy } from "@/lib/site-page-copy";

export const metadata: Metadata = {
  title: sitePageCopy.editorial.title,
  description: sitePageCopy.editorial.description,
  alternates: { canonical: "/editorial-policy" }
};

export default function EditorialPolicyPage() { return <SiteContentPage page={sitePageCopy.editorial} />; }