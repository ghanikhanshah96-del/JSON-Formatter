import Link from "next/link";
import type { ReactNode } from "react";
import type { SitePageCopy } from "@/lib/site-page-copy";

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
  return <>
    <div className="eyebrow">{page.eyebrow}</div>
    <h1>{page.heading}</h1>
    {page.updated ? <p className="site-page-updated">Last Updated: {page.updated}</p> : null}
    {page.intro.map((paragraph, index) => <p key={index}>{renderInline(paragraph, `intro-${index}`)}</p>)}
  </>;
}

export function SitePageSections({ page }: { page: SitePageCopy }) {
  const blocks = page.content.trim().split(/\n\s*\n/);

  return <div className="site-page-sections">
    {blocks.map((block, index) => {
      const lines = block.split("\n").filter(Boolean);
      const firstLine = lines[0];
      if (firstLine.startsWith("### ") || firstLine.startsWith("## ")) {
        const isSubheading = firstLine.startsWith("### ");
        const Heading = isSubheading ? "h3" : "h2";
        const content = lines.slice(1);
        return <section key={index}>
          <Heading>{firstLine.slice(isSubheading ? 4 : 3)}</Heading>
          {content.length > 0 && content.every(line => line.startsWith("- ")) ? (
            <ul className="seo-list">
              {content.map((line, itemIndex) => <li key={itemIndex}>{renderInline(line.slice(2), `${index}-${itemIndex}`)}</li>)}
            </ul>
          ) : content.length > 0 ? <p>{renderInline(content.join(" "), `section-${index}`)}</p> : null}
        </section>;
      }
      if (lines.every(line => line.startsWith("- "))) {
        return <ul className="seo-list" key={index}>
          {lines.map((line, itemIndex) => <li key={itemIndex}>{renderInline(line.slice(2), `${index}-${itemIndex}`)}</li>)}
        </ul>;
      }
      return <p key={index}>{renderInline(lines.join(" "), `section-${index}`)}</p>;
    })}
  </div>;
}

export function SiteContentPage({ page }: { page: SitePageCopy }) {
  return <main className="simple-page container site-policy-page">
    <SitePageHeading page={page} />
    <SitePageSections page={page} />
  </main>;
}