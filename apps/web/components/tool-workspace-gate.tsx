import type { Tool } from "@codeformattools/tool-registry";
import { ToolShellHydrator } from "./tool-shell-hydrator";

/**
 * SSR placeholder that already looks like the workspace (dual panes + run chrome).
 * Interactive ToolShell replaces it as soon as the page hydrates — no extra click.
 */
export function ToolWorkspaceGate({ tool }: { tool: Tool }) {
  return (
    <div id="tool-workspace-root">
      <section className="tool-workspace container" id="tool-workspace-gate" aria-busy="true" aria-label={`${tool.name} workspace loading`}>
        <div className="workspace-privacy-bar">
          <span className="privacy-lock" aria-hidden="true">◉</span>
          <span className="privacy-bar-full">Runs in your browser · Never uploaded · Max 5 MB</span>
          <span className="privacy-bar-short">Local · Never uploaded · 5 MB</span>
        </div>
        <div className="workspace-toolbar">
          <div className="workspace-label">
            <span className="workspace-icon" aria-hidden="true">{`{ }`}</span>
            <span>WORKSPACE</span>
            <span className="workspace-sep">/</span>
            <strong>{tool.name}</strong>
          </div>
        </div>
        <div className="editor-grid gate-editor-grid">
          <div className="editor-pane">
            <div className="pane-header">
              <div><span className="pane-dot input-dot" />{tool.inputLabel}</div>
            </div>
            <label className="editor-fallback gate-fallback">
              <span className="visually-hidden">{tool.inputLabel}</span>
              <textarea
                id="cft-gate-input"
                className="editor-fallback-textarea"
                placeholder={`Paste or type ${tool.input.language.toUpperCase()} here…`}
                aria-label={tool.inputLabel}
                readOnly
              />
            </label>
            <div className="pane-footer"><span>Ready for input</span><span>Up to 5 MB</span></div>
          </div>
          <div className="editor-pane output-pane">
            <div className="pane-header">
              <div><span className="pane-dot output-dot" />{tool.outputLabel}</div>
            </div>
            <div className="editor-area">
              <div className="output-empty">
                <span className="empty-symbol" aria-hidden="true">{`{ }`}</span>
                <strong>Your result appears here</strong>
                <small>Loading interactive workspace…</small>
              </div>
            </div>
            <div className="pane-footer"><span>No output yet</span><span>LOCAL PROCESSING</span></div>
          </div>
        </div>
        <div className="workspace-bottom">
          <div className="run-cluster">
            <button type="button" className="button primary gate-run-placeholder" disabled aria-hidden="true">
              {tool.buttonLabel}
            </button>
            <span className="run-shortcut">Ctrl/⌘ + Enter</span>
          </div>
          <div className="status-message idle"><span className="status-dot" />Preparing workspace…</div>
        </div>
      </section>
      <ToolShellHydrator tool={tool} />
    </div>
  );
}
