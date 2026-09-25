import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTool, tools } from "@codeformattools/tool-registry";
import { toolMetadata, toolSchemas } from "@codeformattools/seo";
import { AdSlotPlaceholder } from "@/components/ad-slot-placeholder";
import { ExampleSnippet } from "@/components/example-snippet";
import { FaqAccordion } from "@/components/faq-accordion";
import { RelatedTools } from "@/components/related-tools";
import { SeoSections } from "@/components/seo-sections";
import { ToolShell } from "@/components/tool-shell";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return tools.map(tool => ({ slug: tool.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = getTool((await params).slug);
  return tool ? toolMetadata(tool) : {};
}

export default async function ToolPage({ params }: Props) {
  const tool = getTool((await params).slug);
  if (!tool) notFound();
  const related = tool.relatedTools.map(id => getTool(id)).filter(item => item !== undefined);
  const howToSection = tool.sections.find(section => section.heading.startsWith("How to "));
  const contentSections = tool.sections.filter(section => {
    if (section.heading.startsWith("How to ")) return false;
    if (section.heading.endsWith(" Example") || section.heading.endsWith(" Conversion Example")) return false;
    return true;
  });
  const summary = tool.intro[0] ?? tool.description;

  return <main>
    {toolSchemas(tool).map((data, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />)}
    <section className="tool-intro container">
      <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><Link href={`/tools/${tool.category}`}>{tool.category === "converters" ? "Converters" : `${tool.category.toUpperCase()} tools`}</Link><span>/</span><strong>{tool.name}</strong></div>
      <div className="eyebrow"><span className="live-dot" /> {tool.eyebrow}</div>
      <h1>{tool.headline}<span className="title-accent">.</span></h1>
      <p className="tool-summary">{summary}</p>
      <div className="trust-line"><span>100% browser based</span><span>No sign up</span><span>No data sent</span></div>
    </section>
    <div id="workspace">
      <ToolShell tool={tool} />
    </div>
    <AdSlotPlaceholder placement="after-tool" enabled />
    <section className={`content-section container${related.length ? "" : " single"}`}>
      <div className="content-main">
        <div className="eyebrow">THE DETAILS</div>
        {tool.intro.length > 1 ? (
          <section className="seo-block">
            <h2>About {tool.name}</h2>
            {tool.intro.slice(1).map(paragraph => <p key={paragraph.slice(0, 64)}>{paragraph}</p>)}
          </section>
        ) : null}
        <SeoSections sections={contentSections} related={related} />
        <section className="seo-block">
          <h2>{howToSection?.heading ?? `How to use ${tool.name}`}</h2>
          {howToSection?.paragraphs?.map(paragraph => <p key={paragraph.slice(0, 48)}>{paragraph}</p>)}
          <ol>{(howToSection?.steps?.length ? howToSection.steps : tool.howItWorks).map(item => <li key={item}>{item}</li>)}</ol>
        </section>
        <section className="seo-block">
          <h2>Example {tool.input.language.toUpperCase()}</h2>
          <p>Try this sample in the workspace:</p>
          <ExampleSnippet example={tool.example} language={tool.input.language} />
        </section>
        <section className="seo-block">
          <h2>Common {tool.input.language.toUpperCase()} issues</h2>
          <div className="error-grid">{tool.commonErrors.map(item => <div key={item.title}><strong>{item.title}</strong><p>{item.description}</p></div>)}</div>
        </section>
        <section className="seo-block">
          <h2>Frequently asked questions</h2>
          <FaqAccordion items={tool.faq} />
        </section>
        {tool.cta ? (
          <section className="seo-cta">
            <h2>{tool.cta.heading}</h2>
            {tool.cta.paragraphs.map(paragraph => <p key={paragraph.slice(0, 48)}>{paragraph}</p>)}
            <div className="seo-cta-actions">
              <a className="button primary" href="#workspace">Use {tool.name} <span aria-hidden="true">↑</span></a>
              {related[0] ? <Link className="button secondary" href={`/${related[0].slug}`}>Try {related[0].name}</Link> : null}
            </div>
          </section>
        ) : null}
      </div>
      {related.length > 0 && <RelatedTools current={tool.id} related={related} />}
    </section>
  </main>;
}
