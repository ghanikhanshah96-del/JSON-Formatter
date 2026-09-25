"""Extract full SEO sections into structured JSON for accurate content migration."""
from __future__ import annotations

import json
import re
from pathlib import Path

SRC = Path(r"C:\Users\HP\.cursor\projects\c-Project-New-folder\agent-tools\5590bf3c-2cd1-4cef-8757-25d982117abf.txt")
OUT = Path(r"C:\Project\New folder\JSON-Formatter\scripts\seo-content.json")

lines = SRC.read_text(encoding="utf-8").splitlines()
page_starts = [i - 1 for i, line in enumerate(lines) if line.strip() == "SEO Setup" and i > 0]

SLUG_MAP = {
    "Home page": "home",
    "JSON Formatter": "json-formatter",
    "JSON Validator": "json-validator",
    "JSON Minifier": "json-minifier",
    "JSON Sorter": "json-sorter",
    "SQL Formatter": "sql-formatter",
    "YAML Formatter": "yaml-formatter",
    "YAML Validator": "yaml-validator",
    "XML Formatter": "xml-formatter",
    "XML Validator": "xml-validator",
    "json to yaml": "json-to-yaml",
    "yaml to json": "yaml-to-json",
    "json to csv": "json-to-csv",
    "csv to json": "csv-to-json",
    "json to xml": "json-to-xml",
    "xml to json": "xml-to-json",
}

RELATED_NAME_TO_ID = {
    "JSON Formatter": "json-formatter",
    "JSON Validator": "json-validator",
    "JSON Minifier": "json-minifier",
    "JSON Sorter": "json-sorter",
    "SQL Formatter": "sql-formatter",
    "YAML Formatter": "yaml-formatter",
    "YAML Validator": "yaml-validator",
    "XML Formatter": "xml-formatter",
    "XML Validator": "xml-validator",
    "JSON to YAML Converter": "json-to-yaml",
    "YAML to JSON Converter": "yaml-to-json",
    "JSON to CSV Converter": "json-to-csv",
    "CSV to JSON Converter": "csv-to-json",
    "JSON to XML Converter": "json-to-xml",
    "XML to JSON Converter": "xml-to-json",
}

CTA_PREFIXES = (
    "Explore Free",
    "Format Your ",
    "Validate Your ",
    "Minify Your ",
    "Sort Your ",
    "Organize Your ",
    "Convert JSON",
    "Convert YAML",
    "Convert CSV",
    "Convert XML",
    "Convert Your ",
)


def value_after(block: list[str], label: str) -> str | None:
    for i, line in enumerate(block):
        if line.strip() == label:
            j = i + 1
            while j < len(block) and (block[j].startswith("(Character") or not block[j].strip()):
                j += 1
            return block[j] if j < len(block) else None
    return None


def is_section_heading(line: str) -> bool:
    if not line or line.startswith("(Character") or re.match(r"^\d+\.\s", line):
        return False
    if len(line) > 110:
        return False
    if line == "Frequently Asked Questions":
        return True
    if line.startswith("Related Developer Tools") or line == "Related Tools":
        return True
    if any(line.startswith(p) for p in CTA_PREFIXES):
        return True
    # FAQ-style questions must never become section headings.
    faq_prefixes = (
        "What is ",  # lowercase 'is' used in FAQ answers section
        "How do I ",
        "Can I ",
        "Can beginners ",
        "Are ",
        "Do I ",
        "Which ",
        "Is this ",
        "Is minified ",
        "Is YAML better",
        "Is XML better",
        "Is JSON better",
        "Does formatting ",
        "Does conversion ",
        "Does converting ",
        "Does sorting ",
        "Does SQL formatting ",
        "Does YAML formatting ",
        "Does XML formatting ",
        "Does XML validation ",
        "Does JSON minification ",
        "Will ",
        "Why does ",
        "What happens ",
        "What databases ",
        "What errors ",
        "What JSON ",
        "What is the difference",
    )
    if any(line.startswith(p) for p in faq_prefixes):
        return False
    patterns = [
        r"^What Is .+",
        r"^How to .+",
        r"^Features of .+",
        r"^Why Use .+",
        r"^Who Can Use .+",
        r"^Common Uses of .+",
        r"^Common .+ Errors .+",
        r"^.+ Example$",
        r"^.+ Conversion Example$",
        r"^.+ vs .+$",
        r"^Does .+ Change Data\?$",
        r"^Does .+ Change the Query\?$",
        r"^Does .+ Conversion Change Data\?$",
        r"^Is .+ Safe(\?| To Use\?)$",
        r"^Is .+ Conversion Safe\?$",
        r"^Is .+ Validation Safe\?$",
        r"^Is .+ Formatting Safe\?$",
        r"^Is .+ Minification Safe\?$",
        r"^Is .+ Sorting Safe\?$",
        r"^All-in-One .+",
        r"^JSON vs YAML:.+",
        r"^YAML vs JSON:.+",
        r"^JSON vs CSV:.+",
        r"^CSV vs JSON:.+",
        r"^JSON vs XML:.+",
        r"^XML vs JSON:.+",
    ]
    return any(re.match(p, line) for p in patterns)


def parse_faq(section_lines: list[str]) -> list[dict[str, str]]:
    faqs: list[dict[str, str]] = []
    i = 0
    while i < len(section_lines):
        line = section_lines[i]
        if line.endswith("?"):
            q = line
            i += 1
            ans: list[str] = []
            while i < len(section_lines) and not section_lines[i].endswith("?"):
                if section_lines[i]:
                    ans.append(section_lines[i])
                i += 1
            faqs.append({"question": q, "answer": " ".join(ans)})
            continue
        i += 1
    return faqs


def parse_item_pairs(section_lines: list[str]) -> tuple[list[str], list[dict[str, str]]]:
    if not section_lines:
        return [], []
    pair_start = None
    for i, line in enumerate(section_lines):
        if (
            i + 1 < len(section_lines)
            and 2 <= len(line) <= 70
            and not line.endswith(".")
            and not line.endswith(":")
            and not line.startswith("{")
            and not line.startswith("<")
            and not line.startswith("[")
            and not line.startswith('"')
            and section_lines[i + 1]
            and (section_lines[i + 1].endswith(".") or len(section_lines[i + 1]) > 35)
        ):
            pair_start = i
            break
    if pair_start is None:
        return section_lines, []
    intros = section_lines[:pair_start]
    items: list[dict[str, str]] = []
    i = pair_start
    while i < len(section_lines):
        title = section_lines[i]
        if (
            title.endswith(".")
            or title.endswith(":")
            or title.startswith("{")
            or title.startswith("<")
            or title.startswith("[")
            or title.startswith('"')
        ):
            intros.append(title)
            i += 1
            continue
        i += 1
        desc_parts: list[str] = []
        while i < len(section_lines):
            nxt = section_lines[i]
            if (
                2 <= len(nxt) <= 70
                and not nxt.endswith(".")
                and not nxt.endswith(":")
                and not nxt.startswith("{")
                and not nxt.startswith("<")
                and not nxt.startswith("[")
                and not nxt.startswith('"')
                and i + 1 < len(section_lines)
                and section_lines[i + 1]
                and (section_lines[i + 1].endswith(".") or len(section_lines[i + 1]) > 35)
            ):
                break
            desc_parts.append(nxt)
            i += 1
        items.append({"title": title, "description": " ".join(desc_parts)})
    return intros, items


def parse_how(section_lines: list[str]) -> tuple[list[str], list[str]]:
    intro: list[str] = []
    steps: list[str] = []
    i = 0
    while i < len(section_lines) and not re.match(r"^\d+\.\s", section_lines[i]):
        # Keep example blocks inside the intro until first numbered step
        intro.append(section_lines[i])
        i += 1
    while i < len(section_lines):
        m = re.match(r"^(\d+)\.\s*(.+)$", section_lines[i])
        if not m:
            # leftover lines after steps (rare) — attach to last step if any
            if steps and section_lines[i]:
                steps[-1] = steps[-1] + " " + section_lines[i]
            i += 1
            continue
        title = m.group(2)
        i += 1
        detail: list[str] = []
        while i < len(section_lines) and not re.match(r"^\d+\.\s", section_lines[i]):
            detail.append(section_lines[i])
            i += 1
        # Prefer short step text: title + first descriptive sentences (skip large code dumps in howItWorks)
        prose = [d for d in detail if not d.startswith("{") and not d.startswith("[") and not d.startswith("<") and d not in ("{", "}", "[", "]")]
        # Keep concise: if detail has code, only use non-code lines
        if prose:
            steps.append(f"{title}: {' '.join(prose)}")
        else:
            steps.append(title)
    return intro, steps


pages = []
for idx, start in enumerate(page_starts):
    end = page_starts[idx + 1] if idx + 1 < len(page_starts) else len(lines)
    block = lines[start:end]
    page_key = block[0].strip()
    slug = SLUG_MAP[page_key]
    seo_title = value_after(block, "SEO Title")
    meta = value_after(block, "Meta Description")
    primary = value_after(block, "Primary Keyword:")

    body_start = 0
    for i, line in enumerate(block):
        if line.strip() == "Meta Description":
            j = i + 1
            while j < len(block) and (block[j].startswith("(Character") or block[j].strip() == meta):
                j += 1
            body_start = j
            break

    body = [ln.strip() for ln in block[body_start:] if ln.strip() and not ln.startswith("(Character")]
    h1 = body[0] if body else None

    sections_raw: list[tuple[str, list[str]]] = []
    current_name = h1 or "Intro"
    current_lines: list[str] = []
    for line in body[1:]:
        if is_section_heading(line):
            sections_raw.append((current_name, current_lines))
            current_name = line
            current_lines = []
        else:
            current_lines.append(line)
    sections_raw.append((current_name, current_lines))

    intro_paras = sections_raw[0][1] if sections_raw and sections_raw[0][0] == h1 else []

    structured_sections = []
    faq: list[dict[str, str]] = []
    related_ids: list[str] = []
    how_steps: list[str] = []
    cta = None
    what_is_paras: list[str] = []

    for name, content in sections_raw:
        if name == h1:
            continue
        if name == "Frequently Asked Questions":
            faq = parse_faq(content)
            continue
        if name.startswith("Related Developer Tools") or name == "Related Tools":
            for line in content:
                rid = RELATED_NAME_TO_ID.get(line)
                if rid:
                    related_ids.append(rid)
            continue
        if any(name.startswith(p) for p in CTA_PREFIXES):
            cta = {"heading": name, "paragraphs": content}
            continue
        if name.startswith("How to "):
            how_intro, how_steps = parse_how(content)
            structured_sections.append({
                "heading": name,
                "kind": "steps",
                "paragraphs": how_intro,
                "steps": how_steps,
            })
            continue
        if name.startswith("What Is "):
            what_is_paras = content
            structured_sections.append({
                "heading": name,
                "kind": "prose",
                "paragraphs": content,
            })
            continue
        if (
            name.startswith("Features of")
            or name.startswith("Why Use")
            or name.startswith("Who Can Use")
            or name.startswith("Common Uses")
        ):
            intros, items = parse_item_pairs(content)
            structured_sections.append({
                "heading": name,
                "kind": "items",
                "paragraphs": intros,
                "items": items,
            })
            continue
        structured_sections.append({
            "heading": name,
            "kind": "prose",
            "paragraphs": content,
        })

    # description under H1: first intro paragraph
    description = intro_paras[0] if intro_paras else (seo_title or "")
    # about: first what-is paragraph or joined short about
    about = what_is_paras[0] if what_is_paras else description

    pages.append({
        "pageKey": page_key,
        "slug": slug,
        "seoTitle": seo_title,
        "metaDescription": meta,
        "primaryKeyword": primary,
        "h1": h1,
        "description": description,
        "about": about,
        "intro": intro_paras,
        "whatIs": what_is_paras,
        "howItWorks": how_steps,
        "sections": structured_sections,
        "faq": faq,
        "relatedTools": related_ids,
        "cta": cta,
    })

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(pages, indent=2), encoding="utf-8")
print(f"Wrote {len(pages)} pages")
for p in pages:
    print(
        f"{p['slug']}: sections={len(p['sections'])} faq={len(p['faq'])} "
        f"related={len(p['relatedTools'])} how={len(p['howItWorks'])} cta={bool(p['cta'])}"
    )
    print("  related:", p["relatedTools"])
    print("  section headings:", [s["heading"] for s in p["sections"]])
