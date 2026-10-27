import type { BlogContentBlock } from "./learn-guides";

export type BlogImportMode = "auto" | "rich" | "markdown" | "plain";

export type BlogImportWarning = {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
};

export type BlogImportResult = {
  title: string;
  slug: string;
  metaTitle: string;
  description: string;
  intro: string[];
  sections: { heading: string; blocks: BlogContentBlock[] }[];
  faqs: { question: string; answer: string }[];
  warnings: BlogImportWarning[];
  source: "rich" | "markdown" | "plain";
};

type ParsedNode =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "paragraph"; text: string; rawText?: string; links?: { text: string; href: string }[] }
  | { type: "list"; items: string[]; ordered: boolean }
  | { type: "code"; code: string; language: "json" | "javascript" | "sql" | "yaml" | "xml" | "text" }
  | { type: "table"; headers: string[]; rows: string[][] };

type SeoFrontMatter = {
  metaTitle?: string;
  description?: string;
  slug?: string;
};

const MAX_SOURCE_LENGTH = 200_000;

function cleanText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, " ").trim();
}

function cleanMultiline(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ").trim();
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

export function stripImportedListMarker(value: string) {
  return cleanText(value).replace(/^(?:[-*+]|•|·|●|◦|▪|)\s+/, "").trim();
}

function cleanHref(value: string) {
  const href = value.replace(/[\u200b-\u200d\u2060\ufeff]/g, "").trim();
  const wrapped = href.match(/^(?:<|["'])(.*?)(?:>|["'])$/);
  return (wrapped?.[1] ?? href).trim();
}

function truncateSentence(value: string, maximum: number) {
  const normalized = cleanText(value);
  if (normalized.length <= maximum) return normalized;
  const candidate = normalized.slice(0, maximum + 1);
  const sentence = candidate.match(/^(.{40,}[.!?])(?:\s|$)/)?.[1];
  if (sentence && sentence.length <= maximum) return sentence;
  const boundary = candidate.slice(0, maximum).lastIndexOf(" ");
  return `${candidate.slice(0, boundary > 39 ? boundary : maximum).replace(/[,:;\s]+$/, "")}…`;
}

function codeLanguage(value: string): "json" | "javascript" | "sql" | "yaml" | "xml" | "text" {
  const language = value.toLowerCase();
  if (language === "json" || language.includes("application/json")) return "json";
  if (["js", "jsx", "javascript", "typescript", "ts", "tsx"].includes(language)) return "javascript";
  if (["sql", "mysql", "postgres", "postgresql", "sqlite", "tsql"].includes(language)) return "sql";
  if (["yaml", "yml"].some(item => language.includes(item))) return "yaml";
  if (["xml", "html", "markup"].some(item => language.includes(item))) return "xml";
  return "text";
}

function normalizeBlogHref(value: string) {
  const href = cleanHref(value);
  try {
    const url = new URL(href);
    if ((url.protocol === "https:" || url.protocol === "http:") && /^(www\.)?codeformattertools\.com$/i.test(url.hostname)) {
      return `${url.pathname}${url.search}${url.hash}` || "/";
    }
  } catch { /* relative URL */ }
  return href;
}

export function isSafeBlogLink(value: string) {
  const href = normalizeBlogHref(value);
  if (href.startsWith("/")) return !href.startsWith("//");
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}

function inlineMarkdown(value: string, warnings: BlogImportWarning[]) {
  const links: { text: string; href: string }[] = [];
  const text = value.replace(/\[([^\]]+)]\(([^)]+)\)/g, (match, label: string, href: string) => {
    const cleanLabel = cleanText(label);
    const normalizedHref = normalizeBlogHref(href);
    if (!cleanLabel || !isSafeBlogLink(normalizedHref)) {
      if (href.trim()) warnings.push({ code: "unsafe-link-removed", severity: "warning", message: `The unsafe link destination “${href.trim()}” was removed while keeping its visible text.` });
      return cleanLabel || match;
    }
    links.push({ text: cleanLabel, href: normalizedHref });
    return cleanLabel;
  }).replace(/\*\*([^*]+)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1").replace(/`([^`]+)`/g, "$1");
  return { text: cleanText(text), links: links.length ? links : undefined };
}

function splitTableRow(value: string) {
  const trimmed = value.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map(cell => cleanText(cell));
}

function isMarkdownTableDivider(value: string) {
  const cells = splitTableRow(value);
  return cells.length >= 2 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function parseTextNodes(source: string, plain: boolean, warnings: BlogImportWarning[]): ParsedNode[] {
  const lines = cleanMultiline(source).split("\n");
  const nodes: ParsedNode[] = [];
  let paragraph: string[] = [];
  let fence: { language: string; lines: string[] } | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const rawText = paragraph.join("\n");
    const parsed = inlineMarkdown(paragraph.join(" "), warnings);
    if (parsed.text) nodes.push({ type: "paragraph", ...parsed, rawText });
    paragraph = [];
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex];
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^```\s*([\w-]*)/);
    if (fence) {
      if (trimmed === "```") {
        nodes.push({ type: "code", code: fence.lines.join("\n").trim(), language: codeLanguage(fence.language) });
        fence = null;
      } else fence.lines.push(rawLine);
      continue;
    }
    if (fenceMatch) {
      flushParagraph();
      fence = { language: fenceMatch[1], lines: [] };
      continue;
    }
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (trimmed.includes("|") && isMarkdownTableDivider(lines[lineIndex + 1] ?? "")) {
      flushParagraph();
      const headers = splitTableRow(trimmed);
      const rows: string[][] = [];
      lineIndex += 2;
      while (lineIndex < lines.length && lines[lineIndex].trim().includes("|")) {
        const row = splitTableRow(lines[lineIndex]);
        rows.push(Array.from({ length: headers.length }, (_, index) => row[index] ?? ""));
        lineIndex += 1;
      }
      lineIndex -= 1;
      if (rows.length) nodes.push({ type: "table", headers, rows });
      else warnings.push({ code: "table-incomplete", severity: "warning", message: "A Markdown table header had no body rows. Review it before publishing." });
      continue;
    }

    const heading = !plain ? trimmed.match(/^(#{1,3})\s+(.+)$/) : trimmed.match(/^(?:H([1-3])|Title|Section|Subheading)\s*:\s*(.+)$/i);
    if (heading) {
      flushParagraph();
      let level: 1 | 2 | 3;
      let text: string;
      if (!plain) {
        level = heading[1].length as 1 | 2 | 3;
        text = heading[2];
      } else {
        const label = trimmed.slice(0, trimmed.indexOf(":"));
        level = label.toLowerCase() === "title" ? 1 : label.toLowerCase() === "section" ? 2 : label.toLowerCase() === "subheading" ? 3 : Number(heading[1]) as 1 | 2 | 3;
        text = heading[2];
      }
      nodes.push({ type: `h${level}` as "h1" | "h2" | "h3", text: cleanText(text) });
      continue;
    }

    const list = trimmed.match(/^([-*+•])\s+(.+)$/) ?? trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (list) {
      flushParagraph();
      const ordered = /^\d/.test(list[1]);
      const item = stripImportedListMarker(list[2]);
      const previous = nodes.at(-1);
      if (previous?.type === "list" && previous.ordered === ordered) previous.items.push(item);
      else nodes.push({ type: "list", items: [item], ordered });
      continue;
    }
    paragraph.push(trimmed);
  }
  if (fence?.lines.length) nodes.push({ type: "code", code: fence.lines.join("\n").trim(), language: codeLanguage(fence.language) });
  flushParagraph();
  return nodes;
}

function extractLinks(element: Element, warnings: BlogImportWarning[]) {
  const links: { text: string; href: string }[] = [];
  element.querySelectorAll("a[href]").forEach(anchor => {
    const text = cleanText(anchor.textContent ?? "");
    const href = anchor.getAttribute("href")?.trim() ?? "";
    const normalizedHref = normalizeBlogHref(href);
    if (text && isSafeBlogLink(normalizedHref)) links.push({ text, href: normalizedHref });
    else if (href) warnings.push({ code: "unsafe-link-removed", severity: "warning", message: `The unsafe link destination “${href}” was removed while keeping its visible text.` });
  });
  return links.length ? links : undefined;
}

function normalizeLinkBoundaries(value: string, links: { text: string; href: string }[] | undefined) {
  let normalized = value;
  let cursor = 0;
  for (const link of links ?? []) {
    let start = normalized.indexOf(link.text, cursor);
    if (start < 0) continue;
    if (start > 0 && /[\p{L}\p{N}]$/u.test(normalized.slice(0, start)) && /^[\p{L}\p{N}]/u.test(link.text)) {
      normalized = `${normalized.slice(0, start)} ${normalized.slice(start)}`;
      start += 1;
    }
    const end = start + link.text.length;
    if (end < normalized.length && /[\p{L}\p{N}]$/u.test(link.text) && /^[\p{L}\p{N}]/u.test(normalized.slice(end))) {
      normalized = `${normalized.slice(0, end)} ${normalized.slice(end)}`;
    }
    cursor = end;
  }
  return normalized;
}

function parseRichNodes(html: string, warnings: BlogImportWarning[]): ParsedNode[] {
  if (typeof DOMParser === "undefined") throw new Error("Rich-text import requires a browser.");
  const document = new DOMParser().parseFromString(html, "text/html");
  document.querySelectorAll("script,style,iframe,object,embed,svg,link,meta,noscript,template").forEach(element => element.remove());
  const nodes: ParsedNode[] = [];
  const supportedContainer = new Set(["BODY", "DIV", "MAIN", "ARTICLE", "SECTION", "HEADER", "FOOTER", "FIGURE", "FIGCAPTION"]);

  const visit = (element: Element) => {
    const tag = element.tagName.toUpperCase();
    if (supportedContainer.has(tag)) {
      Array.from(element.children).forEach(visit);
      return;
    }
    if (tag === "H1" || tag === "H2" || tag === "H3") {
      const text = cleanText(element.textContent ?? "");
      if (text) nodes.push({ type: tag.toLowerCase() as "h1" | "h2" | "h3", text });
      return;
    }
    if (tag === "UL" || tag === "OL") {
      const items = Array.from(element.children).filter(child => child.tagName.toUpperCase() === "LI").map(child => cleanText(child.textContent ?? "")).filter(Boolean);
      if (items.length) nodes.push({ type: "list", items, ordered: tag === "OL" });
      return;
    }
    if (tag === "PRE") {
      const code = cleanMultiline(element.textContent ?? "");
      const className = `${element.className} ${element.querySelector("code")?.className ?? ""}`;
      if (code) nodes.push({ type: "code", code, language: codeLanguage(className.replace(/language-/g, "")) });
      return;
    }
    if (tag === "TABLE") {
      const rows = Array.from(element.querySelectorAll("tr")).map(row => Array.from(row.querySelectorAll("th,td")).map(cell => cleanText(cell.textContent ?? "")));
      const width = Math.max(0, ...rows.map(row => row.length));
      if (rows.length >= 2 && width >= 2) {
        const normalized = rows.map(row => Array.from({ length: width }, (_, index) => row[index] ?? ""));
        nodes.push({ type: "table", headers: normalized[0], rows: normalized.slice(1) });
      } else if (rows.some(row => row.some(Boolean))) {
        warnings.push({ code: "table-incomplete", severity: "warning", message: "A pasted table did not contain both headers and body rows. Review it before publishing." });
      }
      return;
    }
    if (["P", "BLOCKQUOTE", "LI"].includes(tag)) {
      const links = extractLinks(element, warnings);
      const text = normalizeLinkBoundaries(cleanText(element.textContent ?? ""), links);
      if (!text) return;
      const bullet = text.match(/^([-*+•])\s+(.+)$/) ?? text.match(/^(\d+)[.)]\s+(.+)$/);
      const wordList = /mso-list/i.test(element.getAttribute("style") ?? "") || /MsoList/i.test(element.className);
      if (bullet || wordList) {
        const ordered = bullet ? /^\d/.test(bullet[1]) : /^\d+[.)]/.test(text);
        const item = stripImportedListMarker(bullet?.[2] ?? text.replace(/^(?:\d+[.)]\s*)/, ""));
        const previous = nodes.at(-1);
        if (previous?.type === "list" && previous.ordered === ordered) previous.items.push(item);
        else nodes.push({ type: "list", items: [item], ordered });
      } else nodes.push({
        type: "paragraph",
        text,
        rawText: (element.textContent ?? "").replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ").trimEnd(),
        links,
      });
      return;
    }
    if (element.children.length) Array.from(element.children).forEach(visit);
    else {
      const text = cleanText(element.textContent ?? "");
      if (text) nodes.push({ type: "paragraph", text });
    }
  };

  visit(document.body);
  return nodes;
}

function isFaqHeading(value: string) {
  return /^(frequently asked questions|frequently asked question|faqs?|common questions)$/i.test(cleanText(value));
}

function extractSeoFrontMatter(nodes: ParsedNode[], warnings: BlogImportWarning[]) {
  const firstH1 = nodes.findIndex(node => node.type === "h1");
  if (firstH1 <= 0) return { nodes, metadata: {} as SeoFrontMatter };
  const prefix = nodes.slice(0, firstH1);
  const hasSeoHeading = prefix.some(node => node.type === "h2" && /^(seo|search)\s+(details|metadata)$/i.test(cleanText(node.text)));
  const metadata: SeoFrontMatter = {};
  let recognized = 0;
  for (const node of prefix) {
    if (node.type !== "paragraph") continue;
    const match = node.text.match(/^(SEO Meta Title|Meta Description|(?:SEO-Friendly\s+|Suggested\s+)?URL Slug)\s*:\s*(.+)$/i);
    if (!match) continue;
    recognized += 1;
    const value = cleanText(match[2]);
    if (/meta title/i.test(match[1])) metadata.metaTitle = value;
    else if (/description/i.test(match[1])) metadata.description = value;
    else metadata.slug = slugify(value);
  }
  if (!hasSeoHeading && recognized < 2) return { nodes, metadata: {} as SeoFrontMatter };
  warnings.push({ code: "seo-metadata-applied", severity: "info", message: "SEO details before the H1 were applied to the article fields and removed from the visible article body." });
  return { nodes: nodes.slice(firstH1), metadata };
}

function looksLikeSqlStart(value: string) {
  return /^(select|with|insert|update|delete|merge|create|alter|drop|truncate)\b/i.test(value.trim());
}

function looksLikeJsonStart(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function looksLikeXmlStart(value: string) {
  return /^<\??[A-Za-z_][\w:.-]*(?:\s|>|\/)/.test(value.trim());
}

function looksLikeYamlLine(value: string) {
  return /^(?:\s*-\s+)?[A-Za-z_][\w.-]*:\s*(?:.*)$/.test(value.replace(/\u00a0/g, " "));
}

function looksLikeYamlBlock(nodes: ParsedNode[], firstIndex: number) {
  const first = nodes[firstIndex];
  const second = nodes[firstIndex + 1];
  if (first?.type !== "paragraph" || !looksLikeYamlLine(first.rawText || first.text)) return false;
  return second?.type === "list" || second?.type === "paragraph" && looksLikeYamlLine(second.rawText || second.text);
}

type CodeLanguage = Extract<ParsedNode, { type: "code" }>["language"];

function codeCueLanguage(value: string): CodeLanguage | null | undefined {
  const cue = value.trim();
  if (!/:\s*$/.test(cue)) return undefined;
  if (/\bjson\b/i.test(cue)) return "json";
  if (/\byaml\b|\byml\b/i.test(cue)) return "yaml";
  if (/\bxml\b/i.test(cue)) return "xml";
  if (/\bsql\b|\bquery\b/i.test(cue)) return "sql";
  if (/^(?:output|result|press|shortcut)\s*:/i.test(cue)) return "text";
  if (/(?:for example|consider this example|before(?:\s+(?:formatting|sorting|minification|conversion))?|after(?:\s+(?:formatting|sorting|minification|conversion))?|looks? like this|becomes|this is invalid|invalid|correct|must be removed)\s*[^.]*:\s*$/i.test(cue)) return null;
  return undefined;
}

function jsonBalance(value: string) {
  let braces = 0;
  let brackets = 0;
  let quoted = false;
  let escaped = false;
  for (const character of value) {
    if (escaped) { escaped = false; continue; }
    if (character === "\\" && quoted) { escaped = true; continue; }
    if (character === '"') { quoted = !quoted; continue; }
    if (quoted) continue;
    if (character === "{") braces += 1;
    else if (character === "}") braces -= 1;
    else if (character === "[") brackets += 1;
    else if (character === "]") brackets -= 1;
  }
  return braces + brackets;
}

function normalizeImportedCode(lines: string[], language: CodeLanguage) {
  const expanded = lines.flatMap(line => cleanMultiline(line).split("\n"));
  const meaningful = expanded.filter(line => line.trim().length > 0);
  const code = (language === "sql" ? meaningful.map(line => line.trim()) : meaningful.map(line => line.trimEnd())).join("\n");
  if (language === "json" && code.includes("\n")) {
    try { return JSON.stringify(JSON.parse(code), null, 2); } catch { /* preserve intentionally invalid examples */ }
  }
  return code;
}

function promoteDelimitedTables(nodes: ParsedNode[]) {
  const result: ParsedNode[] = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node.type !== "paragraph" || !node.text.includes("|")) { result.push(node); continue; }
    const rows: string[][] = [];
    let end = index;
    while (end < nodes.length) {
      const candidate = nodes[end];
      if (candidate.type !== "paragraph" || !candidate.text.includes("|")) break;
      const cells = splitTableRow(candidate.text);
      if (cells.length < 2 || (rows.length && cells.length !== rows[0].length)) break;
      rows.push(cells); end += 1;
    }
    if (rows.length >= 2) {
      result.push({ type: "table", headers: rows[0], rows: rows.slice(1) });
      index = end - 1;
    } else result.push(node);
  }
  return result;
}

function promoteLabelledCode(nodes: ParsedNode[]) {
  const result: ParsedNode[] = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node.type === "code") {
      const normalized = normalizeImportedCode([node.code], node.language);
      result.push({ ...node, code: normalized }); continue;
    }
    if (node.type === "paragraph" && looksLikeSqlStart(node.text) && /;\s*$/.test(node.text)) {
      result.push({ type: "code", code: normalizeImportedCode([node.rawText || node.text], "sql"), language: "sql" }); continue;
    }
    result.push(node);
    if (node.type !== "paragraph") continue;
    const hintedLanguage = codeCueLanguage(node.text);
    if (hintedLanguage === undefined) continue;
    const first = nodes[index + 1];
    if (first?.type !== "paragraph") continue;
    const language: CodeLanguage | null = looksLikeSqlStart(first.text) ? "sql"
      : looksLikeJsonStart(first.text) ? "json"
      : looksLikeXmlStart(first.text) ? "xml"
      : hintedLanguage === "yaml" || looksLikeYamlBlock(nodes, index + 1) ? "yaml"
      : hintedLanguage;
    if (!language) continue;
    const lines = [first.rawText || first.text];
    let end = index + 1;
    if (language === "sql") {
      while (!/;\s*$/.test(lines.at(-1) ?? "") && end + 1 < nodes.length && lines.length < 80) {
        const next = nodes[end + 1];
        if (next.type !== "paragraph") break;
        lines.push(next.rawText || next.text);
        end += 1;
      }
      if (!/;\s*$/.test(lines.at(-1) ?? "")) continue;
    } else if (language === "json") {
      let balance = jsonBalance(lines[0]);
      while (balance > 0 && end + 1 < nodes.length && lines.length < 120) {
        const next = nodes[end + 1];
        if (next.type !== "paragraph") break;
        const line = next.rawText || next.text;
        lines.push(line);
        balance += jsonBalance(line);
        end += 1;
      }
      if (balance !== 0) continue;
    } else if (language === "xml") {
      while (end + 1 < nodes.length && lines.length < 120) {
        const next = nodes[end + 1];
        if (next.type !== "paragraph" || !looksLikeXmlStart(next.text) && !/^<\//.test(next.text.trim())) break;
        lines.push(next.rawText || next.text); end += 1;
      }
    } else if (language === "yaml") {
      while (end + 1 < nodes.length && lines.length < 120) {
        const next = nodes[end + 1];
        if (next.type === "paragraph" && looksLikeYamlLine(next.rawText || next.text)) {
          lines.push(next.rawText || next.text); end += 1; continue;
        }
        if (next.type === "list") {
          lines.push(...next.items.map(item => `  - ${stripImportedListMarker(item)}`)); end += 1;
        }
        break;
      }
    }
    result.push({ type: "code", code: normalizeImportedCode(lines, language), language });
    index = end;
  }
  return result;
}

function answerText(block: BlogContentBlock) {
  if (block.type === "paragraph") return block.text;
  if (block.type === "list") return block.items.join(" ");
  if (block.type === "code") return block.code;
  if (block.type === "table") return [...block.headers, ...block.rows.flat()].join(" ");
  return "";
}

function buildResult(rawNodes: ParsedNode[], source: BlogImportResult["source"], warnings: BlogImportWarning[]): BlogImportResult {
  const frontMatter = extractSeoFrontMatter(rawNodes, warnings);
  const nodes = promoteLabelledCode(promoteDelimitedTables(frontMatter.nodes));
  const firstHeading = nodes.findIndex(node => node.type === "h1");
  let title = firstHeading >= 0 ? (nodes[firstHeading] as Extract<ParsedNode, { type: "h1" }>).text : "";
  if (firstHeading >= 0) nodes.splice(firstHeading, 1);
  if (!title) {
    const firstParagraph = nodes.findIndex(node => node.type === "paragraph");
    if (firstParagraph >= 0) {
      title = (nodes[firstParagraph] as Extract<ParsedNode, { type: "paragraph" }>).text;
      nodes.splice(firstParagraph, 1);
      warnings.push({ code: "title-inferred", severity: "warning", message: "No H1 was found, so the first paragraph was used as the title. Confirm it before publishing." });
    }
  }

  const intro: string[] = [];
  const sections: { heading: string; blocks: BlogContentBlock[] }[] = [];
  let current: { heading: string; blocks: BlogContentBlock[] } | null = null;
  const ensureSection = () => {
    if (!current) {
      current = { heading: "Overview", blocks: [] };
      sections.push(current);
      warnings.push({ code: "section-inferred", severity: "warning", message: "No H2 appeared before part of the body, so an Overview section was created. Confirm the section structure." });
    }
    return current;
  };

  for (const node of nodes) {
    if (node.type === "h1") {
      warnings.push({ code: "extra-h1", severity: "warning", message: `The additional H1 “${node.text}” was converted to a subsection.` });
      ensureSection().blocks.push({ type: "subheading", text: node.text });
    } else if (node.type === "h2") {
      current = { heading: node.text, blocks: [] };
      sections.push(current);
    } else if (node.type === "h3") ensureSection().blocks.push({ type: "subheading", text: node.text });
    else if (!current && node.type === "paragraph") intro.push(node.text);
    else if (!current && (node.type === "list" || node.type === "code")) ensureSection().blocks.push(node);
    else ensureSection().blocks.push(node);
  }

  const faqs: { question: string; answer: string }[] = [];
  const contentSections = sections.filter(section => {
    if (!isFaqHeading(section.heading)) return true;
    let question = "";
    let answers: string[] = [];
    const flush = () => {
      const answer = cleanText(answers.join(" "));
      if (question && answer) faqs.push({ question, answer });
      else if (question) warnings.push({ code: "faq-answer-missing", severity: "warning", message: `The FAQ “${question}” has no answer.` });
    };
    section.blocks.forEach(block => {
      if (block.type === "subheading") {
        flush();
        question = block.text;
        answers = [];
      } else if (question) {
        if (block.type === "paragraph" && block.links?.length) {
          warnings.push({ code: "faq-links-flattened", severity: "warning", message: `Links in the FAQ answer for “${question}” were kept as visible text because FAQ answers currently use plain text.` });
        }
        answers.push(answerText(block));
      }
      else warnings.push({ code: "faq-question-missing", severity: "warning", message: "FAQ content appeared before the first question and was not imported as an FAQ." });
    });
    flush();
    return false;
  }).filter(section => section.blocks.length > 0);

  if (!intro.length) {
    const firstSection = contentSections[0];
    const paragraph = firstSection?.blocks.find(block => block.type === "paragraph");
    if (paragraph?.type === "paragraph") {
      intro.push(paragraph.text);
      firstSection.blocks.splice(firstSection.blocks.indexOf(paragraph), 1);
      warnings.push({ code: "intro-inferred", severity: "warning", message: "No introduction appeared before the first H2, so the first body paragraph was used as the introduction." });
    }
  }
  const nonemptySections = contentSections.filter(section => section.blocks.length > 0);
  if (!nonemptySections.length) {
    nonemptySections.push({ heading: "Overview", blocks: [{ type: "paragraph", text: intro[0] || "Add the article content here." }] });
    warnings.push({ code: "body-missing", severity: "error", message: "No complete article sections were detected. Review the source headings before publishing." });
  }
  if (!title) warnings.push({ code: "title-missing", severity: "error", message: "No article title was detected." });
  const descriptionSource = intro[0] || nonemptySections.flatMap(section => section.blocks).find(block => block.type === "paragraph")?.text || "";
  const description = truncateSentence(frontMatter.metadata.description || descriptionSource, 220);
  if (description.length < 40) warnings.push({ code: "description-short", severity: "warning", message: "The generated description is shorter than 40 characters and needs editing." });
  const metaTitle = truncateSentence(frontMatter.metadata.metaTitle || title, 70).replace(/…$/, "");
  return { title, slug: frontMatter.metadata.slug || slugify(title), metaTitle, description, intro: intro.filter(Boolean), sections: nonemptySections, faqs, warnings, source };
}

export function parseBlogDocument(input: { html?: string; text: string; mode?: BlogImportMode }): BlogImportResult {
  const text = cleanMultiline(input.text);
  const html = input.html?.trim() ?? "";
  if (!text && !html) throw new Error("Paste an article before formatting it.");
  if (text.length > MAX_SOURCE_LENGTH || html.length > MAX_SOURCE_LENGTH * 3) throw new Error("The pasted article is too large. Keep the source below 200,000 text characters.");
  const warnings: BlogImportWarning[] = [];
  const mode = input.mode ?? "auto";
  const richAvailable = Boolean(html && /<(h1|h2|h3|p|ul|ol|pre|table)\b/i.test(html));
  const labelledPlainAvailable = /(^|\n)(?:H[1-3]|Title|Section|Subheading)\s*:\s*\S/im.test(text);
  const markdownAvailable = /(^|\n)#{1,3}\s+\S|(^|\n)```|(^|\n)([-*+]\s+|\d+[.)]\s+)/m.test(text);
  const source: BlogImportResult["source"] = mode === "rich" ? "rich" : mode === "markdown" ? "markdown" : mode === "plain" ? "plain" : richAvailable ? "rich" : labelledPlainAvailable ? "plain" : markdownAvailable ? "markdown" : "plain";
  if (source === "rich" && !richAvailable) warnings.push({ code: "rich-format-missing", severity: "warning", message: "No rich document structure was available, so the visible text was interpreted instead." });
  const nodes = source === "rich" && richAvailable ? parseRichNodes(html, warnings) : parseTextNodes(text, source === "plain", warnings);
  return buildResult(nodes, source, warnings);
}

export function suggestRelatedToolIds(text: string, options: { id: string; name: string }[]) {
  const haystack = text.toLowerCase();
  return options.filter(option => {
    const phrases = [option.id.replace(/-/g, " "), option.name.toLowerCase()];
    return phrases.some(phrase => phrase.length > 3 && haystack.includes(phrase));
  }).map(option => option.id).slice(0, 12);
}

export function suggestCategoryId(text: string, options: { id: string; name: string }[]) {
  const haystack = text.toLowerCase();
  const scored = options.map(option => {
    const terms = new Set([option.id.toLowerCase(), option.name.toLowerCase(), option.id.toLowerCase().replace(/-/g, " ")]);
    let score = 0;
    terms.forEach(term => {
      if (!term) return;
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      score += (haystack.match(new RegExp(`\\b${escaped}\\b`, "g")) ?? []).length;
    });
    return { id: option.id, score };
  }).sort((left, right) => right.score - left.score);
  return scored[0]?.score ? scored[0].id : undefined;
}
