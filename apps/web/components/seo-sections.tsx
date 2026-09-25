import Link from "next/link";
import type { ReactNode } from "react";
import type { SeoContentSection, Tool } from "@codeformattools/tool-registry";

function looksLikeCode(line: string) {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("{") ||
    trimmed.startsWith("}") ||
    trimmed.startsWith("[") ||
    trimmed.startsWith("]") ||
    trimmed.startsWith("<") ||
    trimmed.startsWith('"') ||
    trimmed.includes(": ") && !trimmed.endsWith(".") ||
    /^(SELECT|FROM|WHERE|ORDER|name:|age:|city:)/i.test(trimmed)
  );
}

function looksLikeListItem(line: string, paragraphs: string[]) {
  if (line.endsWith(".") || line.endsWith("?") || line.endsWith(":")) return false;
  if (line.length > 70) return false;
  if (looksLikeCode(line)) return false;
  const index = paragraphs.indexOf(line);
  const neighbors = paragraphs.slice(Math.max(0, index - 1), index + 3).filter(item => item !== line);
  return neighbors.some(item => item.length <= 70 && !item.endsWith(".") && !looksLikeCode(item));
}

function renderProse(paragraphs: string[], related: Tool[] = []) {
  const blocks: ReactNode[] = [];
  let i = 0;
  while (i < paragraphs.length) {
    const line = paragraphs[i];
    if (looksLikeCode(line)) {
      const codeLines: string[] = [];
      while (i < paragraphs.length && looksLikeCode(paragraphs[i])) {
        codeLines.push(paragraphs[i]);
        i += 1;
      }
      blocks.push(<pre className="seo-code" key={`code-${i}`}><code>{codeLines.join("\n")}</code></pre>);
      continue;
    }
    if (looksLikeListItem(line, paragraphs)) {
      const items: string[] = [];
      while (i < paragraphs.length && looksLikeListItem(paragraphs[i], paragraphs)) {
        items.push(paragraphs[i]);
        i += 1;
      }
      blocks.push(<ul className="seo-list" key={`list-${i}`}>{items.map(item => <li key={item}>{linkify(item, related)}</li>)}</ul>);
      continue;
    }
    blocks.push(<p key={`p-${i}-${line.slice(0, 32)}`}>{linkify(line, related)}</p>);
    i += 1;
  }
  return blocks;
}

function linkify(text: string, related: Tool[]) {
  if (!related.length) return text;
  const matches = related
    .map(tool => ({ tool, index: text.toLowerCase().indexOf(tool.name.toLowerCase()) }))
    .filter(item => item.index >= 0)
    .sort((a, b) => a.index - b.index);
  if (!matches.length) return text;

  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of matches) {
    const start = match.index;
    const end = start + match.tool.name.length;
    if (start < cursor) continue;
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(<Link className="seo-inline-link" href={`/${match.tool.slug}`} key={`${match.tool.id}-${start}`}>{text.slice(start, end)}</Link>);
    cursor = end;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

export function SeoSections({ sections, related = [] }: { sections: SeoContentSection[]; related?: Tool[] }) {
  return <>
    {sections.map(section => {
      if (section.kind === "steps") {
        return <section className="seo-block" key={section.heading}>
          <h2>{section.heading}</h2>
          {renderProse(section.paragraphs, related)}
          {section.steps && section.steps.length > 0 ? <ol>{section.steps.map(step => <li key={step}>{step}</li>)}</ol> : null}
        </section>;
      }
      if (section.kind === "items") {
        const orphanTitles = section.items?.length ? [] : section.paragraphs.filter(line => line.length <= 60 && !line.endsWith("."));
        const orphanDescs = section.items?.length ? [] : section.paragraphs.filter(line => line.endsWith(".") || line.length > 60);
        const items = section.items?.length
          ? section.items
          : orphanTitles.map((title, index) => ({ title, description: orphanDescs[index] || "" })).filter(item => item.title);

        return <section className="seo-block" key={section.heading}>
          <h2>{section.heading}</h2>
          {section.items?.length ? renderProse(section.paragraphs, related) : null}
          {items.length > 0 ? (
            <div className="seo-item-grid">
              {items.map(item => (
                <div key={item.title}>
                  <strong>{item.title}</strong>
                  {item.description ? <p>{linkify(item.description, related)}</p> : null}
                </div>
              ))}
            </div>
          ) : renderProse(section.paragraphs, related)}
        </section>;
      }
      return <section className="seo-block" key={section.heading}>
        <h2>{section.heading}</h2>
        {renderProse(section.paragraphs, related)}
      </section>;
    })}
  </>;
}
