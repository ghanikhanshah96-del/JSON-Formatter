import type { BlogContentBlock } from "./learn-guides";

type ContentJson = {
  version?: number;
  intro?: string[];
  sections?: { heading: string; blocks: BlogContentBlock[] }[];
};

const descriptiveAlt: Record<string, string> = {
  "how-to-check-if-xml-file-is-valid-online": "XML document being checked for syntax and structural validation errors",
  "json-to-yaml-converter-in-california": "JSON data being converted into a readable YAML configuration",
  "number-format-in-sql": "SQL number-formatting examples for decimal places, grouping, and currency",
  "management-studio-format-sql": "SQL query formatting workflow in SQL Server Management Studio",
  "minify-sql": "Formatted SQL query being converted into compact minified SQL",
  "postgresql-formatter": "PostgreSQL query before and after automatic SQL formatting",
  "what-is-a-yaml-file-used-for": "YAML configuration example used for applications, automation, and Kubernetes",
  "how-to-format-an-sql-query": "Unformatted SQL query being reorganized with readable spacing and indentation",
};

function tableFromLegacyList(block: BlogContentBlock): BlogContentBlock {
  if (block.type !== "list" || block.items.length < 2 || !block.items.every(item => item.includes(" | "))) return block;
  const rows = block.items.map(item => item.split("|").map(cell => cell.trim()));
  const width = rows[0].length;
  if (width < 2 || rows.some(row => row.length !== width)) return block;
  return { type: "table", headers: rows[0], rows: rows.slice(1) };
}

function replaceParagraphRange(
  blocks: BlogContentBlock[],
  firstText: string,
  stopText: string,
  code: string,
  language: Extract<BlogContentBlock, { type: "code" }>["language"],
) {
  const start = blocks.findIndex(block => block.type === "paragraph" && block.text === firstText);
  const stop = blocks.findIndex((block, index) => index > start && block.type === "paragraph" && block.text === stopText);
  if (start < 0 || stop < 0) return blocks;
  return [...blocks.slice(0, start), { type: "code" as const, code, language }, ...blocks.slice(stop)];
}

function repairSection(slug: string, heading: string, source: BlogContentBlock[]) {
  let blocks = source.map(tableFromLegacyList);
  if (slug === "how-to-format-an-sql-query") {
    blocks = blocks.map(block => {
      if (block.type !== "code" || block.language !== "sql") return block;
      const compact = block.code.replace(/\s+/g, " ").trim();
      if (/^select name,email from customers/i.test(compact)) return { ...block, code: "select name,email from customers where status='active' order by name;" };
      if (/^select id,name,email from users/i.test(compact)) return { ...block, code: "select id,name,email from users where status='active' and age>18 order by name asc;" };
      if (/^select\s+id,/i.test(compact) && /age\s*>\s*18/i.test(compact)) return { ...block, code: "SELECT\n    id,\n    name,\n    email\nFROM users\nWHERE status = 'active'\n    AND age > 18\nORDER BY name ASC;" };
      return block;
    });
  }
  if (slug === "how-to-check-if-xml-file-is-valid-online" && heading === "Common XML Validation Errors") {
    blocks = replaceParagraphRange(blocks, "<user>", "The email element has no closing tag.", "<user>\n  <name>John</name>\n  <email>john@example.com\n</user>", "xml");
    const secondStart = blocks.findIndex(block => block.type === "paragraph" && block.text === "<user>");
    const secondStop = blocks.findIndex((block, index) => index > secondStart && block.type === "paragraph" && block.text === "Adding the missing closing tag fixes this syntax error.");
    if (secondStart >= 0 && secondStop >= 0) blocks = [...blocks.slice(0, secondStart), { type: "code", code: "<user>\n  <name>John</name>\n  <email>john@example.com</email>\n</user>", language: "xml" }, ...blocks.slice(secondStop)];
  }
  if (slug === "json-to-yaml-converter-in-california" && heading === "JSON to YAML Conversion Example") {
    blocks = replaceParagraphRange(blocks, "{", "YAML output:", "{\n  \"app\": \"MyWebsite\",\n  \"port\": 8080,\n  \"debug\": false\n}", "json");
    blocks = replaceParagraphRange(blocks, "app: MyWebsite", "Both formats represent the same information, but YAML uses a more compact, indentation-based structure.", "app: MyWebsite\nport: 8080\ndebug: false", "yaml");
  }
  if (slug === "what-is-a-yaml-file-used-for" && heading === "What Does a YAML File Look Like?") {
    const start = blocks.findIndex(block => block.type === "paragraph" && block.text === "app:");
    const stop = blocks.findIndex((block, index) => index > start && block.type === "paragraph" && block.text === "In this example:");
    if (start >= 0 && stop >= 0) blocks = [...blocks.slice(0, start), { type: "code", code: "app:\n  name: MyWebsite\n  port: 8080\n  debug: false\n  features:\n    - login\n    - notifications", language: "yaml" }, ...blocks.slice(stop)];
  }
  if (slug === "number-format-in-sql") {
    blocks = blocks.map((block, index, all) => {
      if (block.type !== "paragraph") return block;
      if (/^(?:SELECT|WITH|INSERT|UPDATE|DELETE)\b.*;$/i.test(block.text)) return { type: "code", code: block.text, language: "sql" };
      const previous = all[index - 1];
      if (previous?.type === "paragraph" && previous.text === "Output:") return { type: "code", code: block.text, language: "text" };
      return block;
    });
  }
  if (slug === "management-studio-format-sql" && heading === "How to Use Management Studio Format SQL") {
    blocks = blocks.map((block, index, all) => {
      const previous = all[index - 1];
      return block.type === "paragraph" && previous?.type === "paragraph" && previous.text === "Press:"
        ? { type: "code", code: block.text, language: "text" }
        : block;
    });
  }
  return blocks;
}

export function remediatePublishedBlog(slug: string, contentJson: ContentJson, imageAlt: string) {
  const content = structuredClone(contentJson);
  content.sections = (content.sections ?? []).map(section => ({ ...section, blocks: repairSection(slug, section.heading, section.blocks) }));
  return { contentJson: content, imageAlt: descriptiveAlt[slug] ?? imageAlt };
}

export function verifyRemediatedBlog(slug: string, contentJson: ContentJson, imageAlt: string) {
  const issues: string[] = [];
  const normalizedAlt = imageAlt.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (normalizedAlt === slug) issues.push("image alt text is still the post slug");
  const blocks = (contentJson.sections ?? []).flatMap(section => section.blocks);
  blocks.forEach(block => {
    if (block.type === "list" && block.items.length >= 2 && block.items.every(item => item.includes(" | "))) issues.push("comparison table is still stored as a list");
    if (block.type === "paragraph" && (/^<\/?[A-Za-z_][\w:.-]*(?:\s|>|\/)/.test(block.text) || /^(?:select|with|insert|update|delete)\b.*;$/i.test(block.text) || /^[{}]$/.test(block.text))) issues.push(`code-like paragraph remains: ${block.text.slice(0, 40)}`);
    if (block.type === "table" && block.rows.some(row => row.length !== block.headers.length)) issues.push("table row width does not match its headers");
  });
  const codeLanguages = blocks.filter((block): block is Extract<BlogContentBlock, { type: "code" }> => block.type === "code").map(block => block.language);
  if (slug === "how-to-check-if-xml-file-is-valid-online" && codeLanguages.filter(language => language === "xml").length < 2) issues.push("XML examples were not converted to code");
  if (slug === "json-to-yaml-converter-in-california" && (!codeLanguages.includes("json") || !codeLanguages.includes("yaml"))) issues.push("JSON/YAML conversion examples are incomplete");
  if (slug === "what-is-a-yaml-file-used-for" && !codeLanguages.includes("yaml")) issues.push("YAML example was not converted to code");
  if (slug === "number-format-in-sql" && codeLanguages.filter(language => language === "sql").length < 4) issues.push("SQL number-format examples are incomplete");
  if (slug === "management-studio-format-sql" && !codeLanguages.includes("text")) issues.push("keyboard shortcut was not converted to code");
  if (slug === "how-to-format-an-sql-query" && blocks.some(block => block.type === "code" && /\n\s*\n/.test(block.code))) issues.push("SQL code still contains blank spacer lines");
  return issues;
}
