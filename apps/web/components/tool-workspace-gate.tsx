import type { Tool } from "@codeformattools/tool-registry";
import { ToolShellHydrator } from "./tool-shell-hydrator";

/**
 * SSR placeholder while the interactive ToolShell hydrates.
 * Workspace mounts automatically — no extra "Open workspace" click.
 */
export function ToolWorkspaceGate({ tool }: { tool: Tool }) {
  return (
    <div id="tool-workspace-root">
      <section className="tool-workspace container" id="tool-workspace-gate" aria-busy="true">
        <div className="workspace-privacy-bar">
          <span className="privacy-lock" aria-hidden="true">◉</span>
          <span className="privacy-bar-full">Processed in your browser — never uploaded</span>
          <span className="privacy-bar-short">Private · in-browser</span>
        </div>
        <div className="workspace-toolbar">
          <div className="workspace-label">
            <span className="workspace-icon" aria-hidden="true">{`{ }`}</span>
            <span>WORKSPACE</span>
            <span className="workspace-sep">/</span>
            <strong>{tool.name}</strong>
          </div>
        </div>
        <label className="editor-fallback gate-fallback">
          <span className="visually-hidden">{tool.inputLabel}</span>
          <textarea
            id="cft-gate-input"
            className="editor-fallback-textarea"
            placeholder={`Paste ${tool.input.language.toUpperCase()} here…`}
            aria-label={tool.inputLabel}
            readOnly
          />
        </label>
      </section>
      <ToolShellHydrator tool={tool} />
    </div>
  );
}
