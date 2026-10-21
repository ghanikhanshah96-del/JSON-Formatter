import assert from "node:assert/strict";
import test from "node:test";
import { isSafeBlogLink, parseBlogDocument, stripImportedListMarker, suggestCategoryId, suggestRelatedToolIds } from "./blog-import.ts";
import { blogPosts, type BlogContentBlock, type BlogPost } from "./learn-guides.ts";

const markdown = `# How to Format JSON Safely

This complete introduction explains how to format JSON safely in a browser without uploading private input.

## Format JSON in Your Browser

Open the [JSON Formatter](/json-formatter) and paste the document you want to format.

### Follow These Steps

1. Paste valid JSON.
2. Select the indentation.
3. Format and download the result.

\`\`\`json
{
  "safe": true
}
\`\`\`

## Frequently Asked Questions

### Can I format JSON for free?

Yes. The browser-based formatter is free to use without creating an account.

### Does the formatter upload my JSON?

No. Standard tool processing stays inside your browser and is not uploaded.
`;

test("converts a complete Markdown article into the production blog structure", () => {
  const result = parseBlogDocument({ text: markdown, mode: "markdown" });
  assert.equal(result.title, "How to Format JSON Safely");
  assert.equal(result.slug, "how-to-format-json-safely");
  assert.equal(result.intro.length, 1);
  assert.equal(result.sections.length, 1);
  assert.equal(result.sections[0].heading, "Format JSON in Your Browser");
  assert.deepEqual(result.sections[0].blocks.map(block => block.type), ["paragraph", "subheading", "list", "code"]);
  assert.equal(result.sections[0].blocks[2].type === "list" && result.sections[0].blocks[2].ordered, true);
  assert.equal(result.sections[0].blocks[3].type === "code" && result.sections[0].blocks[3].language, "json");
  assert.equal(result.faqs.length, 2);
  assert.equal(result.description.length >= 40, true);
});

test("preserves safe Markdown links as structured links", () => {
  const result = parseBlogDocument({ text: markdown, mode: "markdown" });
  const paragraph = result.sections[0].blocks[0];
  assert.equal(paragraph.type, "paragraph");
  assert.deepEqual(paragraph.type === "paragraph" ? paragraph.links : undefined, [{ text: "JSON Formatter", href: "/json-formatter" }]);
});

test("does not preserve executable or protocol-relative links", () => {
  assert.equal(isSafeBlogLink("javascript:alert(1)"), false);
  assert.equal(isSafeBlogLink("//host.example/path"), false);
  assert.equal(isSafeBlogLink("/json-formatter"), true);
  assert.equal(isSafeBlogLink("https://example.com/guide"), true);
  assert.equal(isSafeBlogLink("mailto:editor@example.com"), true);
  const imported = parseBlogDocument({ text: "# A Complete Safe Link Test\n\nThis introduction is sufficiently long to describe the imported document safely.\n\n## Links\n\nKeep [this text](javascript:alert(1)) without its unsafe destination.", mode: "markdown" });
  assert.equal(imported.warnings.some(warning => warning.code === "unsafe-link-removed"), true);
  const paragraph = imported.sections[0].blocks[0];
  assert.equal(paragraph.type === "paragraph" ? paragraph.links : undefined, undefined);
});

test("normalizes Word link artifacts and duplicate list markers", () => {
  assert.equal(isSafeBlogLink("\u200bhttps://codeformattertools.com/sql-formatter\ufeff"), true);
  assert.equal(isSafeBlogLink("<https://codeformattertools.com/sql-formatter>"), true);
  assert.equal(stripImportedListMarker("\uf0b7 Use consistent capitalization"), "Use consistent capitalization");
  assert.equal(stripImportedListMarker("• Keep spacing readable"), "Keep spacing readable");
});

test("supports labelled plain text and warns when structure must be inferred", () => {
  const result = parseBlogDocument({ text: "Title: A Complete Plain Text Guide\n\nThis opening paragraph is long enough to become a useful description for the imported article.\n\nSection: Main Instructions\n\nUse these instructions to complete the task safely.", mode: "plain" });
  assert.equal(result.title, "A Complete Plain Text Guide");
  assert.equal(result.sections[0].heading, "Main Instructions");
  assert.equal(result.warnings.some(warning => warning.severity === "error"), false);
});

test("creates actionable warnings instead of silently dropping incomplete structure", () => {
  const result = parseBlogDocument({ text: "An inferred title without heading markup\n\nA short body.", mode: "plain" });
  assert.equal(result.warnings.some(warning => warning.code === "title-inferred"), true);
  assert.equal(result.warnings.some(warning => warning.code === "body-missing"), true);
});

test("rejects empty and oversized source documents", () => {
  assert.throws(() => parseBlogDocument({ text: "" }), /Paste an article/);
  assert.throws(() => parseBlogDocument({ text: "x".repeat(200_001) }), /too large/);
});

test("suggests only registered tools explicitly mentioned in the article", () => {
  const options = [{ id: "json-formatter", name: "JSON Formatter" }, { id: "xml-validator", name: "XML Validator" }];
  assert.deepEqual(suggestRelatedToolIds("Use our JSON Formatter for this task.", options), ["json-formatter"]);
});

test("imports SEO front matter and labelled SQL examples from a structured article", () => {
  const source = `## SEO details

SEO Meta Title: How to Format an SQL Query Online: Step-by-Step Guide

Meta Description: Learn how to format an SQL query online for free. Follow simple steps to organize SQL code with proper indentation, spacing, and readable clauses.

SEO-Friendly URL Slug: how-to-format-an-sql-query

Primary Keyword: how to format an sql query

# How to Format an SQL Query Online: Easy Step-by-Step Guide

Wondering how to format an SQL query that's difficult to read? You can use an online SQL formatter to organize your code with proper indentation, spacing, and line breaks.

## How to Format an SQL Query Online for Free

### Step 1: Open the SQL Formatter

Visit the [free online SQL Formatter](https://codeformattertools.com/sql-formatter).

### Step 2: Paste Your SQL Query

For example:

select name,email from customers where status='active' order by name;

## SQL Query Formatting Example: Before and After

Before formatting:

select id,name,email from users where status='active' and age>18 order by name asc;

After formatting:

SELECT

id,

name,

email

FROM

users

WHERE

status = 'active'

AND age > 18

ORDER BY

name ASC;

## Frequently Asked Questions

### Can I format an SQL query online for free?

Yes. You can use an online SQL formatter without installing software.`;
  const result = parseBlogDocument({ text: source, mode: "markdown" });
  assert.equal(result.title, "How to Format an SQL Query Online: Easy Step-by-Step Guide");
  assert.equal(result.metaTitle, "How to Format an SQL Query Online: Step-by-Step Guide");
  assert.equal(result.slug, "how-to-format-an-sql-query");
  assert.match(result.description, /^Learn how to format an SQL query online for free/);
  assert.equal(result.sections.some(section => section.heading === "SEO details"), false);
  const codes = result.sections.flatMap(section => section.blocks).filter(block => block.type === "code");
  assert.equal(codes.length, 3);
  assert.equal(codes.every(block => block.type === "code" && block.language === "sql"), true);
  assert.match(codes[2].type === "code" ? codes[2].code : "", /SELECT\nid,\nname,/);
  const linkedParagraph = result.sections.flatMap(section => section.blocks).find(block => block.type === "paragraph" && block.links?.length);
  assert.deepEqual(linkedParagraph?.type === "paragraph" ? linkedParagraph.links : undefined, [{ text: "free online SQL Formatter", href: "/sql-formatter" }]);
  assert.equal(result.faqs.length, 1);
  assert.equal(result.warnings.some(warning => warning.code === "seo-metadata-applied"), true);
});

const importCorpus = [
  {
    name: "view JSON",
    title: "How to View a JSON File on Windows, Mac, and Online",
    metaTitle: "How to View a JSON File on Windows, Mac & Online",
    slugLabel: "Suggested URL slug",
    slug: "how-to-view-a-json-file",
    language: "json",
    example: '{"name":"Alex","active":true}',
  },
  {
    name: "download JSON",
    title: "How to Download a JSON File: A Simple Step-by-Step Guide",
    metaTitle: "How to Download a JSON File: Easy Step-by-Step Guide",
    slugLabel: "URL Slug",
    slug: "how-to-download-a-json-file",
    language: "json",
    example: '{"downloaded":true}',
  },
  {
    name: "sort JSON",
    title: "How to Sort JSON File Online: A Simple Step-by-Step Guide",
    metaTitle: "How to Sort JSON File Online - Easy Step-by-Step Guide",
    slugLabel: "SEO-Friendly URL Slug",
    slug: "how-to-sort-json-file",
    language: "json",
    example: '{"name":"Alex","age":28}',
  },
  {
    name: "format SQL",
    title: "How to Format an SQL Query Online: Easy Step-by-Step Guide",
    metaTitle: "How to Format an SQL Query Online: Step-by-Step Guide",
    slugLabel: "SEO-Friendly URL Slug",
    slug: "how-to-format-an-sql-query",
    language: "sql",
    example: "select name,email from customers where status='active';",
  },
] as const;

function corpusSource(item: typeof importCorpus[number], format: "markdown" | "plain") {
  const heading = (level: number, text: string) => format === "markdown" ? `${"#".repeat(level)} ${text}` : `H${level}: ${text}`;
  return `${heading(2, "SEO details")}

SEO Meta Title: ${item.metaTitle}

Meta Description: This complete guide explains ${item.name} clearly with practical browser-based steps and readable examples.

${item.slugLabel}: ${item.slug}

${heading(1, item.title)}

This introduction explains ${item.name} in enough detail to provide a useful and accurate article summary for readers.

${heading(2, `Complete ${item.name} instructions`)}

Follow these practical steps:

- Open the appropriate formatter or viewer.
- Paste or upload the source data.
- Review the generated result.

For example:

${item.example}

${heading(2, "Frequently Asked Questions")}

${heading(3, `Can I ${item.name} online?`)}

Yes. The browser-based tool handles this workflow without requiring a local installation.`;
}

test("formats all four supplied blog topics across Markdown, labelled plain text, and automatic detection", () => {
  for (const item of importCorpus) {
    for (const mode of ["markdown", "plain"] as const) {
      const result = parseBlogDocument({ text: corpusSource(item, mode), mode });
      assert.equal(result.title, item.title, `${item.name} ${mode} title`);
      assert.equal(result.metaTitle, item.metaTitle, `${item.name} ${mode} meta title`);
      assert.equal(result.slug, item.slug, `${item.name} ${mode} slug`);
      assert.equal(result.faqs.length, 1, `${item.name} ${mode} FAQ`);
      assert.equal(result.sections.flatMap(section => section.blocks).some(block => block.type === "list"), true, `${item.name} ${mode} list`);
      const code = result.sections.flatMap(section => section.blocks).find(block => block.type === "code");
      assert.equal(code?.type === "code" ? code.language : undefined, item.language, `${item.name} ${mode} code language`);
      assert.equal(result.warnings.some(warning => warning.severity === "error"), false, `${item.name} ${mode} errors`);
    }
    const automatic = parseBlogDocument({ text: corpusSource(item, "markdown"), mode: "auto" });
    assert.equal(automatic.source, "markdown", `${item.name} automatic source detection`);
    assert.equal(automatic.slug, item.slug, `${item.name} automatic slug`);
  }
});

test("infers JSON and SQL categories from article content", () => {
  const options = [{ id: "json", name: "JSON" }, { id: "sql", name: "SQL" }, { id: "xml", name: "XML" }];
  assert.equal(suggestCategoryId(corpusSource(importCorpus[0], "markdown"), options), "json");
  assert.equal(suggestCategoryId(corpusSource(importCorpus[3], "markdown"), options), "sql");
});

test("promotes multi-line and invalid JSON examples without swallowing following prose", () => {
  const source = `# JSON Example Import Guide

This introduction is long enough to describe how JSON examples are imported into code blocks safely.

## Examples

After formatting, the same information becomes:

{
"name": "Alex",
"active": true
}

The values remain unchanged.

For example, this is invalid JSON:

{
"name": "Alex"
"age": 28
}

Correct the missing comma before using the data.`;
  const result = parseBlogDocument({ text: source, mode: "markdown" });
  const blocks = result.sections[0].blocks;
  const codes = blocks.filter(block => block.type === "code");
  assert.equal(codes.length, 2);
  assert.equal(codes.every(block => block.type === "code" && block.language === "json"), true);
  assert.match(codes[0].type === "code" ? codes[0].code : "", /\n  "name"/);
  assert.equal(blocks.some(block => block.type === "paragraph" && block.text === "The values remain unchanged."), true);
  assert.equal(blocks.some(block => block.type === "paragraph" && block.text === "Correct the missing comma before using the data."), true);
});

function serializeParagraph(block: Extract<BlogContentBlock, { type: "paragraph" }>, markdownLinks: boolean) {
  if (!markdownLinks || !block.links?.length) return block.text;
  let text = block.text;
  let cursor = 0;
  for (const link of block.links) {
    const start = text.indexOf(link.text, cursor);
    if (start < 0) continue;
    const replacement = `[${link.text}](${link.href})`;
    text = `${text.slice(0, start)}${replacement}${text.slice(start + link.text.length)}`;
    cursor = start + replacement.length;
  }
  return text;
}

function serializeCompletePost(post: BlogPost, format: "markdown" | "plain") {
  const heading = (level: number, text: string) => format === "markdown" ? `${"#".repeat(level)} ${text}` : `H${level}: ${text}`;
  const output = [
    heading(2, "SEO details"),
    `SEO Meta Title: ${post.metaTitle ?? post.title}`,
    `Meta Description: ${post.description}`,
    `URL Slug: ${post.slug}`,
    heading(1, post.title),
    ...post.intro,
  ];
  for (const section of post.sections) {
    output.push(heading(2, section.heading));
    for (const block of section.blocks) {
      if (block.type === "paragraph") output.push(serializeParagraph(block, format === "markdown"));
      else if (block.type === "subheading") output.push(heading(3, block.text));
      else if (block.type === "code") output.push(`\`\`\`${block.language}\n${block.code}\n\`\`\``);
      else block.items.forEach((item, index) => output.push(block.ordered ? `${index + 1}. ${item}` : `- ${item}`));
    }
  }
  return output.join("\n\n");
}

test("round-trips the complete view, download, and sort articles in multiple source formats", () => {
  const suppliedSlugs = new Set(["how-to-view-a-json-file", "how-to-download-a-json-file", "how-to-sort-json-file"]);
  for (const post of blogPosts.filter(item => suppliedSlugs.has(item.slug))) {
    const expectedFaqs = post.sections.find(section => section.heading === "Frequently Asked Questions")?.blocks.filter(block => block.type === "subheading").length ?? 0;
    const expectedCodes = post.sections.flatMap(section => section.blocks).filter(block => block.type === "code").length;
    const expectedLists = post.sections.flatMap(section => section.blocks).filter(block => block.type === "list").length;
    for (const format of ["markdown", "plain"] as const) {
      const result = parseBlogDocument({ text: serializeCompletePost(post, format), mode: format });
      assert.equal(result.title, post.title, `${post.slug} ${format} title`);
      assert.equal(result.slug, post.slug, `${post.slug} ${format} slug`);
      assert.equal(result.faqs.length, expectedFaqs, `${post.slug} ${format} FAQs`);
      assert.equal(result.sections.flatMap(section => section.blocks).filter(block => block.type === "code").length, expectedCodes, `${post.slug} ${format} code blocks`);
      assert.equal(result.sections.flatMap(section => section.blocks).filter(block => block.type === "list").length, expectedLists, `${post.slug} ${format} lists`);
      assert.equal(result.warnings.some(warning => warning.severity === "error"), false, `${post.slug} ${format} errors`);
    }
    const automatic = parseBlogDocument({ text: serializeCompletePost(post, "markdown"), mode: "auto" });
    assert.equal(automatic.source, "markdown", `${post.slug} auto detection`);
    assert.equal(automatic.title, post.title, `${post.slug} auto title`);
  }
});
