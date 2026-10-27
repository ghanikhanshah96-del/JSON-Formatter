import assert from "node:assert/strict";
import test from "node:test";
import { remediatePublishedBlog, verifyRemediatedBlog } from "./blog-format-remediation.ts";
import type { BlogContentBlock } from "./learn-guides.ts";

function content(heading: string, blocks: BlogContentBlock[]) {
  return { version: 1, intro: ["A complete introduction."], sections: [{ heading, blocks }] };
}

test("repairs the published YAML example, comparison table, and filename alt text", () => {
  const repaired = remediatePublishedBlog("what-is-a-yaml-file-used-for", content("What Does a YAML File Look Like?", [
    { type: "paragraph", text: "Here is a simple YAML configuration example:" },
    { type: "paragraph", text: "app:" },
    { type: "paragraph", text: "name: MyWebsite" },
    { type: "paragraph", text: "features:" },
    { type: "list", items: ["login", "notifications"] },
    { type: "paragraph", text: "In this example:" },
  ]), "what-is-a-yaml-file-used-for");
  const blocks = repaired.contentJson.sections?.[0].blocks ?? [];
  const yaml = blocks.find(block => block.type === "code");
  assert.equal(yaml?.type === "code" ? yaml.language : "", "yaml");
  assert.match(yaml?.type === "code" ? yaml.code : "", /features:\n    - login/);
  assert.notEqual(repaired.imageAlt, "what-is-a-yaml-file-used-for");
  assert.deepEqual(verifyRemediatedBlog("what-is-a-yaml-file-used-for", repaired.contentJson, repaired.imageAlt), []);
});

test("converts legacy pipe-delimited lists into semantic tables", () => {
  const repaired = remediatePublishedBlog("minify-sql", content("SQL Minifier vs. SQL Formatter", [
    { type: "list", items: ["SQL Minifier | SQL Formatter", "Compact output | Readable output", "Storage | Reviews"] }
  ]), "minify-sql");
  const table = repaired.contentJson.sections?.[0].blocks[0];
  assert.deepEqual(table?.type === "table" ? table.headers : [], ["SQL Minifier", "SQL Formatter"]);
  assert.deepEqual(table?.type === "table" ? table.rows : [], [["Compact output", "Readable output"], ["Storage", "Reviews"]]);
});

test("repairs XML paragraphs and number-format SQL examples as code blocks", () => {
  const xml = remediatePublishedBlog("how-to-check-if-xml-file-is-valid-online", content("Common XML Validation Errors", [
    { type: "paragraph", text: "Invalid XML:" },
    { type: "paragraph", text: "<user>" },
    { type: "paragraph", text: "<email>alex@example.com" },
    { type: "paragraph", text: "</user>" },
    { type: "paragraph", text: "The email element has no closing tag." },
    { type: "paragraph", text: "Correct XML:" },
    { type: "paragraph", text: "<user>" },
    { type: "paragraph", text: "<email>alex@example.com</email>" },
    { type: "paragraph", text: "</user>" },
    { type: "paragraph", text: "Adding the missing closing tag fixes this syntax error." },
  ]), "how-to-check-if-xml-file-is-valid-online");
  assert.equal(xml.contentJson.sections?.[0].blocks.filter(block => block.type === "code" && block.language === "xml").length, 2);

  const sql = remediatePublishedBlog("number-format-in-sql", content("How to Use Number Format in SQL Server", [
    { type: "paragraph", text: "SELECT FORMAT(1234.5, 'N2') AS Value;" },
    { type: "paragraph", text: "Output:" },
    { type: "paragraph", text: "1,234.50" },
  ]), "number-format-in-sql");
  assert.deepEqual(sql.contentJson.sections?.[0].blocks.map(block => block.type), ["code", "paragraph", "code"]);
});
