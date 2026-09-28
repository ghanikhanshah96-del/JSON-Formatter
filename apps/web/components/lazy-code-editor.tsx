"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { Diagnostic, EditorLanguage } from "@codeformattools/tool-core";

type Props = {
  value: string;
  language: EditorLanguage;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  diagnostics?: Diagnostic[];
  label: string;
  placeholder?: string;
};

const LazyEditor = dynamic(
  () => import("@codeformattools/editor").then(mod => mod.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="editor-skeleton" role="status" aria-live="polite">
        Loading editor…
      </div>
    )
  }
);

/** Defer CodeMirror until there is content or an explicit click (not focus alone). */
export function LazyCodeEditor(props: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const activate = useCallback(() => setUnlocked(true), []);
  const active = unlocked || Boolean(props.value);

  if (!active) {
    return (
      <label className="editor-fallback">
        <span className="visually-hidden">{props.label}</span>
        <textarea
          className="editor-fallback-textarea"
          value={props.value}
          readOnly={props.readOnly}
          placeholder={props.placeholder || (props.readOnly ? "Formatted output appears here" : "Paste or type here…")}
          aria-label={props.label}
          onClick={props.readOnly ? undefined : activate}
          onChange={e => {
            props.onChange?.(e.target.value);
          }}
        />
      </label>
    );
  }

  return <LazyEditor {...props} />;
}
