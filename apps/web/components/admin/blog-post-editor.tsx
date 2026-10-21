"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { BlogContentBlock } from "@/lib/learn-guides";
import type { BlogPostInput } from "@/lib/blog-schema";
import { savePostAction, type SavePostState } from "@/app/admin/posts/actions";

type EditorValue = BlogPostInput & { status: "draft" | "published" | "archived" };
type Option = { id: string; name: string };

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

export function BlogPostEditor({ initialValue, toolOptions, categoryOptions }: { initialValue: EditorValue; toolOptions: Option[]; categoryOptions: Option[] }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [state, formAction, pending] = useActionState(savePostAction, { ok: false, error: "" } as SavePostState);
  const lastSaved = useRef(JSON.stringify(initialValue));
  const serialized = useMemo(() => JSON.stringify(value), [value]);

  useEffect(() => {
    if (!state.ok) return;
    const timer = window.setTimeout(() => {
      setNotice(state.status === "published" ? "Published successfully." : "Draft saved.");
      setValue(current => ({ ...current, id: state.id ?? current.id, expectedRevision: state.revision ?? current.expectedRevision, status: state.status as EditorValue["status"] ?? current.status }));
      if (!initialValue.id && state.id) {
        router.replace(`/admin/posts/${state.id}/edit?saved=1`);
      } else {
        router.refresh();
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [state, initialValue.id, router]);

  useEffect(() => {
    if (!value.id || value.status !== "draft" || serialized === lastSaved.current || pending) return;
    const timer = window.setTimeout(async () => {
      setNotice("Autosaving…");
      try {
        const response = await fetch("/api/admin/posts/autosave", { method: "POST", headers: { "Content-Type": "application/json" }, body: serialized });
        const result = await response.json() as SavePostState;
        if (!response.ok || !result.ok) { setNotice(result.error || "Autosave failed."); return; }
        const next = { ...value, expectedRevision: result.revision ?? value.expectedRevision };
        lastSaved.current = JSON.stringify(next);
        setValue(next);
        setNotice("Draft autosaved.");
      } catch { setNotice("Autosave failed. Your changes remain in this browser."); }
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [pending, serialized, value]);

  function patch<K extends keyof EditorValue>(key: K, next: EditorValue[K]) {
    setValue(current => ({ ...current, [key]: next })); setNotice("");
  }

  function patchSection(sectionIndex: number, update: (section: EditorValue["sections"][number]) => EditorValue["sections"][number]) {
    patch("sections", value.sections.map((section, index) => index === sectionIndex ? update(section) : section));
  }

  function patchBlock(sectionIndex: number, blockIndex: number, block: BlogContentBlock) {
    patchSection(sectionIndex, section => ({ ...section, blocks: section.blocks.map((item, index) => index === blockIndex ? block : item) }));
  }

  function move<T>(items: T[], index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return items;
    const copy = [...items]; [copy[index], copy[target]] = [copy[target], copy[index]]; return copy;
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setUploading(true); setNotice("");
    const data = new FormData(); data.set("file", file); data.set("alt", value.imageAlt);
    try {
      const response = await fetch("/api/admin/media", { method: "POST", body: data });
      const result = await response.json() as { asset?: { public_url: string; default_alt: string }; error?: string };
      if (!response.ok || !result.asset) setNotice(result.error ?? "Upload failed.");
      else {
        patch("image", result.asset.public_url);
        if (!value.imageAlt && result.asset.default_alt) patch("imageAlt", result.asset.default_alt);
        setNotice("Image uploaded.");
      }
    } catch { setNotice("Image upload failed."); }
    setUploading(false);
  }

  return <form action={formAction} className="admin-form">
    <input name="payload" type="hidden" value={serialized} />
    <div className="admin-editor">
      <div className="admin-editor-main">
        {(state.error || notice) ? <div className={state.error ? "admin-error" : notice.includes("failed") ? "admin-error" : "admin-success"} role="status">{state.error || notice}</div> : null}
        <section className="admin-card admin-form">
          <div className="admin-field"><label htmlFor="title">Article title</label><input id="title" value={value.title} onChange={event => patch("title", event.target.value)} required /></div>
          <div className="admin-field"><label htmlFor="description">Description / excerpt</label><textarea id="description" value={value.description} onChange={event => patch("description", event.target.value)} required /><span className="admin-help">{value.description.length}/220 characters</span></div>
          <div className="admin-field"><label htmlFor="intro">Introduction</label><textarea id="intro" rows={8} value={value.intro.join("\n\n")} onChange={event => patch("intro", event.target.value.split(/\n\s*\n/).map(item => item.trim()).filter(Boolean))} required /><span className="admin-help">Separate paragraphs with a blank line.</span></div>
        </section>

        {value.sections.map((section, sectionIndex) => <section className="admin-section" key={`section-${sectionIndex}`}>
          <div className="admin-block-toolbar">
            <strong>Section {sectionIndex + 1}</strong>
            <div className="admin-actions">
              <button className="admin-small-button" type="button" onClick={() => patch("sections", move(value.sections, sectionIndex, -1))} disabled={sectionIndex === 0}>↑</button>
              <button className="admin-small-button" type="button" onClick={() => patch("sections", move(value.sections, sectionIndex, 1))} disabled={sectionIndex === value.sections.length - 1}>↓</button>
              <button className="admin-small-button danger" type="button" onClick={() => patch("sections", value.sections.filter((_, index) => index !== sectionIndex))}>Remove</button>
            </div>
          </div>
          <div className="admin-field"><label>Section heading (H2)</label><input aria-label={`Section ${sectionIndex + 1} heading`} value={section.heading} onChange={event => patchSection(sectionIndex, current => ({ ...current, heading: event.target.value }))} /></div>
          {section.blocks.map((block, blockIndex) => <div className="admin-block" key={`block-${blockIndex}`}>
            <div className="admin-block-toolbar"><span className="admin-badge">{block.type}</span><div className="admin-actions">
              <button className="admin-small-button" type="button" onClick={() => patchSection(sectionIndex, current => ({ ...current, blocks: move(current.blocks, blockIndex, -1) }))} disabled={blockIndex === 0}>↑</button>
              <button className="admin-small-button" type="button" onClick={() => patchSection(sectionIndex, current => ({ ...current, blocks: move(current.blocks, blockIndex, 1) }))} disabled={blockIndex === section.blocks.length - 1}>↓</button>
              <button className="admin-small-button danger" type="button" onClick={() => patchSection(sectionIndex, current => ({ ...current, blocks: current.blocks.filter((_, index) => index !== blockIndex) }))}>Remove</button>
            </div></div>
            {block.type === "paragraph" ? <>
              <textarea aria-label="Paragraph text" rows={5} value={block.text} onChange={event => patchBlock(sectionIndex, blockIndex, { ...block, text: event.target.value })} />
              <div className="admin-field"><label>Links (optional)</label><textarea rows={2} value={linksToText(block)} onChange={event => patchBlock(sectionIndex, blockIndex, { ...block, links: textToLinks(event.target.value) })} /><span className="admin-help">One per line: visible text | /destination</span></div>
            </> : null}
            {block.type === "subheading" ? <input aria-label="Subheading" value={block.text} onChange={event => patchBlock(sectionIndex, blockIndex, { ...block, text: event.target.value })} /> : null}
            {block.type === "code" ? <><select aria-label="Code language" value={block.language} onChange={event => patchBlock(sectionIndex, blockIndex, { ...block, language: event.target.value as "json" | "javascript" | "text" })}><option value="json">JSON</option><option value="javascript">JavaScript</option><option value="text">Text</option></select><textarea className="admin-code" aria-label="Code" rows={10} value={block.code} onChange={event => patchBlock(sectionIndex, blockIndex, { ...block, code: event.target.value })} /></> : null}
            {block.type === "list" ? <><label className="admin-check"><input type="checkbox" checked={Boolean(block.ordered)} onChange={event => patchBlock(sectionIndex, blockIndex, { ...block, ordered: event.target.checked })} /> Numbered list</label><textarea aria-label="List items" rows={6} value={block.items.join("\n")} onChange={event => patchBlock(sectionIndex, blockIndex, { ...block, items: event.target.value.split("\n") })} /><span className="admin-help">One list item per line.</span></> : null}
          </div>)}
          <div className="admin-actions">{(["paragraph", "subheading", "list", "code"] as const).map(type => <button className="admin-small-button" key={type} type="button" onClick={() => patchSection(sectionIndex, current => ({ ...current, blocks: [...current.blocks, emptyBlock(type)] }))}>+ {type}</button>)}</div>
        </section>)}
        <button className="admin-button secondary" type="button" onClick={() => patch("sections", [...value.sections, { heading: "", blocks: [{ type: "paragraph", text: "" }] }])}>+ Add section</button>

        <section className="admin-card admin-form">
          <div><h2>Frequently asked questions</h2><p className="admin-muted">These power both the article accordion and FAQ data.</p></div>
          {value.faqs.map((faq, index) => <div className="admin-faq" key={`faq-${index}`}>
            <div className="admin-block-toolbar"><strong>FAQ {index + 1}</strong><button className="admin-small-button danger" type="button" onClick={() => patch("faqs", value.faqs.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></div>
            <input aria-label={`FAQ ${index + 1} question`} placeholder="Question" value={faq.question} onChange={event => patch("faqs", value.faqs.map((item, itemIndex) => itemIndex === index ? { ...item, question: event.target.value } : item))} />
            <textarea aria-label={`FAQ ${index + 1} answer`} placeholder="Answer" rows={4} value={faq.answer} onChange={event => patch("faqs", value.faqs.map((item, itemIndex) => itemIndex === index ? { ...item, answer: event.target.value } : item))} />
          </div>)}
          <button className="admin-button secondary" type="button" onClick={() => patch("faqs", [...value.faqs, { question: "", answer: "" }])}>+ Add FAQ</button>
        </section>
      </div>

      <aside className="admin-editor-side">
        <section className="admin-card admin-form">
          <div className="admin-toolbar"><strong>Publishing</strong><span className={`admin-badge ${value.status}`}>{value.status}</span></div>
          <button className="admin-button secondary" disabled={pending} name="intent" value="save" type="submit">{pending ? "Saving…" : value.status === "published" ? "Save changes" : "Save draft"}</button>
          <button className="admin-button" disabled={pending} name="intent" value="publish" type="submit">{value.status === "published" ? "Update published post" : "Publish"}</button>
          {value.id ? <a className="admin-button secondary" href={`/admin/posts/${value.id}/preview`} target="_blank">Preview</a> : null}
          <div className="admin-field"><label>Change summary</label><input aria-label="Change summary" value={value.changeSummary} onChange={event => patch("changeSummary", event.target.value)} placeholder="What changed?" /></div>
        </section>
        <section className="admin-card admin-form">
          <strong>Organization</strong>
          <div className="admin-field"><label>Slug</label><div className="admin-actions"><input aria-label="Slug" value={value.slug} onChange={event => patch("slug", slugify(event.target.value))} required /><button className="admin-small-button" type="button" onClick={() => patch("slug", slugify(value.title))}>Generate</button></div></div>
          <div className="admin-field"><label>Category</label><select aria-label="Category" value={value.category} onChange={event => patch("category", event.target.value)}>{categoryOptions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
          <div className="admin-field"><label>Eyebrow</label><input aria-label="Eyebrow" value={value.eyebrow} onChange={event => patch("eyebrow", event.target.value)} /></div>
          <div className="admin-field"><label>Publication date</label><input aria-label="Publication date" type="date" value={value.datePublished} onChange={event => patch("datePublished", event.target.value)} /></div>
        </section>
        <section className="admin-card admin-form">
          <strong>Cover image</strong>
          {value.image ? <div className="admin-media-preview"><Image alt="" fill sizes="330px" src={value.image} style={{ objectFit: "cover", objectPosition: value.imagePosition }} /></div> : null}
          <div className="admin-field"><label>Upload image</label><input accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} type="file" onChange={event => void uploadImage(event.target.files?.[0])} /><span className="admin-help">JPG, PNG, WebP or AVIF, maximum 5 MB.</span></div>
          <div className="admin-field"><label>Image URL</label><input aria-label="Image URL" value={value.image} onChange={event => patch("image", event.target.value)} required /></div>
          <div className="admin-field"><label>Alt text</label><textarea aria-label="Alt text" rows={3} value={value.imageAlt} onChange={event => patch("imageAlt", event.target.value)} required /></div>
          <div className="admin-field"><label>Focal position</label><select aria-label="Focal position" value={value.imagePosition} onChange={event => patch("imagePosition", event.target.value)}><option>center center</option><option>center top</option><option>center bottom</option><option>left center</option><option>right center</option></select></div>
        </section>
        <section className="admin-card admin-form">
          <strong>Search appearance</strong>
          <div className="admin-field"><label>SEO title</label><input aria-label="SEO title" maxLength={70} value={value.metaTitle ?? ""} onChange={event => patch("metaTitle", event.target.value)} /><span className="admin-help">{value.metaTitle?.length ?? 0}/70; aim for 30–60.</span></div>
          <label className="admin-check"><input type="checkbox" checked={value.noindex} onChange={event => patch("noindex", event.target.checked)} /> Prevent search indexing</label>
        </section>
        <section className="admin-card admin-form">
          <strong>Related tools</strong>
          <div className="admin-check-grid">{toolOptions.map(tool => <label className="admin-check" key={tool.id}><input type="checkbox" checked={value.relatedTools.includes(tool.id)} onChange={event => patch("relatedTools", event.target.checked ? [...value.relatedTools, tool.id] : value.relatedTools.filter(id => id !== tool.id))} />{tool.name}</label>)}</div>
        </section>
      </aside>
    </div>
  </form>;
}
