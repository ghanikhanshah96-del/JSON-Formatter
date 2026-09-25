export const siteConfig = {
  name: "CodeFormatterTools",
  shortName: "CodeFormatterTools",
  displayName: "CodeFormatterTools",
  domain: "codeformattertools.com",
  url: "https://codeformattertools.com",
  description: "Use free online developer tools to format, validate, minify, and convert JSON, XML, YAML, SQL, CSV, and other data formats. Runs in your browser — never uploaded.",
  performance: {
    openTargetMs: 1500,
    maxInputLabel: "5 MB",
    maxInputBytes: 5 * 1024 * 1024,
    processingTimeoutMs: 30_000
  },
  storagePrefix: "codeformattertools",
  legacyStoragePrefixes: ["codeformattools", "formatbase"],
  xmlEnvelopeFormat: "codeformattertools.xml.v1",
  legacyXmlEnvelopeFormats: ["formatbase.xml.v1", "codeformattools.xml.v1"],
} as const;

export function contactEmail(): string {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL || "uzairnazir42@gmail.com";
}
