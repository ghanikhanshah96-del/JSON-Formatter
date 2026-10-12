import Link from "next/link";
import type { ReactNode } from "react";
import type { SitePageCopy } from "@/lib/site-page-copy";

type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "subheading"; text: string };

type ContentSection = {
  heading: string;
  id: string;
  blocks: ContentBlock[];
};

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const linkPattern = /\[([^\]]+)\]\((\/[^)]+)\)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = linkPattern.exec(text))) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    parts.push(<Link href={match[2]} key={`${keyPrefix}-${index}`}>{match[1]}</Link>);
    cursor = match.index + match[0].length;
    index += 1;
  }

  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

export function SitePageHeading({ page }: { page: SitePageCopy }) {
  return <header className="site-page-hero">
    <div className="eyebrow">{page.eyebrow}</div>
    <h1>{page.heading}</h1>
    {page.updated ? <p className="site-page-updated">Last updated: {page.updated}</p> : null}
    <div className="site-page-intro">
      {page.intro.map((paragraph, index) => <p key={index}>{renderInline(paragraph, `intro-${index}`)}</p>)}
    </div>
  </header>;
}

function sectionId(heading: string, index: number) {
  const slug = heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "section"}-${index + 1}`;
}

function parseSections(content: string): ContentSection[] {
  const blocks = content.trim().split(/\n\s*\n/);

  const sections: ContentSection[] = [];
  let current: ContentSection | null = null;

  function ensureSection() {
    if (!current) current = { heading: "Overview", id: "overview-1", blocks: [] };
    return current;
  }

  function addContent(lines: string[]) {
    if (lines.length === 0) return;
    const section = ensureSection();
    if (lines.every(line => line.startsWith("- "))) {
      section.blocks.push({ type: "list", items: lines.map(line => line.slice(2)) });
      return;
    }
    section.blocks.push({ type: "paragraph", text: lines.join(" ") });
  }

  blocks.forEach(block => {
    const lines = block.split("\n").filter(Boolean);
    if (lines.length === 0) return;
    const firstLine = lines[0];

    if (firstLine.startsWith("## ")) {
      const heading = firstLine.slice(3);
      current = { heading, id: sectionId(heading, sections.length), blocks: [] };
      sections.push(current);
      addContent(lines.slice(1));
      return;
    }

    if (firstLine.startsWith("### ")) {
      ensureSection().blocks.push({ type: "subheading", text: firstLine.slice(4) });
      addContent(lines.slice(1));
      return;
    }

    addContent(lines);
  });

  return sections;
}

function renderBlocks(blocks: ContentBlock[], keyPrefix: string) {
  return blocks.map((block, blockIndex) => {
    if (block.type === "subheading") return <h3 key={`${keyPrefix}-h-${blockIndex}`}>{block.text}</h3>;
    if (block.type === "list") return <ul className="seo-list" key={`${keyPrefix}-l-${blockIndex}`}>
      {block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item, `${keyPrefix}-${blockIndex}-${itemIndex}`)}</li>)}
    </ul>;
    return <p key={`${keyPrefix}-p-${blockIndex}`}>{renderInline(block.text, `${keyPrefix}-${blockIndex}`)}</p>;
  });
}

function splitSubsections(blocks: ContentBlock[]) {
  const firstSubheading = blocks.findIndex(block => block.type === "subheading");
  if (firstSubheading < 0) return { prelude: blocks, subsections: [] };

  const prelude = blocks.slice(0, firstSubheading);
  const subsections: { heading: string; blocks: ContentBlock[] }[] = [];

  blocks.slice(firstSubheading).forEach(block => {
    if (block.type === "subheading") {
      subsections.push({ heading: block.text, blocks: [] });
      return;
    }
    subsections.at(-1)?.blocks.push(block);
  });

  return { prelude, subsections };
}

export function SitePageSections({ page }: { page: SitePageCopy }) {
  const sections = parseSections(page.content);

  return <>
    <nav className="site-page-nav" aria-label="On this page">
      <strong>Contents</strong>
      <div className="site-page-nav-links">
        {sections.map(section => <a href={`#${section.id}`} key={section.id}>{section.heading}</a>)}
      </div>
    </nav>
    <div className="site-page-sections">
      {sections.map((section, index) => {
        const { prelude, subsections } = splitSubsections(section.blocks);
        return <section className="site-page-section" id={section.id} key={section.id}>
          <h2>{section.heading}</h2>
          <div className="site-page-section-body">
            {renderBlocks(prelude, `${index}-prelude`)}
            {subsections.length > 0 ? <div className="site-page-subheading-grid">
              {subsections.map((subsection, subsectionIndex) => <div className="site-page-subsection" key={subsection.heading}>
                <h3>{subsection.heading}</h3>
                {renderBlocks(subsection.blocks, `${index}-subsection-${subsectionIndex}`)}
              </div>)}
            </div> : null}
          </div>
        </section>;
      })}
    </div>
  </>;
}

export function SiteContentPage({ page }: { page: SitePageCopy }) {
  return <main className="simple-page container site-policy-page">
    <SitePageHeading page={page} />
    <SitePageSections page={page} />
  </main>;
}
