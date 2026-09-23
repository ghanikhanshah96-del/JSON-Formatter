"use client";

import { useState } from "react";

export const LOAD_EXAMPLE_EVENT = "tool:load-example";

export function ExampleSnippet({ example, language }: { example: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(example);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard may be denied; users can still select the sample. */
    }
  };

  const tryExample = () => {
    window.dispatchEvent(new CustomEvent(LOAD_EXAMPLE_EVENT, { detail: { example } }));
    document.querySelector(".tool-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="example-block">
      <div className="example-actions">
        <button type="button" className="button secondary example-action" onClick={tryExample}>
          Try this example
        </button>
        <button type="button" className="button secondary example-action" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="example-code"><code>{example}</code></pre>
      <p className="example-hint">Loads the sample into the {language.toUpperCase()} workspace above.</p>
    </div>
  );
}
