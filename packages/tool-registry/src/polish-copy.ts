/** Post-process SEO copy for accuracy, privacy consistency, and grammar. */

const LOSSLESS_REPLACEMENTS: Array<[RegExp, string]> = [
  [
    /\bThe original information remains unchanged\. Only the data format is converted\./gi,
    "Standard mapping produces a developer-friendly representation. Use Lossless mode when exact round-trip preservation is required."
  ],
  [
    /\bThe original information remains the same\. Only the format representation changes\./gi,
    "Standard mapping produces a developer-friendly representation. Use Lossless mode when exact round-trip preservation is required."
  ],
  [
    /\bThe original information remains unchanged\./gi,
    "Standard mode produces a developer-friendly representation. Use Lossless mode when exact round-trip preservation is required."
  ],
  [
    /\bThe original information remains the same\./gi,
    "Nested objects, missing fields, nulls, and typed values can change shape in CSV. Prefer Lossless mode when cell text must stay exact."
  ],
  [
    /\bThe original XML information remains unchanged\./gi,
    "Formatting changes whitespace and indentation only. Mixed content and xml:space=preserve documents are left unchanged to protect meaningful spacing."
  ],
  [
    /\bYour original XML file remains unchanged\./gi,
    "The formatter rewrites presentation, not element names or text values. Mixed-content documents stay untouched."
  ],
  [
    /\bYour original YAML content remains unchanged\./gi,
    "Formatting rewrites layout only. Documents that contain # comments are blocked so comments are never silently stripped."
  ],
  [
    /\bThe data remains unchanged\. Only the structure is converted from rows and columns into JSON objects\./gi,
    "Lossless mode keeps every CSV cell as a string. Best-effort mode may infer numbers and booleans with warnings."
  ],
  [
    /\bA JSON to CSV Converter keeps the original information while changing the format\./gi,
    "JSON to CSV can be lossy for nested objects, arrays, nulls, and uneven keys. Choose Lossless or Best effort mode intentionally."
  ],
  [
    /\bA CSV to JSON Converter keeps the original information while changing the structure\./gi,
    "Lossless mode retains cell text as strings. Best-effort mode infers types and may change how values are represented."
  ],
  [
    /\bAn XML to JSON Converter keeps your original information while changing the format\./gi,
    "Best-effort mapping simplifies attributes and mixed content. Use Lossless mode for a reversible envelope that preserves comments, CDATA, order, and attributes."
  ],
  [
    /\bA JSON to XML Converter does not change your actual information\./gi,
    "JSON→XML mappings can reshape structure. Prefer Lossless mode when round-trip fidelity matters."
  ],
  [
    /\bThe converter keeps your original information while changing the format\./gi,
    "Choose Lossless when round-trip fidelity matters; Best effort when a readable mapping is enough."
  ],
  [
    /\bKeep your original information while changing the format\./gi,
    "Choose Lossless when round-trip fidelity matters; Best effort when a readable mapping is enough."
  ],
  [
    /\bKeep your original values while changing the data format\./gi,
    "Modes control fidelity: Lossless keeps cell/text fidelity; Best effort may reshape types or nested values."
  ],
  [
    /\bThe converter only changes the format and keeps the original information\./gi,
    "Conversions can be lossy depending on mode. Use Lossless when exact preservation is required."
  ],
  [
    /\bThe converter keeps the original information while changing the format\./gi,
    "Conversions can be lossy depending on mode. Use Lossless when exact preservation is required."
  ],
  [
    /\bThe tool only changes the data format\./gi,
    "Mode selection matters: Lossless rejects or envelopes ambiguous mappings; Best effort converts with warnings."
  ],
  [
    /\bThe converter keeps the same values and structure while changing the format\./gi,
    "Structure and scalar representation can change by mode. Prefer Lossless for round-trips."
  ],
  [
    /\bJSON to XML conversion changes JSON data into XML format while keeping the same information\./gi,
    "JSON to XML conversion maps objects to elements. Use Lossless mode when exact round-trip preservation is required."
  ],
  [
    /\bThe information remains the same, but the structure follows XML formatting rules\./gi,
    "This example shows a simplified mapping. Use Lossless mode when attributes, comments, CDATA, or order must round-trip."
  ],
  [
    /\bThe information stays the same, but the structure follows JSON formatting rules\./gi,
    "This example shows a simplified mapping. Use Lossless mode when attributes, comments, CDATA, or order must round-trip."
  ],
  [
    /\bThe data remains the same, but it is displayed in a table format\./gi,
    "Flat object arrays map cleanly to CSV. Nested values may become JSON text cells or require a different mode."
  ],
  [
    /\bOnly the representation changes\./gi,
    "Mode still matters: Best effort favors readability; Lossless favors round-trip fidelity."
  ],
  [/\bA XML formatter\b/g, "An XML formatter"],
  [/\bA XML Formatter\b/g, "An XML Formatter"],
];

const PRIVACY_REPLACEMENTS: Array<[RegExp, string]> = [
  [
    /However,\s*avoid entering private or confidential information into online tools\.?/gi,
    "Processed locally. Your input stays in your browser and is never sent to CodeFormatterTools for processing. As a general security practice, avoid exposing production credentials unnecessarily."
  ],
  [
    /avoid entering (?:private or )?confidential information into online tools(?: unless you understand how your data is handled)?\.?/gi,
    "Processed locally. Your input stays in your browser and is never sent to CodeFormatterTools for processing. As a general security practice, avoid exposing production credentials unnecessarily."
  ],
  [
    /For privacy reasons, avoid entering confidential or sensitive information into online tools unless you understand how the service handles your data\./gi,
    "Processed locally. Your input stays in your browser and is never sent to CodeFormatterTools for processing."
  ],
  [
    /For better privacy, avoid entering confidential information into any online tool unless you understand how the tool processes your data\./gi,
    "Processed locally. Your input stays in your browser and is never sent to CodeFormatterTools for processing."
  ],
];

const CONVERSION_CHANGE_HEADING = /Does .+ Conversion Change Data\?/i;
const LOSSY_HINT = /lossy|Lossless|Best effort|round-trip|reshape|nested|nulls|attributes|CDATA|mixed content/i;

export function polishCopyText(input: string): string {
  let out = input;
  for (const [pattern, replacement] of [...LOSSLESS_REPLACEMENTS, ...PRIVACY_REPLACEMENTS]) {
    out = out.replace(pattern, replacement);
  }
  // Drop contradictory "No." prefixes once the body already admits loss/modes.
  if (/^No\.\s+/i.test(out) && LOSSY_HINT.test(out)) {
    out = out.replace(/^No\.\s+/i, "");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

export function polishFaq(faq: { question: string; answer: string }[]): { question: string; answer: string }[] {
  return faq.map(item => ({
    question: polishCopyText(item.question),
    answer: polishCopyText(item.answer)
  }));
}

export function polishParagraphs(paragraphs: string[]): string[] {
  return paragraphs.map(polishCopyText).filter(Boolean);
}

/** Rewrite contradictory “Does conversion change data?” sections for converters. */
export function polishSections(
  sections: Array<{
    heading: string;
    kind: "prose" | "steps" | "items";
    paragraphs: string[];
    steps?: string[];
    items?: { title: string; description: string }[];
  }>
) {
  return sections.map(section => {
    if (CONVERSION_CHANGE_HEADING.test(section.heading) && section.kind === "prose") {
      return {
        ...section,
        paragraphs: [
          "It depends on the mode and the shape of your input.",
          "Best effort produces a developer-friendly representation and may simplify nested values, attributes, mixed content, nulls, or uneven keys.",
          "Use Lossless mode when exact round-trip preservation is required — otherwise expect a readable mapping rather than a byte-for-byte guarantee.",
          "Review warnings in the workspace before copying or downloading the result."
        ]
      };
    }
    return {
      ...section,
      paragraphs: polishParagraphs(section.paragraphs).filter(paragraph => paragraph !== "No."),
      steps: section.steps?.map(polishCopyText),
      items: section.items?.map(item => ({
        title: polishCopyText(item.title),
        description: polishCopyText(item.description)
      }))
    };
  });
}
