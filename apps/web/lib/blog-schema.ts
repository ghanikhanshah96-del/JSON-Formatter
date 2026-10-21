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
export const blogBlockSchema: z.ZodType<BlogContentBlock> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: z.string().trim().min(1).max(12000), links: z.array(linkSchema).max(12).optional() }),
  z.object({ type: z.literal("subheading"), text: z.string().trim().min(1).max(180) }),
  z.object({ type: z.literal("code"), code: z.string().min(1).max(30000), language: z.enum(["json", "javascript", "sql", "text"]) }),
  z.object({ type: z.literal("list"), items: z.array(z.string().trim().min(1).max(800)).min(1).max(40), ordered: z.boolean().optional() })
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
});

export type BlogPostInput = z.infer<typeof blogPostInputSchema>;

export function estimateReadMinutes(input: Pick<BlogPostInput, "intro" | "sections" | "faqs">) {
  const text = [
    ...input.intro,
    ...input.sections.flatMap(section => [section.heading, ...section.blocks.flatMap(block =>
      block.type === "list" ? block.items : block.type === "code" ? [block.code] : [block.text]
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
