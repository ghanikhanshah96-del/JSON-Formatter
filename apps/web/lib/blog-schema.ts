import { z } from "zod";
import { tools } from "@codeformattools/tool-registry";
import type { BlogContentBlock, BlogPost } from "./learn-guides";

const safeHref = z.string().max(500).refine(value => {
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}, "Use an internal path or an http, https, or mailto URL.");

const linkSchema = z.object({ text: z.string().trim().min(1).max(160), href: safeHref });
const draftLinkSchema = z.object({ text: z.string().trim().max(160), href: z.string().max(500) });
const tableBlockSchema = z.object({
  type: z.literal("table"),
  headers: z.array(z.string().trim().min(1).max(240)).min(2).max(8),
  rows: z.array(z.array(z.string().trim().max(1200)).min(2).max(8)).min(1).max(100)
}).superRefine((table, context) => {
  table.rows.forEach((row, index) => {
    if (row.length !== table.headers.length) context.addIssue({ code: "custom", path: ["rows", index], message: "Every table row must have the same number of cells as the header." });
  });
});
export const blogBlockSchema: z.ZodType<BlogContentBlock> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: z.string().trim().min(1).max(12000), links: z.array(linkSchema).max(12).optional() }),
  z.object({ type: z.literal("subheading"), text: z.string().trim().min(1).max(180) }),
  z.object({ type: z.literal("code"), code: z.string().min(1).max(30000), language: z.enum(["json", "javascript", "sql", "yaml", "xml", "text"]) }),
  z.object({ type: z.literal("list"), items: z.array(z.string().trim().min(1).max(800)).min(1).max(40), ordered: z.boolean().optional() }),
  tableBlockSchema
]);

const draftBlogBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: z.string().trim().max(12000), links: z.array(draftLinkSchema).max(12).optional() }),
  z.object({ type: z.literal("subheading"), text: z.string().trim().max(180) }),
  z.object({ type: z.literal("code"), code: z.string().max(30000), language: z.enum(["json", "javascript", "sql", "yaml", "xml", "text"]) }),
  z.object({ type: z.literal("list"), items: z.array(z.string().trim().max(800)).max(40), ordered: z.boolean().optional() }),
  z.object({ type: z.literal("table"), headers: z.array(z.string().trim().max(240)).max(8), rows: z.array(z.array(z.string().trim().max(1200)).max(8)).max(100) })
]);

export const blogSectionSchema = z.object({
  heading: z.string().trim().min(1).max(180),
  blocks: z.array(blogBlockSchema).min(1).max(100)
});

export const faqSchema = z.object({
  question: z.string().trim().min(5).max(240),
  answer: z.string().trim().min(10).max(3000)
});

const toolIds = new Set(tools.map(tool => tool.id));
export const blogPostInputSchema = z.object({
  id: z.string().uuid().optional(),
  expectedRevision: z.number().int().nonnegative().default(0),
  slug: z.string().trim().min(3).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(10).max(140),
  metaTitle: z.string().trim().max(70).optional().or(z.literal("")),
  description: z.string().trim().min(40).max(220),
  eyebrow: z.string().trim().min(3).max(80),
  category: z.string().trim().min(2).max(50),
  authorId: z.literal("codeformattertools-editorial").default("codeformattertools-editorial"),
  datePublished: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  relatedTools: z.array(z.string()).max(12).refine(ids => ids.every(id => toolIds.has(id as never)), "Unknown related tool."),
  readMinutes: z.number().int().min(1).max(180),
  image: z.string().trim().min(1).max(1000),
  imageAlt: z.string().trim().min(8).max(240),
  imagePosition: z.string().trim().max(60).default("center center"),
  intro: z.array(z.string().trim().min(1).max(5000)).min(1).max(12),
  sections: z.array(blogSectionSchema).min(1).max(40),
  faqs: z.array(faqSchema).max(30).default([]),
  noindex: z.boolean().default(false),
  changeSummary: z.string().trim().max(300).default("")
}).superRefine((value, context) => {
  if (!value.sections.some(section => section.heading.length > 0)) {
    context.addIssue({ code: "custom", path: ["sections"], message: "Add at least one section heading." });
  }
  const normalizedAlt = value.imageAlt.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (normalizedAlt === value.slug) {
    context.addIssue({ code: "custom", path: ["imageAlt"], message: "Replace the filename or slug with a short description of what the image shows." });
  }
  value.sections.forEach((section, sectionIndex) => section.blocks.forEach((block, blockIndex) => {
    if (block.type === "list" && block.items.length >= 2 && block.items.every(item => item.includes(" | "))) {
      context.addIssue({ code: "custom", path: ["sections", sectionIndex, "blocks", blockIndex], message: "This looks like a comparison table. Convert it to a table block before publishing." });
    }
    if (block.type === "paragraph" && (/^<\/?[A-Za-z_][\w:.-]*(?:\s|>|\/)/.test(block.text) || /^(?:select|with|insert|update|delete|merge|create|alter|drop|truncate)\b.*;$/i.test(block.text) || /^[{}]$/.test(block.text))) {
      context.addIssue({ code: "custom", path: ["sections", sectionIndex, "blocks", blockIndex], message: "This paragraph looks like source code. Convert it to a code block before publishing." });
    }
  }));
});

/**
 * Drafts intentionally accept incomplete publication fields. Maximum sizes and
 * structural limits still protect the API; blogPostInputSchema remains the
 * publication gate for content that can become public.
 */
export const blogPostDraftInputSchema = z.object({
  id: z.string().uuid().optional(),
  expectedRevision: z.number().int().nonnegative().default(0),
  slug: z.string().trim().max(120).refine(value => !value || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), "Use lowercase letters, numbers, and hyphens."),
  title: z.string().trim().max(140),
  metaTitle: z.string().trim().max(70).optional().or(z.literal("")),
  description: z.string().trim().max(220),
  eyebrow: z.string().trim().max(80),
  category: z.string().trim().min(2).max(50),
  authorId: z.literal("codeformattertools-editorial").default("codeformattertools-editorial"),
  datePublished: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  relatedTools: z.array(z.string()).max(12).refine(ids => ids.every(id => toolIds.has(id as never)), "Unknown related tool."),
  readMinutes: z.number().int().min(1).max(180),
  image: z.string().trim().max(1000),
  imageAlt: z.string().trim().max(240),
  imagePosition: z.string().trim().max(60).default("center center"),
  intro: z.array(z.string().trim().max(5000)).max(12),
  sections: z.array(z.object({
    heading: z.string().trim().max(180),
    blocks: z.array(draftBlogBlockSchema).max(100)
  })).max(40),
  faqs: z.array(z.object({
    question: z.string().trim().max(240),
    answer: z.string().trim().max(3000)
  })).max(30).default([]),
  noindex: z.boolean().default(false),
  changeSummary: z.string().trim().max(300).default("")
});

export type BlogPostInput = z.infer<typeof blogPostInputSchema>;

export function estimateReadMinutes(input: Pick<BlogPostInput, "intro" | "sections" | "faqs">) {
  const text = [
    ...input.intro,
    ...input.sections.flatMap(section => [section.heading, ...section.blocks.flatMap(block =>
      block.type === "list" ? block.items : block.type === "table" ? [...block.headers, ...block.rows.flat()] : block.type === "code" ? [block.code] : [block.text]
    )]),
    ...input.faqs.flatMap(item => [item.question, item.answer])
  ].join(" ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function extractFaqs(post: BlogPost) {
  const section = post.sections.find(item => item.heading === "Frequently Asked Questions");
  if (!section) return [];
  const faqs: { question: string; answer: string }[] = [];
  let question = "";
  let answers: string[] = [];
  const flush = () => {
    if (question && answers.length) faqs.push({ question, answer: answers.join(" ") });
  };
  section.blocks.forEach(block => {
    if (block.type === "subheading") {
      flush();
      question = block.text;
      answers = [];
    } else if (block.type === "paragraph") answers.push(block.text);
  });
  flush();
  return faqs;
}
