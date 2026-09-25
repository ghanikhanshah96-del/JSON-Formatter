"""Fix SEO content: encoding, empty Features, privacy hedges."""
from __future__ import annotations

import json
import re
from pathlib import Path

SRC = Path(r"C:\Project\New folder\JSON-Formatter\scripts\seo-content.json")
data = json.loads(SRC.read_text(encoding="utf-8"))


def fix_text(value: str) -> str:
    return (
        value.replace("Ain\ufffd Markup", "Ain't Markup")
        .replace("Ain\uFFFD Markup", "Ain't Markup")
        .replace("Ain�t Markup", "Ain't Markup")
        .replace("YAML Ain�t Markup Language", "YAML Ain't Markup Language")
        .replace("Ain�t", "Ain't")
    )


FEATURE_FALLBACKS = {
    "json-to-yaml": [
        ("Instant JSON Conversion", "Convert JSON data into YAML format within seconds."),
        ("Maintain Data Structure", "The converter keeps your original information while changing the format."),
        ("Clean YAML Output", "Generate readable YAML documents with proper structure."),
        ("Developer-Friendly Tool", "Useful for programmers, DevOps engineers, and technical users."),
        ("No Installation Required", "Use the converter directly from your browser."),
        ("Free Online Converter", "Convert JSON files without registration or paid subscriptions."),
        ("Works on Any Device", "Access the tool from desktop, tablet, or mobile devices."),
    ],
    "yaml-to-json": [
        ("Instant YAML Conversion", "Convert YAML documents into JSON format within seconds."),
        ("Maintain Data Structure", "Keep your original information while changing the format."),
        ("Clean JSON Output", "Generate structured JSON that is easy to use in applications."),
        ("Developer-Friendly Tool", "Useful for programmers, DevOps engineers, and technical users."),
        ("No Installation Required", "Use the converter directly from your browser."),
        ("Free Online Converter", "Convert YAML files without registration or paid subscriptions."),
        ("Works on Any Device", "Access the tool from desktop, tablet, or mobile devices."),
    ],
    "json-to-csv": [
        ("Instant JSON Conversion", "Convert JSON data into CSV format within seconds."),
        ("Structured Data Export", "Transform JSON objects into organized spreadsheet-ready tables."),
        ("Maintain Data Accuracy", "Keep your original values while changing the data format."),
        ("Clean CSV Output", "Generate properly structured CSV data for easy use."),
        ("Developer-Friendly Tool", "Useful for programmers, analysts, and technical users."),
        ("No Installation Required", "Use the converter directly from your browser."),
        ("Free Online Converter", "Convert JSON files without registration or paid subscriptions."),
        ("Works on Multiple Devices", "Access the tool from desktop, tablet, or mobile devices."),
    ],
    "csv-to-json": [
        ("Instant CSV Conversion", "Convert CSV data into JSON format within seconds."),
        ("Structured JSON Output", "Transform spreadsheet rows into clean JSON objects."),
        ("Maintain Data Accuracy", "Keep your original values while changing the data format."),
        ("Developer-Friendly Tool", "Useful for programmers, analysts, and technical users."),
        ("No Installation Required", "Use the converter directly from your browser."),
        ("Free Online Converter", "Convert CSV files without registration or paid subscriptions."),
        ("Works on Multiple Devices", "Access the tool from desktop, tablet, or mobile devices."),
    ],
    "json-to-xml": [
        ("Instant JSON Conversion", "Convert JSON data into XML format within seconds."),
        ("Maintain Data Structure", "Keep your original information while changing the format."),
        ("Clean XML Output", "Generate structured XML documents with readable tags."),
        ("Developer-Friendly Tool", "Useful for programmers and technical users."),
        ("No Installation Required", "Use the converter directly from your browser."),
        ("Free Online Converter", "Convert JSON files without registration or paid subscriptions."),
        ("Works on Any Device", "Access the tool from desktop, tablet, or mobile devices."),
    ],
    "xml-to-json": [
        ("Instant XML Conversion", "Convert XML documents into JSON format within seconds."),
        ("Maintain Data Structure", "Keep your original information while changing the format."),
        ("Clean JSON Output", "Generate structured JSON for applications and APIs."),
        ("Developer-Friendly Tool", "Useful for programmers and technical users."),
        ("No Installation Required", "Use the converter directly from your browser."),
        ("Free Online Converter", "Convert XML files without registration or paid subscriptions."),
        ("Works on Any Device", "Access the tool from desktop, tablet, or mobile devices."),
    ],
}

PRIVACY_PATTERNS = [
    (
        re.compile(
            r"For better privacy, avoid entering confidential information into any online tool unless you understand how the tool processes your data\.\s*Always review sensitive information before using online utilities\.",
            re.I,
        ),
        "Formatting runs locally in your browser and is not uploaded to our servers. Still avoid pasting secrets you would not keep in a local editor.",
    ),
    (
        re.compile(
            r"For privacy reasons, avoid entering confidential or sensitive information into online tools unless you understand how the service handles your data\.\s*Always review the information you are processing before using external utilities\.",
            re.I,
        ),
        "Validation runs locally in your browser and is not uploaded to our servers. Still avoid pasting secrets you would not keep in a local editor.",
    ),
    (
        re.compile(
            r"For privacy, avoid entering confidential.*?unless you understand how (?:the service|your data) (?:handles your data|is handled)\.",
            re.I | re.S,
        ),
        "This tool runs locally in your browser and does not upload your input. Still avoid pasting secrets you would not keep in a local editor.",
    ),
    (
        re.compile(
            r"However, avoid (?:entering|sharing) confidential.*?unless you understand how (?:your data is handled|the tool processes your data|the service handles your data)\.",
            re.I | re.S,
        ),
        "Processing happens in your browser and is not uploaded. Still avoid pasting secrets you would not keep in a local editor.",
    ),
    (
        re.compile(
            r"Always review (?:the information you are processing|sensitive information) before using (?:external|online) utilities\.",
            re.I,
        ),
        "",
    ),
    (
        re.compile(
            r"avoid entering confidential information into online tools unless you understand how your data is handled\.",
            re.I,
        ),
        "Processing runs in your browser and your input is not uploaded.",
    ),
]


def rewrite_privacy(text: str) -> str:
    out = fix_text(text)
    for pattern, replacement in PRIVACY_PATTERNS:
        out = pattern.sub(replacement, out)
    out = re.sub(r"\s{2,}", " ", out).strip()
    return out


for page in data:
    slug = page["slug"]
    for section in page.get("sections", []):
        heading = section.get("heading", "")
        if (
            section.get("kind") == "items"
            and not section.get("items")
            and slug in FEATURE_FALLBACKS
            and "Features" in heading
        ):
            section["paragraphs"] = []
            section["items"] = [
                {"title": title, "description": description}
                for title, description in FEATURE_FALLBACKS[slug]
            ]
        section["paragraphs"] = [
            rewritten
            for paragraph in section.get("paragraphs", [])
            if (rewritten := rewrite_privacy(paragraph))
        ]
        for item in section.get("items") or []:
            item["title"] = fix_text(item.get("title", ""))
            item["description"] = rewrite_privacy(item.get("description", ""))

    for field in ("about", "description"):
        if page.get(field):
            page[field] = rewrite_privacy(page[field])
    page["intro"] = [rewrite_privacy(item) for item in page.get("intro", []) if rewrite_privacy(item)]
    page["whatIs"] = [rewrite_privacy(item) for item in page.get("whatIs", []) if rewrite_privacy(item)]
    if page.get("cta") and page["cta"].get("paragraphs"):
        page["cta"]["paragraphs"] = [
            rewrite_privacy(item) for item in page["cta"]["paragraphs"] if rewrite_privacy(item)
        ]
    for faq in page.get("faq", []):
        faq["question"] = fix_text(faq["question"])
        faq["answer"] = rewrite_privacy(faq["answer"])
        if "safe" in faq["question"].lower() and "browser" not in faq["answer"].lower():
            faq["answer"] = (
                faq["answer"].rstrip(".")
                + ". Processing runs in your browser and your input is not uploaded to our servers."
            )

SRC.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

empty = 0
bad_encoding = 0
for page in data:
    blob = json.dumps(page, ensure_ascii=False)
    if "\ufffd" in blob or "Ain�t" in blob:
        bad_encoding += 1
        print("encoding issue", page["slug"])
    for section in page.get("sections", []):
        if section.get("kind") == "items" and "Features" in section.get("heading", "") and not section.get("items"):
            empty += 1
            print("empty features", page["slug"], section["heading"])

print(f"empty_features={empty} encoding_pages={bad_encoding}")
