"""Generate TypeScript SEO copy module from parsed seo-content.json."""
from __future__ import annotations

import json
from pathlib import Path

SRC = Path(r"C:\Project\New folder\JSON-Formatter\scripts\seo-content.json")
OUT = Path(r"C:\Project\New folder\JSON-Formatter\packages\tool-registry\src\seo-copy.ts")

pages = json.loads(SRC.read_text(encoding="utf-8"))
home = next(p for p in pages if p["slug"] == "home")
tools = [p for p in pages if p["slug"] != "home"]

DISPLAY_NAMES = {
    "json-formatter": "JSON Formatter",
    "json-validator": "JSON Validator",
    "json-minifier": "JSON Minifier",
    "json-sorter": "JSON Sorter",
    "sql-formatter": "SQL Formatter",
    "yaml-formatter": "YAML Formatter",
    "yaml-validator": "YAML Validator",
    "xml-formatter": "XML Formatter",
    "xml-validator": "XML Validator",
    "json-to-yaml": "JSON to YAML Converter",
    "yaml-to-json": "YAML to JSON Converter",
    "json-to-csv": "JSON to CSV Converter",
    "csv-to-json": "CSV to JSON Converter",
    "json-to-xml": "JSON to XML Converter",
    "xml-to-json": "XML to JSON Converter",
}


def ts_str(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def ts_str_list(values: list[str], indent: int = 4) -> str:
    pad = " " * indent
    if not values:
        return "[]"
    lines = [f"{pad}{ts_str(v)}" for v in values]
    return "[\n" + ",\n".join(lines) + f"\n{' ' * (indent - 2)}]"


def emit_items(items: list[dict], indent: int = 6) -> str:
    if not items:
        return "[]"
    pad = " " * indent
    chunks = []
    for item in items:
        chunks.append(
            f"{pad}{{ title: {ts_str(item['title'])}, description: {ts_str(item['description'])} }}"
        )
    return "[\n" + ",\n".join(chunks) + f"\n{' ' * (indent - 2)}]"


def emit_section(section: dict, indent: int = 4) -> str:
    pad = " " * indent
    kind = section.get("kind", "prose")
    parts = [
        f"{pad}{{",
        f"{pad}  heading: {ts_str(section['heading'])},",
        f"{pad}  kind: {ts_str(kind)},",
    ]
    paras = section.get("paragraphs") or []
    parts.append(f"{pad}  paragraphs: {ts_str_list(paras, indent + 4)},")
    if kind == "steps":
        steps = section.get("steps") or []
        parts.append(f"{pad}  steps: {ts_str_list(steps, indent + 4)},")
    if kind == "items":
        items = section.get("items") or []
        parts.append(f"{pad}  items: {emit_items(items, indent + 4)},")
    parts.append(f"{pad}}}")
    return "\n".join(parts)


def emit_faq(faq: list[dict], indent: int = 4) -> str:
    if not faq:
        return "[]"
    pad = " " * indent
    chunks = []
    for item in faq:
        chunks.append(
            f"{pad}{{ question: {ts_str(item['question'])}, answer: {ts_str(item['answer'])} }}"
        )
    return "[\n" + ",\n".join(chunks) + f"\n{' ' * (indent - 2)}]"


def emit_cta(cta: dict | None, indent: int = 4) -> str:
    if not cta:
        return "undefined"
    pad = " " * indent
    return (
        "{\n"
        f"{pad}  heading: {ts_str(cta['heading'])},\n"
        f"{pad}  paragraphs: {ts_str_list(cta.get('paragraphs') or [], indent + 4)}\n"
        f"{pad}}}"
    )


lines: list[str] = []
lines.append("/* Generated from SEO brief — do not hand-edit; re-run scripts/generate-seo-copy.py */")
lines.append('import type { ToolId } from "@codeformattools/tool-core";')
lines.append("")
lines.append("export type SeoContentSection = {")
lines.append('  heading: string;')
lines.append('  kind: "prose" | "steps" | "items";')
lines.append("  paragraphs: string[];")
lines.append("  steps?: string[];")
lines.append("  items?: { title: string; description: string }[];")
lines.append("};")
lines.append("")
lines.append("export type ToolSeoCopy = {")
lines.append("  name: string;")
lines.append("  headline: string;")
lines.append("  description: string;")
lines.append("  about: string;")
lines.append("  intro: string[];")
lines.append("  howItWorks: string[];")
lines.append("  sections: SeoContentSection[];")
lines.append("  faq: { question: string; answer: string }[];")
lines.append("  relatedTools: ToolId[];")
lines.append("  seo: { title: string; description: string };")
lines.append("  cta?: { heading: string; paragraphs: string[] };")
lines.append("};")
lines.append("")
lines.append("export type HomeSeoCopy = {")
lines.append("  seo: { title: string; description: string };")
lines.append("  headline: string;")
lines.append("  intro: string[];")
lines.append("  sections: SeoContentSection[];")
lines.append("  faq: { question: string; answer: string }[];")
lines.append("  cta: { heading: string; paragraphs: string[] };")
lines.append("};")
lines.append("")

# Home
lines.append("export const homeSeoCopy: HomeSeoCopy = {")
lines.append(f"  seo: {{ title: {ts_str(home['seoTitle'])}, description: {ts_str(home['metaDescription'])} }},")
lines.append(f"  headline: {ts_str(home['h1'])},")
lines.append(f"  intro: {ts_str_list(home['intro'], 4)},")
lines.append("  sections: [")
for section in home["sections"]:
    # Force why/who as items if parser left them as prose with pairs
    if section["heading"].startswith("Why Use") or section["heading"].startswith("Who Can Use"):
        if section.get("kind") != "items" or not section.get("items"):
            # re-pair from paragraphs
            paras = section.get("paragraphs") or []
            items = []
            i = 0
            while i < len(paras):
                title = paras[i]
                desc = paras[i + 1] if i + 1 < len(paras) else ""
                if desc and not title.endswith(".") and len(title) < 60:
                    items.append({"title": title, "description": desc})
                    i += 2
                else:
                    i += 1
            section = {
                "heading": section["heading"],
                "kind": "items",
                "paragraphs": [],
                "items": items,
            }
    lines.append(emit_section(section, 4) + ",")
lines.append("  ],")
lines.append(f"  faq: {emit_faq(home['faq'], 4)},")
lines.append(f"  cta: {emit_cta(home['cta'], 2)},")
lines.append("};")
lines.append("")

lines.append("export const toolSeoCopy: Record<string, ToolSeoCopy> = {")
for page in tools:
    slug = page["slug"]
    name = DISPLAY_NAMES[slug]
    about = page.get("about") or (page["whatIs"][0] if page.get("whatIs") else page["description"])
    description = page.get("description") or (page["intro"][0] if page.get("intro") else "")
    lines.append(f"  {ts_str(slug)}: {{")
    lines.append(f"    name: {ts_str(name)},")
    lines.append(f"    headline: {ts_str(page['h1'])},")
    lines.append(f"    description: {ts_str(description)},")
    lines.append(f"    about: {ts_str(about)},")
    lines.append(f"    intro: {ts_str_list(page.get('intro') or [], 6)},")
    lines.append(f"    howItWorks: {ts_str_list(page.get('howItWorks') or [], 6)},")
    lines.append("    sections: [")
    for section in page.get("sections") or []:
        lines.append(emit_section(section, 6) + ",")
    lines.append("    ],")
    lines.append(f"    faq: {emit_faq(page.get('faq') or [], 6)},")
    related = page.get("relatedTools") or []
    lines.append(f"    relatedTools: {json.dumps(related)},")
    lines.append(
        f"    seo: {{ title: {ts_str(page['seoTitle'])}, description: {ts_str(page['metaDescription'])} }},"
    )
    if page.get("cta"):
        lines.append(f"    cta: {emit_cta(page['cta'], 4)},")
    lines.append("  },")
lines.append("};")
lines.append("")

OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
