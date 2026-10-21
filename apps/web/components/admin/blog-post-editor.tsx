"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type ClipboardEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BlogArticleBody } from "@/components/blog-article-body";
import type { BlogContentBlock } from "@/lib/learn-guides";
import { blogPostDraftInputSchema, blogPostInputSchema, estimateReadMinutes, type BlogPostInput } from "@/lib/blog-schema";
import { parseBlogDocument, suggestCategoryId, suggestRelatedToolIds, type BlogImportMode, type BlogImportWarning } from "@/lib/blog-import";
import { savePostAction, type SavePostState } from "@/app/admin/posts/actions";

type EditorValue = BlogPostInput & { status: "draft" | "published" | "archived" };
type Option = { id: string; name: string };
type EditorView = "compose" | "preview" | "seo" | "advanced";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

function emptyBlock(type: BlogContentBlock["type"]): BlogContentBlock {
  if (type === "paragraph") return { type, text: "" };
  if (type === "subheading") return { type, text: "" };
  if (type === "code") return { type, code: "", language: "json" };
  return { type, items: [""], ordered: false };
}

function linksToText(block: Extract<BlogContentBlock, { type: "paragraph" }>) {
  return (block.links ?? []).map(link => `${link.text} | ${link.href}`).join("\n");
}

function textToLinks(value: string) {
  const links = value.split("\n").map(line => {
    const separator = line.indexOf("|");
    return separator > 0 ? { text: line.slice(0, separator).trim(), href: line.slice(separator + 1).trim() } : null;
  }).filter((item): item is { text: string; href: string } => Boolean(item?.text && item.href));
  return links.length ? links : undefined;
}

function importStorageKey(id?: string) {
  return `codeformattertools:blog-import:${id ?? "new"}`;
}

function AdvancedEditor({ value, patch, patchSection, patchBlock }: {
  value: EditorValue;
  patch: <K extends keyof EditorValue>(key: K, next: EditorValue[K]) => void;
  patchSection: (sectionIndex: number, update: (section: EditorValue["sections"][number]) => EditorValue["sections"][number]) => void;
  patchBlock: (sectionIndex: number, blockIndex: number, block: BlogContentBlock) => void;
}) {
  function move<T>(items: T[], index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return items;
    const copy = [...items]; [copy[index], copy[target]] = [copy[target], copy[index]]; return copy;
  }

  return <div className="admin-editor-main">
    <section className="admin-card admin-form">
      <div className="admin-field"><label htmlFor="title">Article title</label><input id="title" value={value.title} onChange={event => patch("title", event.target.value)} required /></div>
      <div className="admin-field"><label htmlFor="description">Description / excerpt</label><textarea id="description" value={value.description} onChange={event => patch("description", event.target.value)} required /><span className="admin-help">{value.description.length}/220 characters</span></div>
      <div className="admin-field"><label htmlFor="intro">Introduction</label><textarea id="intro" rows={8} value={value.intro.join("\n\n")} onChange={event => patch("intro", event.target.value.split(/\n\s*\n/).map(item => item.trim()).filter(Boolean))} required /><span className="admin-help">Separate paragraphs with a blank line.</span></div>
    </section>

    {value.sections.map((section, sectionIndex) => <section className="admin-section" key={`section-${sectionIndex}`}>
      <div className="admin-block-toolbar"><strong>Section {sectionIndex + 1}</strong><div className="admin-actions">
        <button className="admin-small-button" type="button" onClick={() => patch("sections", move(value.sections, sectionIndex, -1))} disabled={sectionIndex === 0} aria-label={`Move section ${sectionIndex + 1} up`}>↑</button>
        <button className="admin-small-button" type="button" onClick={() => patch("sections", move(value.sections, sectionIndex, 1))} disabled={sectionIndex === value.sections.length - 1} aria-label={`Move section ${sectionIndex + 1} down`}>↓</button>
        <button className="admin-small-button danger" type="button" onClick={() => patch("sections", value.sections.filter((_, index) => index !== sectionIndex))}>Remove</button>
      </div></div>
      <div className="admin-field"><label>Section heading (H2)</label><input aria-label={`Section ${sectionIndex + 1} heading`} value={section.heading} onChange={event => patchSection(sectionIndex, current => ({ ...current, heading: event.target.value }))} /></div>
      {section.blocks.map((block, blockIndex) => <div className="admin-block" key={`block-${blockIndex}`}>
        <div className="admin-block-toolbar"><span className="admin-badge">{block.type}</span><div className="admin-actions">
          <button className="admin-small-button" type="button" onClick={() => patchSection(sectionIndex, current => ({ ...current, blocks: move(current.blocks, blockIndex, -1) }))} disabled={blockIndex === 0} aria-label="Move block up">↑</button>
          <button className="admin-small-button" type="button" onClick={() => patchSection(sectionIndex, current => ({ ...current, blocks: move(current.blocks, blockIndex, 1) }))} disabled={blockIndex === section.blocks.length - 1} aria-label="Move block down">↓</button>
          <button className="admin-small-button danger" type="button" onClick={() => patchSection(sectionIndex, current => ({ ...current, blocks: current.blocks.filter((_, index) => index !== blockIndex) }))}>Remove</button>
        </div></div>
        {block.type === "paragraph" ? <><textarea aria-label="Paragraph text" rows={5} value={block.text} onChange={event => patchBlock(sectionIndex, blockIndex, { ...block, text: event.target.value })} /><div className="admin-field"><label>Links (optional)</label><textarea rows={2} value={linksToText(block)} onChange={event => patchBlock(sectionIndex, blockIndex, { ...block, links: textToLinks(event.target.value) })} /><span className="admin-help">One per line: visible text | /destination</span></div></> : null}
        {block.type === "subheading" ? <input aria-label="Subheading" value={block.text} onChange={event => patchBlock(sectionIndex, blockIndex, { ...block, text: event.target.value })} /> : null}
        {block.type === "code" ? <><select aria-label="Code language" value={block.language} onChange={event => patchBlock(sectionIndex, blockIndex, { ...block, language: event.target.value as "json" | "javascript" | "sql" | "text" })}><option value="json">JSON</option><option value="javascript">JavaScript</option><option value="sql">SQL</option><option value="text">Text</option></select><textarea className="admin-code" aria-label="Code" rows={10} value={block.code} onChange={event => patchBlock(sectionIndex, blockIndex, { ...block, code: event.target.value })} /></> : null}
        {block.type === "list" ? <><label className="admin-check"><input type="checkbox" checked={Boolean(block.ordered)} onChange={event => patchBlock(sectionIndex, blockIndex, { ...block, ordered: event.target.checked })} /> Numbered list</label><textarea aria-label="List items" rows={6} value={block.items.join("\n")} onChange={event => patchBlock(sectionIndex, blockIndex, { ...block, items: event.target.value.split("\n") })} /><span className="admin-help">One list item per line.</span></> : null}
      </div>)}
      <div className="admin-actions">{(["paragraph", "subheading", "list", "code"] as const).map(type => <button className="admin-small-button" key={type} type="button" onClick={() => patchSection(sectionIndex, current => ({ ...current, blocks: [...current.blocks, emptyBlock(type)] }))}>+ {type}</button>)}</div>
    </section>)}
    <button className="admin-button secondary" type="button" onClick={() => patch("sections", [...value.sections, { heading: "", blocks: [{ type: "paragraph", text: "" }] }])}>+ Add section</button>

    <section className="admin-card admin-form">
      <div><h2>Frequently asked questions</h2><p className="admin-muted">These power both the article accordion and FAQ structured data.</p></div>
      {value.faqs.map((faq, index) => <div className="admin-faq" key={`faq-${index}`}><div className="admin-block-toolbar"><strong>FAQ {index + 1}</strong><button className="admin-small-button danger" type="button" onClick={() => patch("faqs", value.faqs.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></div><input aria-label={`FAQ ${index + 1} question`} placeholder="Question" value={faq.question} onChange={event => patch("faqs", value.faqs.map((item, itemIndex) => itemIndex === index ? { ...item, question: event.target.value } : item))} /><textarea aria-label={`FAQ ${index + 1} answer`} placeholder="Answer" rows={4} value={faq.answer} onChange={event => patch("faqs", value.faqs.map((item, itemIndex) => itemIndex === index ? { ...item, answer: event.target.value } : item))} /></div>)}
      <button className="admin-button secondary" type="button" onClick={() => patch("faqs", [...value.faqs, { question: "", answer: "" }])}>+ Add FAQ</button>
    </section>
  </div>;
}

export function BlogPostEditor({ initialValue, toolOptions, categoryOptions }: { initialValue: EditorValue; toolOptions: Option[]; categoryOptions: Option[] }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [view, setView] = useState<EditorView>("compose");
  const [notice, setNotice] = useState("");
  const [dismissedErrorState, setDismissedErrorState] = useState<SavePostState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [sourceHtml, setSourceHtml] = useState("");
  const [importMode, setImportMode] = useState<BlogImportMode>("auto");
  const [importWarnings, setImportWarnings] = useState<BlogImportWarning[]>([]);
  const [sourceLoaded, setSourceLoaded] = useState(false);
  const sourceTouched = useRef(false);
  const [state, formAction, pending] = useActionState(savePostAction, { ok: false, error: "" } as SavePostState);
  const lastSaved = useRef(JSON.stringify(initialValue));
  const serialized = useMemo(() => JSON.stringify(value), [value]);
  const validation = useMemo(() => blogPostInputSchema.safeParse(value), [value]);
  const draftValidation = useMemo(() => blogPostDraftInputSchema.safeParse(value), [value]);
  const validationMessages = useMemo(() => validation.success ? [] : Array.from(new Set(validation.error.issues.map(issue => `${issue.path.join(".") || "Article"}: ${issue.message}`))).slice(0, 8), [validation]);
  const actionError = state.error && dismissedErrorState !== state ? state.error : "";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(importStorageKey(initialValue.id));
        if (saved && !sourceTouched.current) {
          const parsed = JSON.parse(saved) as { text?: string; html?: string; mode?: BlogImportMode };
          setSourceText(parsed.text ?? ""); setSourceHtml(parsed.html ?? ""); setImportMode(parsed.mode ?? "auto");
        }
      } catch { /* local recovery is best-effort */ }
      setSourceLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialValue.id]);

  useEffect(() => {
    if (!sourceLoaded) return;
    const timer = window.setTimeout(() => {
      try { window.localStorage.setItem(importStorageKey(value.id), JSON.stringify({ text: sourceText, html: sourceHtml, mode: importMode })); } catch { /* storage may be unavailable */ }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [importMode, sourceHtml, sourceLoaded, sourceText, value.id]);

  useEffect(() => {
    if (!state.ok) return;
    const timer = window.setTimeout(() => {
      setNotice(state.status === "published" ? "Published successfully." : "Draft saved.");
      setValue(current => {
        const next = { ...current, id: state.id ?? current.id, expectedRevision: state.revision ?? current.expectedRevision, status: state.status as EditorValue["status"] ?? current.status };
        lastSaved.current = JSON.stringify(next);
        return next;
      });
      if (!initialValue.id && state.id) router.replace(`/admin/posts/${state.id}/edit?saved=1`);
      else router.refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [state, initialValue.id, router]);

  useEffect(() => {
    if (!initialValue.id || value.status !== "draft" || serialized === lastSaved.current || pending || !draftValidation.success) return;
    const timer = window.setTimeout(async () => {
      setNotice("Autosaving…");
      try {
        const response = await fetch("/api/admin/posts/autosave", { method: "POST", headers: { "Content-Type": "application/json" }, body: serialized });
        const result = await response.json() as SavePostState;
        if (!response.ok || !result.ok) { setNotice(result.error || "Autosave failed."); return; }
        const next = { ...value, expectedRevision: result.revision ?? value.expectedRevision };
        lastSaved.current = JSON.stringify(next); setValue(next); setNotice("Draft autosaved.");
      } catch { setNotice("Autosave failed. Your changes remain in this browser."); }
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [draftValidation.success, initialValue.id, pending, serialized, value]);

  function patch<K extends keyof EditorValue>(key: K, next: EditorValue[K]) { setValue(current => ({ ...current, [key]: next })); setNotice(""); setDismissedErrorState(state); }
  function patchSection(sectionIndex: number, update: (section: EditorValue["sections"][number]) => EditorValue["sections"][number]) { patch("sections", value.sections.map((section, index) => index === sectionIndex ? update(section) : section)); }
  function patchBlock(sectionIndex: number, blockIndex: number, block: BlogContentBlock) { patchSection(sectionIndex, section => ({ ...section, blocks: section.blocks.map((item, index) => index === blockIndex ? block : item) })); }

  function capturePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const text = event.clipboardData.getData("text/plain");
    const html = event.clipboardData.getData("text/html");
    if (!text && !html) return;
    event.preventDefault(); sourceTouched.current = true; setSourceText(text); setSourceHtml(html); setImportWarnings([]); setDismissedErrorState(state); setNotice(html ? "Rich document formatting detected." : "Plain text detected.");
  }

  function formatArticle() {
    try {
      const imported = parseBlogDocument({ text: sourceText, html: sourceHtml, mode: importMode });
      const suggestedTools = suggestRelatedToolIds(`${imported.title}\n${sourceText}`, toolOptions);
      const suggestedCategory = suggestCategoryId(`${imported.title}\n${sourceText}`, categoryOptions);
      setValue(current => {
        const category = suggestedCategory ?? current.category;
        const next: EditorValue = { ...current, title: imported.title, slug: current.id ? current.slug : imported.slug, metaTitle: imported.metaTitle, description: imported.description, intro: imported.intro, sections: imported.sections, faqs: imported.faqs, relatedTools: suggestedTools.length ? suggestedTools : current.relatedTools, category, eyebrow: `${category.toUpperCase()} · GUIDE`, changeSummary: current.changeSummary || "Imported with Quick Paste" };
        return { ...next, readMinutes: estimateReadMinutes(next) };
      });
      setImportWarnings(imported.warnings); setNotice(`Article formatted from ${imported.source === "rich" ? "rich text" : imported.source}. Review the preview and highlighted checks.`); setView("preview");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to format the article."); }
  }

  function clearSource() {
    sourceTouched.current = true; setSourceText(""); setSourceHtml(""); setImportWarnings([]); setNotice("");
    try { window.localStorage.removeItem(importStorageKey(value.id)); } catch { /* ignore */ }
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setUploading(true); setNotice("");
    const data = new FormData(); data.set("file", file); data.set("alt", value.imageAlt);
    try {
      const response = await fetch("/api/admin/media", { method: "POST", body: data });
      const result = await response.json() as { asset?: { public_url: string; default_alt: string }; error?: string };
      if (!response.ok || !result.asset) setNotice(result.error ?? "Upload failed.");
      else { setValue(current => ({ ...current, image: result.asset!.public_url, imageAlt: current.imageAlt || result.asset!.default_alt })); setNotice("Image uploaded."); }
    } catch { setNotice("Image upload failed."); }
    setUploading(false);
  }

  const previewSections = [...value.sections, ...(value.faqs.length ? [{ heading: "Frequently Asked Questions", blocks: value.faqs.flatMap(item => [{ type: "subheading" as const, text: item.question }, { type: "paragraph" as const, text: item.answer }]) }] : [])];

  return <form action={formAction} className="admin-form" noValidate>
    <input name="payload" type="hidden" value={serialized} />
    {(actionError || notice) ? <div className={actionError || /failed|unable|too large/i.test(notice) ? "admin-error" : "admin-success"} role="status">{actionError || notice}</div> : null}
    <nav className="admin-editor-tabs" aria-label="Article editor modes">{(["compose", "preview", "seo", "advanced"] as const).map(item => <button className={view === item ? "active" : ""} key={item} type="button" onClick={() => setView(item)} aria-current={view === item ? "page" : undefined}>{item === "compose" ? "Quick Paste" : item === "seo" ? "SEO" : item[0].toUpperCase() + item.slice(1)}</button>)}</nav>

    <div className="admin-editor">
      <div className="admin-editor-main">
        {view === "compose" ? <><section className="admin-card admin-form"><div><h2>Paste the complete article</h2><p className="admin-muted">Copy from Word or Google Docs, or paste Markdown/plain text. Headings, lists, links, code and FAQs are converted into the website’s standard article format.</p></div><div className="admin-field"><label htmlFor="import-mode">Source format</label><select id="import-mode" value={importMode} onChange={event => { sourceTouched.current = true; setImportMode(event.target.value as BlogImportMode); }}><option value="auto">Detect automatically</option><option value="rich">Rich text (Word or Google Docs)</option><option value="markdown">Markdown</option><option value="plain">Plain text with H1:, H2: and H3: labels</option></select></div><div className="admin-field"><label htmlFor="article-source">Complete article</label><textarea id="article-source" className="admin-paste-source" rows={24} placeholder="# Article title&#10;&#10;Opening paragraph...&#10;&#10;## First section&#10;&#10;Section content..." value={sourceText} onPaste={capturePaste} onChange={event => { sourceTouched.current = true; setSourceText(event.target.value); setSourceHtml(""); setImportWarnings([]); }} /><span className="admin-help">{sourceHtml ? "Rich clipboard structure is ready to import. Editing this field switches to visible text parsing." : "Use H1/H2/H3 styles before copying, or Markdown headings beginning with #, ## and ###."}</span></div><div className="admin-actions"><button className="admin-button" type="button" onClick={formatArticle}>Format article</button><button className="admin-button secondary" type="button" onClick={clearSource} disabled={!sourceText && !sourceHtml}>Clear pasted source</button></div></section><section className="admin-card"><h3>Formatting rules</h3><div className="admin-import-rules"><span>H1 → title</span><span>Opening text → introduction</span><span>H2 → section</span><span>H3 → subheading</span><span>Bullets/numbers → lists</span><span>FAQ section → accordion</span></div></section></> : null}

        {view === "preview" ? <section className="admin-card admin-preview-shell"><div className="admin-preview-heading"><div><h2>Article preview</h2><p className="admin-muted">This uses the same body renderer as the public article.</p></div><button className="admin-button secondary" type="button" onClick={() => setView("advanced")}>Edit structure</button></div><article className="learn-article blog-article admin-live-preview"><header className="blog-article-hero"><div className="blog-article-hero-grid"><div className="blog-article-hero-copy"><div className="eyebrow">{value.eyebrow}</div><h1>{value.title || "Untitled article"}<span className="title-accent">.</span></h1><p className="learn-lead">{value.description || "The generated search description will appear here."}</p><p className="learn-minutes-line">{estimateReadMinutes(value)} min read · preview</p></div>{value.image ? <figure className="blog-hero-media"><Image src={value.image} alt={value.imageAlt || ""} fill sizes="520px" style={{ objectPosition: value.imagePosition }} /></figure> : <div className="admin-preview-image-missing">Add a cover image</div>}</div></header><BlogArticleBody post={{ slug: value.slug || "preview", intro: value.intro.filter(Boolean), sections: previewSections }} /></article></section> : null}

        {view === "seo" ? <section className="admin-card admin-form"><div><h2>Search and organization</h2><p className="admin-muted">Quick Paste suggests these values. Confirm them before publishing.</p></div><div className="admin-field"><label htmlFor="seo-title-main">Article title</label><input id="seo-title-main" value={value.title} onChange={event => patch("title", event.target.value)} required /><span className="admin-help">{value.title.length}/140 characters</span></div><div className="admin-field"><label htmlFor="seo-description-main">Description / excerpt</label><textarea id="seo-description-main" value={value.description} onChange={event => patch("description", event.target.value)} required /><span className="admin-help">{value.description.length}/220; aim for a concise search summary.</span></div><div className="admin-field"><label htmlFor="seo-meta-title-main">SEO title</label><input id="seo-meta-title-main" maxLength={70} value={value.metaTitle ?? ""} onChange={event => patch("metaTitle", event.target.value)} /><span className="admin-help">{value.metaTitle?.length ?? 0}/70; aim for 30–60.</span></div><div className="admin-field"><label htmlFor="seo-slug-main">Slug</label><div className="admin-actions"><input id="seo-slug-main" value={value.slug} onChange={event => patch("slug", slugify(event.target.value))} required /><button className="admin-small-button" type="button" onClick={() => patch("slug", slugify(value.title))}>Generate</button></div></div><div className="admin-grid admin-grid-two"><div className="admin-field"><label htmlFor="seo-category-main">Category</label><select id="seo-category-main" value={value.category} onChange={event => patch("category", event.target.value)}>{categoryOptions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="admin-field"><label htmlFor="seo-eyebrow-main">Eyebrow</label><input id="seo-eyebrow-main" value={value.eyebrow} onChange={event => patch("eyebrow", event.target.value)} /></div></div><div className="admin-field"><span className="admin-label">Related tools</span><div className="admin-check-grid">{toolOptions.map(tool => <label className="admin-check" key={tool.id}><input type="checkbox" checked={value.relatedTools.includes(tool.id)} onChange={event => patch("relatedTools", event.target.checked ? [...value.relatedTools, tool.id] : value.relatedTools.filter(id => id !== tool.id))} />{tool.name}</label>)}</div></div><label className="admin-check"><input type="checkbox" checked={value.noindex} onChange={event => patch("noindex", event.target.checked)} /> Prevent search indexing</label></section> : null}

        {view === "advanced" ? <AdvancedEditor value={value} patch={patch} patchSection={patchSection} patchBlock={patchBlock} /> : null}
      </div>

      <aside className="admin-editor-side">
        <section className="admin-card admin-form"><div className="admin-toolbar"><strong>Publishing</strong><span className={`admin-badge ${value.status}`}>{value.status}</span></div>{validationMessages.length ? <div className="admin-checklist" role="status"><strong>Complete before publishing</strong><ul>{validationMessages.map(message => <li key={message}>{message}</li>)}</ul></div> : <div className="admin-ready">Ready to publish</div>}<button className="admin-button secondary" disabled={pending || !draftValidation.success} name="intent" value={value.status === "published" ? "save" : "draft"} type="submit">{pending ? "Saving…" : value.status === "published" ? "Save changes" : value.status === "archived" ? "Restore as draft" : "Save draft"}</button><button className="admin-button" disabled={pending || !validation.success} name="intent" value="publish" type="submit">{value.status === "published" ? "Update published post" : "Publish"}</button>{value.id ? <a className="admin-button secondary" href={`/admin/posts/${value.id}/preview`} target="_blank">Open private preview</a> : null}<div className="admin-field"><label>Change summary</label><input aria-label="Change summary" value={value.changeSummary} onChange={event => patch("changeSummary", event.target.value)} placeholder="What changed?" /></div><div className="admin-field"><label>Publication date</label><input aria-label="Publication date" type="date" value={value.datePublished} onChange={event => patch("datePublished", event.target.value)} /></div></section>
        <section className="admin-card admin-form"><strong>Cover image</strong>{value.image ? <div className="admin-media-preview"><Image alt={value.imageAlt || ""} fill sizes="330px" src={value.image} style={{ objectFit: "cover", objectPosition: value.imagePosition }} /></div> : null}<div className="admin-field"><label>Upload image</label><input aria-label="Upload cover image" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} type="file" onChange={event => void uploadImage(event.target.files?.[0])} /><span className="admin-help">JPG, PNG, WebP or AVIF, maximum 5 MB.</span></div><div className="admin-field"><label>Image URL</label><input aria-label="Image URL" value={value.image} onChange={event => patch("image", event.target.value)} required /></div><div className="admin-field"><label>Alt text</label><textarea aria-label="Alt text" rows={3} value={value.imageAlt} onChange={event => patch("imageAlt", event.target.value)} required /></div><div className="admin-field"><label>Focal position</label><select aria-label="Focal position" value={value.imagePosition} onChange={event => patch("imagePosition", event.target.value)}><option>center center</option><option>center top</option><option>center bottom</option><option>left center</option><option>right center</option></select></div></section>
        {importWarnings.length ? <section className="admin-card admin-form"><strong>Import review</strong><ul className="admin-warning-list">{importWarnings.map((warning, index) => <li className={warning.severity} key={`${warning.code}-${index}`}>{warning.message}</li>)}</ul></section> : null}
      </aside>
    </div>
  </form>;
}
