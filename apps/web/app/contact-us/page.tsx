import type { Metadata } from "next";
import ContactPage from "../contact/page";
import { sitePageCopy } from "@/lib/site-page-copy";

export const metadata: Metadata = {
  title: sitePageCopy.contact.title,
  description: sitePageCopy.contact.description,
  alternates: { canonical: "/contact-us" }
};

export default function ContactUsPage() { return <ContactPage />; }