import type { Tool } from "@codeformattools/tool-registry";
import { ToolShellHydrator } from "./tool-shell-hydrator";

/**
 * Server-rendered gate. First interaction loads deferred Next.js (via the
 * postbuild loader) and flags the hydrator to mount ToolShell as a sibling
 * (never nested under the gate), so hiding the gate cannot hide the shell.
 */
export function ToolWorkspaceGate({ tool }: { tool: Tool }) {
  return (
    <div id="tool-workspace-root">
      <section className="tool-workspace container" id="tool-workspace-gate">
        <div className="workspace-privacy-bar">
          <span className="privacy-lock" aria-hidden="true">🔒</span>
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
          <button type="button" className="button primary" id="cft-open-workspace" data-cft-open-ws>
            Open workspace
          </button>
        </div>
        <label className="editor-fallback gate-fallback">
          <span className="visually-hidden">{tool.inputLabel}</span>
          <textarea
            id="cft-gate-input"
            className="editor-fallback-textarea"
            data-cft-open-ws
            placeholder={`Click or type to open the ${tool.name} workspace…`}
            aria-label={`Open ${tool.name} workspace`}
            readOnly
          />
        </label>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function arm(){try{sessionStorage.setItem("cft:open-ws","1");}catch(e){}window.dispatchEvent(new Event("cft:open-ws"));window.dispatchEvent(new Event("pointerdown"));}document.querySelectorAll("[data-cft-open-ws]").forEach(function(el){el.addEventListener("click",arm);el.addEventListener("focus",arm);});})();`
          }}
        />
      </section>
      <ToolShellHydrator tool={tool} />
    </div>
  );
}
