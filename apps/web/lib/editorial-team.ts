export const DEFAULT_EDITORIAL_PROFILE_ID = "codeformattertools-editorial" as const;

export type EditorialProfileId = typeof DEFAULT_EDITORIAL_PROFILE_ID;

export type EditorialProfile = {
  id: EditorialProfileId;
  slug: string;
  path: string;
  name: string;
  role: string;
  description: string;
  reviewStatement: string;
  expertise: string[];
  links: { href: string; label: string }[];
};

export const editorialProfiles: Record<EditorialProfileId, EditorialProfile> = {
  [DEFAULT_EDITORIAL_PROFILE_ID]: {
    id: DEFAULT_EDITORIAL_PROFILE_ID,
    slug: "codeformattertools-editorial",
    path: "/team/codeformattertools-editorial",
    name: "CodeFormatterTools Editorial Team",
    role: "Developer-tool documentation and structured-data guides",
    description:
      "The CodeFormatterTools Editorial Team creates practical guides for working with structured data and browser-based developer utilities. Our coverage includes JSON, XML, YAML, SQL, CSV, validation, formatting, conversion, and privacy-conscious workflows.",
    reviewStatement:
      "Each guide is reviewed against the behavior of the relevant CodeFormatterTools utility and checked against authoritative technical sources when the topic requires them. We update articles when the tools, standards, or recommended workflows change.",
    expertise: [
      "JSON formatting and validation",
      "XML and YAML workflows",
      "SQL formatting",
      "CSV and structured-data conversion",
      "Browser-based developer tools",
      "Privacy-conscious data processing"
    ],
    links: [
      { href: "/about-us", label: "About Us" },
      { href: "/editorial-policy", label: "Editorial Policy" },
      { href: "/contact-us", label: "Contact Us" }
    ]
  }
};

export const defaultEditorialProfile = editorialProfiles[DEFAULT_EDITORIAL_PROFILE_ID];

export function getEditorialProfile(id: EditorialProfileId): EditorialProfile {
  return editorialProfiles[id];
}

export function formatEditorialDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${value}T00:00:00Z`));
}

export function formatEditorialShortDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${value}T00:00:00Z`));
}
