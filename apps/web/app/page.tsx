/* eslint-disable react/no-unescaped-entities -- The hero displays literal JSON syntax. */
import type { Metadata } from "next";
import Link from "next/link";
import { homeSchemas, siteConfig, siteOrigin } from "@codeformattools/seo";
import { categories, homeSeoCopy, tools } from "@codeformattools/tool-registry";
import { FaqAccordion } from "@/components/faq-accordion";
import { SeoSections } from "@/components/seo-sections";
import { ToolsGrid } from "@/components/tools-grid";

export const metadata: Metadata = {
  title: homeSeoCopy.seo.title,
  description: homeSeoCopy.seo.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: homeSeoCopy.seo.title,
    description: homeSeoCopy.seo.description,
    url: siteOrigin(),
    siteName: siteConfig.name,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: siteConfig.name }]
  },
  twitter: {
    card: "summary_large_image",
    title: homeSeoCopy.seo.title,
    description: homeSeoCopy.seo.description,
    images: ["/og-image.png"]
  }
};

export default function Home() {
  const heroIntro = homeSeoCopy.intro[0];
  const remainingIntro = homeSeoCopy.intro.slice(1);

  return <main>
    {homeSchemas().map((data, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />)}
    <section className="hero"><div className="container hero-grid"><div>
      <div className="eyebrow"><span className="live-dot" /> FREE ONLINE DEVELOPER TOOLS</div>
      <h1>{homeSeoCopy.headline}</h1>
      <p className="hero-copy">{heroIntro}</p>
      <div className="hero-actions"><Link className="button primary" href="/json-formatter">Open JSON Formatter <span aria-hidden="true">→</span></Link><a className="button secondary" href="#tools">Explore tools ↓</a></div>
      <div className="hero-proof"><span>Runs in your browser</span><span>Never uploaded</span><span>No registration</span><span>Up to 5 MB</span></div>
    </div><div className="hero-preview" aria-label="Example formatted JSON"><div className="preview-top"><span className="preview-dots"><i/><i/><i/></span><span>response.json</span><span className="preview-badge">VALID JSON</span></div><div className="preview-code"><div><b>1</b><span>{"{"}</span></div><div><b>2</b><span>  <i>"project"</i>: <strong>"codeformattertools"</strong>,</span></div><div><b>3</b><span>  <i>"private"</i>: <mark>true</mark>,</span></div><div><b>4</b><span>  <i>"tools"</i>: [</span></div><div><b>5</b><span>    <strong>"format"</strong>,</span></div><div><b>6</b><span>    <strong>"validate"</strong>,</span></div><div><b>7</b><span>    <strong>"minify"</strong></span></div><div><b>8</b><span>  ]</span></div><div><b>9</b><span>{"}"}</span></div></div><div className="preview-footer"><span className="green-dot" /> Processed locally in your browser <span>0.02s</span></div></div></div></section>
    <section className="tools-section container" id="tools"><div className="section-heading"><div><div className="eyebrow">THE TOOLBOX</div><h2>All-in-One Developer Utility Platform</h2></div><p>Format JSON, validate XML, organize YAML, clean SQL, or convert between formats — all locally in your browser.</p></div><ToolsGrid tools={tools} categories={categories} /></section>
    <section className="home-guides container">
      <div className="section-heading">
        <div><div className="eyebrow">LEARN</div><h2>Short guides into live tools</h2></div>
        <p>Practical long-tails — API responses, Kubernetes YAML, private processing — each linked into a workspace.</p>
      </div>
      <div className="home-guide-links">
        <Link href="/learn/format-json-api-response">JSON for API responses →</Link>
        <Link href="/learn/yaml-kubernetes-config">YAML for Kubernetes →</Link>
        <Link href="/learn/private-browser-developer-tools">Private-by-design tools →</Link>
        <Link href="/learn">All guides →</Link>
        <Link href="/performance">Performance budget →</Link>
      </div>
    </section>
    <section className="home-seo container">
      <div className="content-main home-seo-main">
        {remainingIntro.length > 0 ? (
          <section className="seo-block">
            <h2>Free online developer tools</h2>
            {remainingIntro.map(paragraph => <p key={paragraph.slice(0, 48)}>{paragraph}</p>)}
          </section>
        ) : null}
        <SeoSections sections={homeSeoCopy.sections.filter(section => section.heading !== "All-in-One Developer Utility Platform")} related={tools.slice(0, 8)} />
        <section className="seo-block">
          <h2>Frequently Asked Questions</h2>
          <FaqAccordion items={homeSeoCopy.faq} />
        </section>
        <section className="seo-cta">
          <h2>{homeSeoCopy.cta.heading}</h2>
          {homeSeoCopy.cta.paragraphs.map(paragraph => <p key={paragraph.slice(0, 48)}>{paragraph}</p>)}
          <div className="seo-cta-actions">
            <a className="button primary" href="#tools">Choose a tool <span aria-hidden="true">→</span></a>
            <Link className="button secondary" href="/json-formatter">Start with JSON Formatter</Link>
          </div>
        </section>
      </div>
    </section>
    <section className="privacy-band"><div className="container privacy-grid"><div className="privacy-symbol" aria-hidden="true">🛡</div><div><div className="eyebrow">PRIVACY IS THE DEFAULT</div><h2>Your data stays<br /><em>on your device.</em></h2><p>Everything runs in your browser. Your input is never uploaded, logged, or stored by {siteConfig.name}. Work with real data confidently.</p><Link href="/privacy">How our privacy works <span aria-hidden="true">→</span></Link></div><div className="privacy-list"><div><span>01</span><strong>Local processing</strong><p>Every operation runs in a dedicated browser worker.</p></div><div><span>02</span><strong>No account required</strong><p>Open a tool and get straight to work.</p></div><div><span>03</span><strong>Input never stored</strong><p>We do not save your pasted text or files.</p></div></div></div></section>
    <section className="bottom-cta container"><div className="eyebrow">READY WHEN YOU ARE</div><h2>Less friction.<br /><em>More flow.</em></h2><div className="seo-cta-actions" style={{ justifyContent: "center" }}><Link className="button primary" href="/json-formatter">Start formatting <span aria-hidden="true">→</span></Link><Link className="button secondary" href="/learn">Browse Learn</Link></div></section>
  </main>;
}
