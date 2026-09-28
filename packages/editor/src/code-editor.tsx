"use client";
import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { Compartment, EditorState } from "@codemirror/state";
import { placeholder as cmPlaceholder } from "@codemirror/view";
import { lintGutter, setDiagnostics, type Diagnostic as CmDiagnostic } from "@codemirror/lint";
import type { Diagnostic, EditorLanguage } from "@codeformattools/tool-core";

type Props = {
  value: string;
  language: EditorLanguage;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  diagnostics?: Diagnostic[];
  label: string;
  placeholder?: string;
  /** When this number changes, scroll/select that offset in the document. */
  revealOffset?: number | null;
};

async function languageExtension(language: EditorLanguage) {
  switch (language) {
    case "json": return (await import("@codemirror/lang-json")).json();
    case "sql": return (await import("@codemirror/lang-sql")).sql();
    case "yaml": return (await import("@codemirror/lang-yaml")).yaml();
    case "xml": return (await import("@codemirror/lang-xml")).xml();
    default: return [];
  }
}

export function CodeEditor({ value, language, onChange, readOnly = false, diagnostics = [], label, placeholder, revealOffset = null }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const languageSlot = useRef(new Compartment());
  const initialValue = useRef(value);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!host.current) return;
    const extensions = [
      basicSetup,
      languageSlot.current.of([]),
      EditorView.theme({
        "&": { height: "100%", backgroundColor: "transparent", color: "var(--editor-text)", fontSize: "13px" },
        ".cm-content": { padding: "16px 0", fontFamily: "var(--font-mono)", lineHeight: "1.7", caretColor: "var(--syntax-caret)" },
        ".cm-line": { padding: "0 12px 0 6px" },
        ".cm-gutters": { backgroundColor: "transparent", color: "var(--syntax-gutter)", border: "none", padding: "0 8px 0 12px", minWidth: "2.5em" },
        ".cm-gutterElement": { padding: "0 4px 0 0", minWidth: "2ch" },
        ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "var(--syntax-line-active)" },
        ".cm-cursor": { borderLeftColor: "var(--syntax-caret)" },
        ".cm-selectionBackground": { backgroundColor: "var(--syntax-selection) !important" },
        "&.cm-focused .cm-selectionBackground": { backgroundColor: "var(--syntax-selection) !important" },
        ".cm-content ::selection": { backgroundColor: "var(--syntax-selection)", color: "var(--syntax-selection-fg)" },
        ".cm-line ::selection": { backgroundColor: "var(--syntax-selection)", color: "var(--syntax-selection-fg)" },
        ".cm-selectionMatch": { backgroundColor: "color-mix(in srgb, var(--primary) 28%, transparent)" },
        ".cm-tooltip": { backgroundColor: "var(--editor-chrome)", color: "var(--editor-text)", border: "1px solid var(--editor-border)" },
        ".cm-lint-marker": { width: "0.8em" },
        ".cm-placeholder": { color: "var(--editor-muted)", fontStyle: "normal", fontFamily: "var(--font-mono)" },
        ".tok-propertyName, .ͼq": { color: "var(--syntax-key)" },
        ".tok-string, .ͼu": { color: "var(--syntax-string)" },
        ".tok-number, .ͼv": { color: "var(--syntax-number)" },
        ".tok-bool, .tok-keyword, .ͼt": { color: "var(--syntax-boolean)" },
        ".tok-null, .tok-atom": { color: "var(--syntax-null)" },
        ".tok-comment": { color: "var(--syntax-comment)" },
        ".tok-punctuation, .tok-separator, .tok-bracket": { color: "var(--syntax-punctuation)" }
      }),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ "aria-label": label }),
      EditorView.updateListener.of(update => { if (update.docChanged) onChangeRef.current?.(update.state.doc.toString()); }),
      EditorState.readOnly.of(readOnly),
      EditorView.editable.of(!readOnly),
      lintGutter(),
      ...(!readOnly && placeholder ? [cmPlaceholder(placeholder)] : [])
    ];
    const editor = new EditorView({ state: EditorState.create({ doc: initialValue.current, extensions }), parent: host.current });
    view.current = editor;
    return () => { editor.destroy(); view.current = null; };
  }, [label, placeholder, readOnly]);

  useEffect(() => {
    let active = true;
    languageExtension(language).then(extension => {
      if (active && view.current) view.current.dispatch({ effects: languageSlot.current.reconfigure(extension) });
    });
    return () => { active = false; };
  }, [language, readOnly]);

  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    const marks: CmDiagnostic[] = diagnostics.filter(d => d.startOffset !== undefined).map(d => ({
      from: Math.min(d.startOffset!, editor.state.doc.length),
      to: Math.min(Math.max(d.endOffset ?? d.startOffset! + 1, d.startOffset! + 1), editor.state.doc.length),
      severity: d.severity === "blocked" ? "error" : d.severity === "info" ? "info" : d.severity,
      message: d.message
    }));
    editor.dispatch(setDiagnostics(editor.state, marks));
  }, [diagnostics, value]);

  useEffect(() => {
    const editor = view.current;
    if (!editor || revealOffset == null || revealOffset < 0) return;
    const pos = Math.min(revealOffset, editor.state.doc.length);
    editor.focus();
    editor.dispatch({
      selection: { anchor: pos, head: Math.min(pos + 1, editor.state.doc.length) },
      effects: EditorView.scrollIntoView(pos, { y: "center" })
    });
  }, [revealOffset]);

  return <div className="editor-host" ref={host} aria-label={label} />;
}
