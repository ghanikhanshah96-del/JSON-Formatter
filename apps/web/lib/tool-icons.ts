import type { ToolId } from "@codeformattools/tool-core";

/** Meaningful glyph per tool — used on home + category grids. */
export const toolIcons: Record<string, string> = {
  "json-formatter": "{ }",
  "json-validator": "✓",
  "json-minifier": "⟦⟧",
  "json-sorter": "A↓",
  "sql-formatter": "⌘",
  "yaml-formatter": "☰",
  "yaml-validator": "☑",
  "xml-formatter": "</>",
  "xml-validator": "◇",
  "json-to-yaml": "↦",
  "yaml-to-json": "↤",
  "json-to-xml": "⇄",
  "xml-to-json": "⇆",
  "json-to-csv": "▦",
  "csv-to-json": "▤",
};

export function iconForTool(id: ToolId | string): string {
  return toolIcons[id] ?? "⌁";
}
