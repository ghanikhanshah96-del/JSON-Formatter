"use client";

import type { Diagnostic } from "@codeformattools/tool-core";
import { DiagnosticCard } from "./diagnostic-panel";

type Metrics = { durationMs: number; inputBytes: number; outputBytes: number } | null;

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function ValidationReport({
  language,
  ok,
  diagnostics,
  source,
  metrics,
  onFix,
  onJump,
  onCopyReport
}: {
  language: string;
  ok: boolean;
  diagnostics: Diagnostic[];
  source: string;
  metrics: Metrics;
  onFix: (fix: NonNullable<Diagnostic["fix"]>) => void;
  onJump?: (diagnostic: Diagnostic) => void;
  onCopyReport?: () => void;
}) {
  const errors = diagnostics.filter(d => d.severity === "error" || d.severity === "blocked");
  const warnings = diagnostics.filter(d => d.severity === "warning");
  const infos = diagnostics.filter(d => d.severity === "info");
  const primary = errors[0] || warnings[0];
  const label = language.toUpperCase();

  if (ok && !warnings.length) {
    return (
      <div className="result-report valid" role="status">
        <div className="result-report-icon" aria-hidden="true">✓</div>
        <h3>Valid {label}</h3>
        <p>No syntax issues found. Processed locally in your browser.</p>
        <div className="result-report-stats">
          {metrics ? <span>{formatBytes(metrics.inputBytes)}</span> : null}
          {metrics ? <span>{metrics.durationMs} ms</span> : null}
        </div>
        {onCopyReport ? <button type="button" className="button secondary" onClick={onCopyReport}>Copy report</button> : null}
      </div>
    );
  }

  if (ok && warnings.length) {
    return (
      <div className="result-report warn" role="status">
        <div className="result-report-icon" aria-hidden="true">!</div>
        <h3>Valid {label} with warnings</h3>
        <p>{warnings.length} warning{warnings.length === 1 ? "" : "s"} — the document is syntactically valid.</p>
        <div className="result-report-stats">
          {metrics ? <span>{formatBytes(metrics.inputBytes)}</span> : null}
          {metrics ? <span>{metrics.durationMs} ms</span> : null}
        </div>
        <div className="result-report-list">
          {warnings.map((d, i) => (
            <DiagnosticCard key={`w-${i}`} source={source} diagnostic={d} onFix={onFix} onJump={onJump} />
          ))}
        </div>
      </div>
    );
  }

  const blocked = primary?.severity === "blocked";
  return (
    <div className={`result-report ${blocked ? "blocked" : "invalid"}`} role="alert">
      <div className="result-report-icon" aria-hidden="true">{blocked ? "▣" : "✕"}</div>
      <h3>{blocked ? `${label} formatting blocked` : `Invalid ${label}`}</h3>
      <p>{blocked ? "This input cannot be reformatted under the current safety policy." : "Validation found problems. Fix them in the input, then run again."}</p>
      {primary ? (
        <DiagnosticCard source={source} diagnostic={primary} onFix={onFix} onJump={onJump} primary />
      ) : null}
      {errors.length > 1 || infos.length ? (
        <div className="result-report-list">
          {errors.slice(1).concat(infos).map((d, i) => (
            <DiagnosticCard key={`e-${i}`} source={source} diagnostic={d} onFix={onFix} onJump={onJump} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TransformErrorReport({
  toolLabel,
  diagnostics,
  source,
  onFix,
  onJump
}: {
  toolLabel: string;
  diagnostics: Diagnostic[];
  source: string;
  onFix: (fix: NonNullable<Diagnostic["fix"]>) => void;
  onJump?: (diagnostic: Diagnostic) => void;
}) {
  const primary = diagnostics.find(d => d.severity === "error" || d.severity === "blocked") || diagnostics[0];
  if (!primary) return null;
  const commentsBlocked = primary.code === "YAML_COMMENT_PRESERVATION_LIMIT";
  return (
    <div className={`result-report ${primary.severity === "blocked" ? "blocked" : "invalid"}`} role="alert">
      <div className="result-report-icon" aria-hidden="true">{primary.severity === "blocked" ? "▣" : "✕"}</div>
      <h3>{commentsBlocked ? "Comments detected" : `${toolLabel} could not finish`}</h3>
      <p>
        {commentsBlocked
          ? "Formatting this file could remove YAML comments. We have left your file unchanged."
          : "Review the issue below, fix the input or options, then run again."}
      </p>
      <DiagnosticCard source={source} diagnostic={primary} onFix={onFix} onJump={onJump} primary />
      {commentsBlocked ? (
        <div className="diagnostic-card-actions" style={{ marginTop: 12 }}>
          <a className="diagnostic-action" href="/yaml-validator">Validate instead</a>
        </div>
      ) : null}
      {diagnostics.length > 1 ? (
        <div className="result-report-list">
          {diagnostics.slice(1).map((d, i) => (
            <DiagnosticCard key={`t-${i}`} source={source} diagnostic={d} onFix={onFix} onJump={onJump} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
