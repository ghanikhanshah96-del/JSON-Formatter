"use client";

import type { Diagnostic } from "@codeformattools/tool-core";
import { diagnosticTitle } from "@codeformattools/tool-core";

function excerpt(source: string, offset: number) {
  const lineStart = source.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
  const nextLine = source.indexOf("\n", offset);
  const lineEnd = nextLine === -1 ? source.length : nextLine;
  const visibleStart = Math.max(lineStart, offset - 60);
  const visibleEnd = Math.min(lineEnd, offset + 80);
  const text = `${visibleStart > lineStart ? "…" : ""}${source.slice(visibleStart, visibleEnd)}${visibleEnd < lineEnd ? "…" : ""}`;
  const caret = Math.max(0, offset - visibleStart) + (visibleStart > lineStart ? 1 : 0);
  return { text, caret };
}

function locationLabel(diagnostic: Diagnostic): string | null {
  if (!diagnostic.line) return null;
  return `Line ${diagnostic.line}${diagnostic.column ? `, column ${diagnostic.column}` : ""}`;
}

export function DiagnosticCard({
  source,
  diagnostic,
  onFix,
  onJump,
  primary = false
}: {
  source: string;
  diagnostic: Diagnostic;
  onFix?: (fix: NonNullable<Diagnostic["fix"]>) => void;
  onJump?: (diagnostic: Diagnostic) => void;
  primary?: boolean;
}) {
  const context = diagnostic.startOffset === undefined ? null : excerpt(source, diagnostic.startOffset);
  const loc = locationLabel(diagnostic);
  const title = diagnosticTitle(diagnostic);
  const badge =
    diagnostic.severity === "blocked" ? "Blocked" :
    diagnostic.severity === "warning" ? "Warning" :
    diagnostic.severity === "info" ? "Info" :
    "Error";

  return (
    <div className={`diagnostic-card ${diagnostic.severity}${primary ? " primary" : ""}`}>
      <div className="diagnostic-card-top">
        <span className={`diagnostic-badge ${diagnostic.severity}`}>{badge}</span>
        <strong className="diagnostic-card-title">{title}</strong>
      </div>
      <p className="diagnostic-card-message">{diagnostic.message}{loc ? ` — ${loc}` : ""}</p>
      {context && (
        <pre className="diagnostic-excerpt">
          <code>
            {context.text}
            {"\n"}
            {" ".repeat(context.caret)}^
          </code>
        </pre>
      )}
      {diagnostic.suggestion ? <p className="diagnostic-card-suggestion"><span>How to fix:</span> {diagnostic.suggestion}</p> : null}
      <div className="diagnostic-card-actions">
        {diagnostic.startOffset !== undefined && onJump ? (
          <button type="button" className="diagnostic-action" onClick={() => onJump(diagnostic)}>Jump to location</button>
        ) : null}
        {diagnostic.fix && onFix ? (
          <button type="button" className="diagnostic-fix" onClick={() => onFix(diagnostic.fix!)}>{diagnostic.fix.label}</button>
        ) : null}
      </div>
    </div>
  );
}

export function DiagnosticPanel({
  source,
  diagnostics,
  onFix,
  onJump
}: {
  source: string;
  diagnostics: Diagnostic[];
  onFix: (fix: NonNullable<Diagnostic["fix"]>) => void;
  onJump?: (diagnostic: Diagnostic) => void;
}) {
  if (!diagnostics.length) return null;
  return (
    <div className="diagnostics" aria-label="Diagnostics">
      {diagnostics.map((diagnostic, index) => (
        <DiagnosticCard
          key={`${diagnostic.code}-${index}`}
          source={source}
          diagnostic={diagnostic}
          onFix={onFix}
          onJump={onJump}
        />
      ))}
    </div>
  );
}
