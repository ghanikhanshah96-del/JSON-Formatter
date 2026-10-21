import type { ReactNode } from "react";
import Link from "next/link";
import { FaqAccordion } from "./faq-accordion";
import type { BlogContentBlock, BlogPost } from "@/lib/learn-guides";

function displayListItem(value: string) {
  return value.trim().replace(/^(?:[-*+]|•|·|●|◦|▪|)\s+/, "").trim();
}

function renderLinkedText(text: string, links: { text: string; href: string }[] = []): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  links.forEach((link, index) => {
    const linkStart = text.indexOf(link.text, cursor);
    if (linkStart < 0) return;
    if (linkStart > cursor) nodes.push(text.slice(cursor, linkStart));
    nodes.push(<Link href={link.href} key={`${link.href}-${index}`}>{link.text}</Link>);
    cursor = linkStart + link.text.length;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function renderBlocks(blocks: BlogContentBlock[], keyPrefix: string) {
  return blocks.map((block, index) => {
    if (block.type === "paragraph") return <p key={`${keyPrefix}-p-${index}`}>{renderLinkedText(block.text, block.links)}</p>;
    if (block.type === "subheading") return <h3 key={`${keyPrefix}-h-${index}`}>{block.text}</h3>;
    if (block.type === "code") return <pre className="blog-code" key={`${keyPrefix}-code-${index}`}><code>{block.code}</code></pre>;
    const List = block.ordered ? "ol" : "ul";
    const isCompact = block.items.length >= 4 && block.items.every(item => item.length <= 72);
    return <List className={`seo-list${isCompact ? " seo-list-compact" : ""}`} key={`${keyPrefix}-list-${index}`}>{block.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{displayListItem(item)}</li>)}</List>;
  });
}

function splitSubsections(blocks: BlogContentBlock[]) {
  const first = blocks.findIndex(block => block.type === "subheading");
  if (first < 0) return { prelude: blocks, subsections: [] as { heading: string; blocks: BlogContentBlock[] }[] };
  const subsections: { heading: string; blocks: BlogContentBlock[] }[] = [];
  blocks.slice(first).forEach(block => {
    if (block.type === "subheading") subsections.push({ heading: block.text, blocks: [] });
    else subsections.at(-1)?.blocks.push(block);
  });
  return { prelude: blocks.slice(0, first), subsections };
}

function getFaqItems(blocks: BlogContentBlock[]) {
  const items: { question: string; answer: string }[] = [];
  let question = ""; let answers: string[] = [];
  const flush = () => { if (question && answers.length) items.push({ question, answer: answers.join(" ") }); };
  blocks.forEach(block => {
    if (block.type === "subheading") { flush(); question = block.text; answers = []; }
    else if (block.type === "paragraph") answers.push(block.text);
  });
  flush(); return items;
}

export function BlogArticleBody({ post }: { post: Pick<BlogPost, "slug" | "intro" | "sections"> }) {
  return <article className="learn-body">
    <div className="blog-intro">{post.intro.map((paragraph, index) => <p key={`${paragraph.slice(0, 48)}-${index}`}>{paragraph}</p>)}</div>
    {post.sections.map((section, sectionIndex) => {
      if (section.heading === "Frequently Asked Questions") return <section key={`${section.heading}-${sectionIndex}`} className="seo-block blog-faq"><h2>{section.heading}</h2><FaqAccordion items={getFaqItems(section.blocks)} group={`blog-faq-${post.slug}`} /></section>;
      const { prelude, subsections } = splitSubsections(section.blocks);
      return <section key={`${section.heading}-${sectionIndex}`} className="seo-block"><h2>{section.heading}</h2>{renderBlocks(prelude, `${section.heading}-prelude`)}{subsections.length ? <div className="blog-subheading-grid">{subsections.map((subsection, index) => <div className="blog-subsection" key={`${subsection.heading}-${index}`}><h3>{subsection.heading}</h3>{renderBlocks(subsection.blocks, `${section.heading}-${index}`)}</div>)}</div> : null}</section>;
    })}
  </article>;
}
