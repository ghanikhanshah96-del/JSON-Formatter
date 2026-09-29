export const CONTACT_TOPICS = [
  { id: "privacy", label: "Privacy / data handling" },
  { id: "security", label: "Security report" },
  { id: "bug", label: "Tool bug or incorrect output" },
  { id: "docs", label: "Docs / Blog correction" },
  { id: "legal", label: "Terms / takedown" },
  { id: "other", label: "Something else" }
] as const;

export type ContactTopicId = (typeof CONTACT_TOPICS)[number]["id"];

export const CONTACT_LIMITS = {
  nameMin: 2,
  nameMax: 120,
  emailMax: 254,
  messageMin: 10,
  messageMax: 5000
} as const;

export type ContactInput = {
  name?: unknown;
  email?: unknown;
  topic?: unknown;
  message?: unknown;
  website_url?: unknown;
  company?: unknown;
};

export type ContactFieldErrors = {
  name?: string;
  email?: string;
  topic?: string;
  message?: string;
};

export type ValidatedContact = {
  name: string;
  email: string;
  topic: ContactTopicId;
  message: string;
};

const TOPIC_IDS = new Set<string>(CONTACT_TOPICS.map(topic => topic.id));

/** Practical email check aligned with common HTML5 / RFC 5321 length limits. */
const EMAIL_PATTERN =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

/** Letters, spaces, hyphen, apostrophe, period only. */
const NAME_CHAR_PATTERN = /^[\p{L} ''.\-]+$/u;

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function cleanText(value: unknown): string {
  return asString(value)
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

function normalizeName(value: string): string {
  return value
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMessage(value: string): string {
  return value.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function isValidEmail(value: string): boolean {
  if (!value || value.length > CONTACT_LIMITS.emailMax) return false;
  if (/\s/.test(value)) return false;
  if (value.includes("..")) return false;
  if (value.startsWith(".") || value.endsWith(".")) return false;
  if (value.startsWith("@") || value.endsWith("@")) return false;
  const [local, domain] = value.split("@");
  if (!local || !domain) return false;
  if (local.length > 64) return false;
  if (!domain.includes(".")) return false;
  const tld = domain.slice(domain.lastIndexOf(".") + 1);
  if (tld.length < 2 || !/^[a-z]+$/i.test(tld)) return false;
  return EMAIL_PATTERN.test(value);
}

/**
 * Person names: Unicode letters with spaces between words.
 * Hyphens/apostrophes only between letters (Mary-Jane, O'Brien).
 * Periods only after letters (Dr. Smith, J.K. Rowling, John Jr.).
 */
export function personNameError(value: string): string | undefined {
  const name = normalizeName(value);

  if (!name) return "Please enter your name.";
  if (name.length < CONTACT_LIMITS.nameMin) {
    return `Name must be at least ${CONTACT_LIMITS.nameMin} characters.`;
  }
  if (name.length > CONTACT_LIMITS.nameMax) {
    return `Name must be ${CONTACT_LIMITS.nameMax} characters or fewer.`;
  }
  if (/\d/.test(name)) return "Name cannot include numbers.";
  if (!NAME_CHAR_PATTERN.test(name)) {
    return "Name can only include letters, spaces, hyphens, apostrophes, and periods.";
  }

  const letterCount = (name.match(/\p{L}/gu) ?? []).length;
  if (letterCount < CONTACT_LIMITS.nameMin) {
    return `Name must include at least ${CONTACT_LIMITS.nameMin} letters.`;
  }
  if (!/^\p{L}/u.test(name)) return "Name must start with a letter.";

  if (/--|''|\.\./.test(name)) {
    return "Name cannot include repeated punctuation.";
  }
  // Hyphen/apostrophe must sit between letters — rejects "test- k'" and "Mary- Jane".
  if (/[\-']\s|\s[\-']|(?<!\p{L})[\-']|[\-'](?!\p{L})/u.test(name)) {
    return "Use hyphens and apostrophes between letters (example: Mary-Jane, O'Brien).";
  }
  // Period only after a letter, and only before a letter, a space, or the end.
  if (/(?<!\p{L})\./u.test(name) || /\.(?![\p{L}\s]|$)/u.test(name)) {
    return "Periods can only follow letters (example: Dr. Smith, J.K. Rowling).";
  }
  if (!/\p{L}\.?$/u.test(name)) return "Name must end with a letter.";

  return undefined;
}

export function isValidPersonName(value: string): boolean {
  return personNameError(value) === undefined;
}

export function isValidMessage(value: string): boolean {
  const message = normalizeMessage(value);
  if (message.length < CONTACT_LIMITS.messageMin || message.length > CONTACT_LIMITS.messageMax) return false;
  // Require real wording — not only numbers, punctuation, or emoji spam.
  const letters = message.match(/\p{L}/gu) ?? [];
  if (letters.length < 5) return false;
  const alnum = message.match(/[\p{L}\p{N}]/gu) ?? [];
  if (alnum.length / message.replace(/\s/g, "").length < 0.4) return false;
  return true;
}

export function topicLabel(topic: string): string {
  return CONTACT_TOPICS.find(item => item.id === topic)?.label ?? "General support";
}

export function validateContactInput(input: ContactInput):
  | { ok: true; data: ValidatedContact }
  | { ok: false; errors: ContactFieldErrors; error: string } {
  const errors: ContactFieldErrors = {};
  const name = normalizeName(cleanText(input.name));
  const email = cleanText(input.email).toLowerCase();
  const topic = cleanText(input.topic) || "other";
  const message = normalizeMessage(cleanText(input.message));

  const nameError = personNameError(name);
  if (nameError) errors.name = nameError;

  if (!email) {
    errors.email = "Please enter your email address.";
  } else if (email.length > CONTACT_LIMITS.emailMax) {
    errors.email = `Email must be ${CONTACT_LIMITS.emailMax} characters or fewer.`;
  } else if (!isValidEmail(email)) {
    errors.email = "Please enter a valid email address (example: you@example.com).";
  }

  if (!TOPIC_IDS.has(topic)) {
    errors.topic = "Please choose a valid topic.";
  }

  if (!message) {
    errors.message = "Please enter a message.";
  } else if (message.length < CONTACT_LIMITS.messageMin) {
    errors.message = `Message must be at least ${CONTACT_LIMITS.messageMin} characters.`;
  } else if (message.length > CONTACT_LIMITS.messageMax) {
    errors.message = `Message must be ${CONTACT_LIMITS.messageMax} characters or fewer.`;
  } else if (!isValidMessage(message)) {
    errors.message = "Message must include readable text — not only numbers or symbols.";
  }

  const keys = Object.keys(errors) as Array<keyof ContactFieldErrors>;
  if (keys.length) {
    return {
      ok: false,
      errors,
      error: errors[keys[0]] ?? "Please fix the highlighted fields."
    };
  }

  return {
    ok: true,
    data: {
      name,
      email,
      topic: topic as ContactTopicId,
      message
    }
  };
}

/** True when a honeypot field was filled — treat as spam success on the server. */
export function isContactHoneypotTriggered(input: ContactInput): boolean {
  return Boolean(cleanText(input.website_url) || cleanText(input.company));
}
