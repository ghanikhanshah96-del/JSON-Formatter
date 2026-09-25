export type LearnGuide = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  relatedTools: string[];
  readMinutes: number;
  sections: { heading: string; paragraphs: string[]; bullets?: string[] }[];
};

export const learnGuides: LearnGuide[] = [
  {
    slug: "format-json-online",
    title: "How to format JSON online",
    description: "Turn compressed or messy JSON into readable structure with indentation — without uploading your data.",
    eyebrow: "JSON",
    relatedTools: ["json-formatter", "json-validator"],
    readMinutes: 4,
    sections: [
      {
        heading: "Why format JSON?",
        paragraphs: [
          "Raw JSON from APIs often arrives as a single line. Formatting adds indentation and line breaks so nested objects and arrays are easier to inspect while debugging."
        ]
      },
      {
        heading: "Steps",
        paragraphs: ["Use the CodeFormatterTools JSON Formatter:"],
        bullets: [
          "Paste JSON or open a .json file",
          "Choose 2 spaces, 4 spaces, or tabs",
          "Copy or download the formatted result"
        ]
      },
      {
        heading: "Does formatting change data?",
        paragraphs: [
          "No. A formatter only changes whitespace and layout. Keys, values, and structure stay the same. Processing runs in your browser and is never uploaded."
        ]
      }
    ]
  },
  {
    slug: "format-json-api-response",
    title: "Format a JSON API response",
    description: "Make large API payloads readable while debugging frontend and backend integrations.",
    eyebrow: "LONG-TAIL · JSON",
    relatedTools: ["json-formatter", "json-validator", "json-minifier"],
    readMinutes: 5,
    sections: [
      {
        heading: "The common workflow",
        paragraphs: [
          "When an endpoint returns a dense payload, paste it into the JSON Formatter to inspect nested fields, then validate if something looks wrong, and minify again before shipping a fixture."
        ],
        bullets: [
          "Format the response to explore structure",
          "Validate to catch trailing commas or quote issues",
          "Minify when you need a compact fixture or cache value"
        ]
      },
      {
        heading: "Privacy while debugging real APIs",
        paragraphs: [
          "CodeFormatterTools processes JSON in a browser worker. Your response body is not uploaded. Still avoid pasting production secrets you would not keep in a local editor."
        ]
      }
    ]
  },
  {
    slug: "validate-json-before-ship",
    title: "Validate JSON before you ship",
    description: "Catch syntax errors in configs and API payloads before they break production.",
    eyebrow: "JSON",
    relatedTools: ["json-validator", "json-formatter"],
    readMinutes: 4,
    sections: [
      {
        heading: "What validation catches",
        paragraphs: ["Strict JSON rejects trailing commas, single quotes, and unescaped control characters. Validate early so formatters and converters are not blocked by syntax noise."]
      },
      {
        heading: "Suggested flow",
        paragraphs: ["Validate first, fix errors, then format for readability. That order saves time on large files."]
      }
    ]
  },
  {
    slug: "minify-json-payloads",
    title: "Minify JSON for smaller payloads",
    description: "Remove unnecessary whitespace from JSON when size and transfer speed matter.",
    eyebrow: "JSON",
    relatedTools: ["json-minifier", "json-formatter"],
    readMinutes: 3,
    sections: [
      {
        heading: "When to minify",
        paragraphs: [
          "Minification helps fixtures, localStorage values, and compact request bodies. It does not change values — only whitespace between tokens."
        ]
      },
      {
        heading: "Tip",
        paragraphs: ["Format while developing, minify before you embed JSON in constrained environments."]
      }
    ]
  },
  {
    slug: "sort-json-keys-for-diffs",
    title: "Sort JSON keys for cleaner diffs",
    description: "Alphabetize object keys so configuration diffs and reviews are easier to read.",
    eyebrow: "JSON",
    relatedTools: ["json-sorter", "json-formatter"],
    readMinutes: 3,
    sections: [
      {
        heading: "Why sort keys?",
        paragraphs: [
          "Unstable key order makes reviews noisy. Sorting object keys alphabetically keeps arrays in order and stabilizes nested objects for comparison."
        ]
      }
    ]
  },
  {
    slug: "format-sql-queries",
    title: "Format SQL queries for readability",
    description: "Clean up SELECT statements and multi-clause queries across common database dialects.",
    eyebrow: "SQL",
    relatedTools: ["sql-formatter"],
    readMinutes: 4,
    sections: [
      {
        heading: "Dialect matters",
        paragraphs: [
          "Pick the dialect that matches your database before formatting. Vendor-specific quoting and functions can fail under Standard SQL."
        ]
      },
      {
        heading: "What formatting does not do",
        paragraphs: [
          "Formatting rearranges whitespace and optional keyword case. It does not execute queries or prove semantic correctness."
        ]
      }
    ]
  },
  {
    slug: "yaml-kubernetes-config",
    title: "Format YAML for Kubernetes configs",
    description: "Keep manifests and Helm-style YAML readable with consistent indentation — processed locally in your browser.",
    eyebrow: "LONG-TAIL · YAML",
    relatedTools: ["yaml-formatter", "yaml-validator", "json-to-yaml"],
    readMinutes: 5,
    sections: [
      {
        heading: "Why YAML formatting helps ops work",
        paragraphs: [
          "Kubernetes and CI configs are sensitive to indentation. Formatting with a fixed indent makes reviews safer, then validate before apply."
        ],
        bullets: [
          "Format with 2-space indentation (common for K8s)",
          "Validate syntax and complexity limits",
          "Convert from JSON when generating manifests from API data"
        ]
      },
      {
        heading: "Local processing",
        paragraphs: [
          "CodeFormatterTools parses YAML in your browser with explicit safety limits. Input is not uploaded to our servers."
        ]
      }
    ]
  },
  {
    slug: "validate-yaml-configs",
    title: "Validate YAML configuration files",
    description: "Find indentation and structure problems in YAML before they break deploys.",
    eyebrow: "YAML",
    relatedTools: ["yaml-validator", "yaml-formatter"],
    readMinutes: 4,
    sections: [
      {
        heading: "Common YAML pitfalls",
        paragraphs: ["Tabs in indentation, broken aliases, and overly deep nesting are frequent sources of failure. Validation reports line and column details so you can fix quickly."]
      }
    ]
  },
  {
    slug: "format-xml-documents",
    title: "Format XML documents safely",
    description: "Indent XML while keeping attributes, namespaces, and comments intact.",
    eyebrow: "XML",
    relatedTools: ["xml-formatter", "xml-validator"],
    readMinutes: 4,
    sections: [
      {
        heading: "Safe defaults",
        paragraphs: [
          "CodeFormatterTools blocks DOCTYPE and custom entities. Mixed content is left unchanged when whitespace could alter meaning."
        ]
      }
    ]
  },
  {
    slug: "convert-json-to-yaml",
    title: "Convert JSON to YAML",
    description: "Move API-shaped JSON into human-friendly YAML for configs and DevOps workflows.",
    eyebrow: "CONVERTERS",
    relatedTools: ["json-to-yaml", "yaml-to-json", "yaml-formatter"],
    readMinutes: 4,
    sections: [
      {
        heading: "When conversion helps",
        paragraphs: [
          "Teams often receive JSON from APIs but store settings as YAML. Convert, then format YAML for review. Use lossless mode when you need exact numeric text preserved."
        ]
      }
    ]
  },
  {
    slug: "convert-csv-to-json",
    title: "Convert CSV to JSON for APIs",
    description: "Turn spreadsheet rows into JSON objects for imports, APIs, and scripts.",
    eyebrow: "CSV",
    relatedTools: ["csv-to-json", "json-to-csv", "json-formatter"],
    readMinutes: 4,
    sections: [
      {
        heading: "Header row matters",
        paragraphs: [
          "The first CSV row becomes JSON property names. Prefer lossless mode to keep every cell as a string, or best effort when you want numbers inferred."
        ]
      }
    ]
  },
  {
    slug: "private-browser-developer-tools",
    title: "Why private browser tools matter",
    description: "Learn how CodeFormatterTools keeps formatting, validation, and conversion on your device.",
    eyebrow: "PRIVACY · PERFORMANCE",
    relatedTools: ["json-formatter", "yaml-formatter", "sql-formatter"],
    readMinutes: 5,
    sections: [
      {
        heading: "Local by default",
        paragraphs: [
          "Every tool runs in a dedicated browser worker. Input is not uploaded, logged, or stored by CodeFormatterTools for processing."
        ]
      },
      {
        heading: "Practical limits",
        paragraphs: [
          "The editor accepts up to 5 MB per input and times out long-running work so a tab stays responsive. That budget is a feature: it keeps large files from freezing your browser."
        ]
      }
    ]
  }
];

export function getLearnGuide(slug: string): LearnGuide | undefined {
  return learnGuides.find(guide => guide.slug === slug);
}
