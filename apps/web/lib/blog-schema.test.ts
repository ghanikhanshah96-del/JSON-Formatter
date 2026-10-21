import assert from "node:assert/strict";
import test from "node:test";
import { blogPostDraftInputSchema, blogPostInputSchema, estimateReadMinutes, extractFaqs } from "./blog-schema.ts";
import { blogPosts } from "./learn-guides.ts";

function validInput() {
  return {
    expectedRevision: 0,
    slug: "safe-json-guide",
    title: "A safe and useful JSON guide",
    metaTitle: "Safe JSON Guide",
    description: "A sufficiently detailed description for a useful JSON guide and its search result.",
    eyebrow: "JSON · GUIDE",
    category: "json",
    authorId: "codeformattertools-editorial" as const,
    datePublished: "2026-10-20",
    relatedTools: ["json-formatter"],
    readMinutes: 2,
    image: "/blog/how-to-create-json-file.png",
    imageAlt: "A descriptive JSON guide cover image",
    imagePosition: "center center",
    intro: ["This is an introductory paragraph with useful context."],
    sections: [{ heading: "First section", blocks: [{ type: "paragraph" as const, text: "A complete section paragraph." }] }],
    faqs: [{ question: "Is this guide safe to use?", answer: "Yes, it contains structured and validated content." }],
    noindex: false,
    changeSummary: "Initial draft"
  };
}

test("accepts a valid structured blog post", () => {
  assert.equal(blogPostInputSchema.safeParse(validInput()).success, true);
});

test("accepts incomplete drafts while keeping them ineligible for publishing", () => {
  const draft = {
    ...validInput(),
    slug: "",
    title: "Started",
    description: "",
    image: "",
    imageAlt: "",
    intro: [""],
    sections: [{ heading: "", blocks: [{ type: "paragraph" as const, text: "" }] }],
    faqs: [{ question: "", answer: "" }]
  };
  assert.equal(blogPostDraftInputSchema.safeParse(draft).success, true);
  assert.equal(blogPostInputSchema.safeParse(draft).success, false);
});

test("draft validation still enforces safety limits", () => {
  assert.equal(blogPostDraftInputSchema.safeParse({ ...validInput(), title: "x".repeat(141) }).success, false);
  assert.equal(blogPostDraftInputSchema.safeParse({ ...validInput(), relatedTools: ["made-up-tool"] }).success, false);
});

test("rejects unsafe link protocols", () => {
  const input = validInput();
  input.sections[0].blocks = [{ type: "paragraph", text: "Click this link", links: [{ text: "this link", href: "javascript:alert(1)" }] }] as never;
  const result = blogPostInputSchema.safeParse(input);
  assert.equal(result.success, false);
});

test("rejects unknown related tool identifiers", () => {
  const result = blogPostInputSchema.safeParse({ ...validInput(), relatedTools: ["made-up-tool"] });
  assert.equal(result.success, false);
});

test("read time is calculated from structured content and never drops below one minute", () => {
  assert.equal(estimateReadMinutes(validInput()), 1);
  const long = validInput();
  long.intro = [Array.from({ length: 450 }, () => "word").join(" ")];
  assert.equal(estimateReadMinutes(long), 3);
});

test("extracts FAQ question and answer pairs from every legacy post", () => {
  assert.equal(blogPosts.length, 4);
  for (const post of blogPosts) {
    const faqs = extractFaqs(post);
    assert.ok(faqs.length >= 3, `${post.slug} should contain at least three FAQs`);
    assert.ok(faqs.every(item => item.question.length >= 5 && item.answer.length >= 10));
  }
});
