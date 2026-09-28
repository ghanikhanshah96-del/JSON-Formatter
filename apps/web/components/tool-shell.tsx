"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Tool } from "@codeformattools/tool-registry";
import { MAX_EDITOR_INPUT_BYTES, MAX_EDITOR_INPUT_LABEL, diagnosticTitle, type Diagnostic, type ToolOptions, type WorkerRequest, type WorkerResponse } from "@codeformattools/tool-core";
import { inputSizeBucket, track } from "@codeformattools/analytics";
import { LazyCodeEditor } from "./lazy-code-editor";
import { migratedStorageValue, setStorageValue } from "@/lib/browser-storage";
import { downloadMime } from "@/lib/download-mime";
import { DiagnosticPanel } from "./diagnostic-panel";
import { TransformErrorReport, ValidationReport } from "./result-report";
import { LOAD_EXAMPLE_EVENT, PENDING_EXAMPLE_KEY } from "./example-snippet";
import { ThemeSelect } from "./theme-select";

const GUARD_LIMIT_BYTES = 1 * 1024 * 1024;
const MAX_PROCESSING_MS = 30_000;
const encoder = new TextEncoder();
type Status = "idle" | "ready" | "working" | "guarded" | "success" | "error" | "blocked";

function defaults(tool: Tool): ToolOptions {
  return Object.fromEntries(tool.options.map(option => [option.id, option.defaultValue]));
}

function statusForInput(text: string): Status {
  if (!text.trim()) return "idle";
  return encoder.encode(text).length > GUARD_LIMIT_BYTES ? "guarded" : "ready";
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function tooLargeDiagnostic(size: number): Diagnostic {
  return {
    severity: "error",
    code: "INPUT_TOO_LARGE",
    title: "Input too large",
    category: "limit",
    message: `This file is about ${formatBytes(size)}. The editor can process up to ${MAX_EDITOR_INPUT_LABEL} in your browser.`,
    suggestion: `Try a smaller file, minify first, or split the document. Files over ${MAX_EDITOR_INPUT_LABEL} can freeze the tab because everything runs locally.`
  };
}

function statusFromResult(ok: boolean, diagnostics: Diagnostic[]): Status {
  if (ok) return "success";
  if (diagnostics.some(d => d.severity === "blocked")) return "blocked";
  return "error";
}

export function ToolShell({ tool }: { tool: Tool }) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [options, setOptions] = useState<ToolOptions>(() => defaults(tool));
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [metrics, setMetrics] = useState<WorkerResponse["metrics"] | null>(null);
  const [hasResult, setHasResult] = useState(false);
  const [revealOffset, setRevealOffset] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const requestRef = useRef(0);
  const inputRef = useRef(input);
  const fileRef = useRef<HTMLInputElement>(null);
  const isValidate = tool.action === "validate";

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  const clearProcessingTimeout = useCallback(() => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);
  const stopWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    clearProcessingTimeout();
  }, [clearProcessingTimeout]);
  const workerError = useCallback((inputSize?: ReturnType<typeof inputSizeBucket>) => {
    stopWorker();
    setStatus("error");
    setHasResult(true);
    setDiagnostics([{ severity: "error", code: "WORKER_ERROR", title: "Worker failed", message: "The browser worker could not process this input. Try again or use a smaller input.", suggestion: "Reload the page and retry with a smaller input if the problem continues." }]);
    track({ name: "tool_error", tool: tool.id, action: tool.action, code: "worker_error", inputSize });
  }, [stopWorker, tool]);
  const getWorker = useCallback((inputSize?: ReturnType<typeof inputSizeBucket>) => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("../workers/tool.worker.ts", import.meta.url));
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.requestId !== String(requestRef.current)) return;
      clearProcessingTimeout();
      setOutput(event.data.output);
      setDiagnostics(event.data.diagnostics);
      setMetrics(event.data.metrics);
      setHasResult(true);
      setStatus(statusFromResult(event.data.ok, event.data.diagnostics));
      track({ name: "tool_execution", tool: tool.id, action: tool.action, success: event.data.ok, inputSize: inputSizeBucket(event.data.metrics.inputBytes), durationMs: event.data.metrics.durationMs });
    };
    worker.onerror = () => {
      if (!workerRef.current) return;
      workerError(inputSize);
    };
    workerRef.current = worker;
    return worker;
  }, [clearProcessingTimeout, tool, workerError]);

  useEffect(() => {
    const values = defaults(tool);
    for (const option of tool.options) {
      const saved = migratedStorageValue(`option.${tool.id}.${option.id}`, value => Boolean(option.choices?.some(item => String(item.value) === value)) || (option.type === "checkbox" && (value === "true" || value === "false")));
      const choice = option.choices?.find(item => String(item.value) === saved);
      if (choice) values[option.id] = choice.value;
      if (option.type === "checkbox" && (saved === "true" || saved === "false")) values[option.id] = saved === "true";
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptions(values);
    setPreferencesReady(true);
  }, [tool]);
  useEffect(() => {
    if (!preferencesReady) return;
    for (const option of tool.options) setStorageValue(`option.${tool.id}.${option.id}`, String(options[option.id] ?? option.defaultValue));
  }, [options, preferencesReady, tool]);
  useEffect(() => () => { stopWorker(); }, [stopWorker]);

  const processInput = useCallback((source: string) => {
    clearProcessingTimeout();
    const requestId = String(++requestRef.current);
    setCopied(false);
    setRevealOffset(null);
    if (!source.trim()) { setOutput(""); setDiagnostics([]); setStatus("idle"); setMetrics(null); setHasResult(false); return; }
    const inputBytes = encoder.encode(source).length;
    const inputSize = inputSizeBucket(inputBytes);
    if (inputBytes > MAX_EDITOR_INPUT_BYTES) {
      setOutput(""); setStatus("error"); setMetrics(null); setHasResult(true);
      setDiagnostics([tooLargeDiagnostic(inputBytes)]);
      track({ name: "tool_error", tool: tool.id, action: tool.action, code: "input_too_large", inputSize });
      return;
    }
    setStatus("working");
    track({ name: "tool_start", tool: tool.id, action: tool.action, inputSize });
    const worker = getWorker(inputSize);
    timeoutRef.current = window.setTimeout(() => {
      if (requestId !== String(requestRef.current)) return;
      stopWorker();
      setStatus("error");
      setHasResult(true);
      setDiagnostics([{ severity: "error", code: "PROCESSING_TIMEOUT", title: "Processing timed out", message: "Processing took too long. Try a smaller input, or minify before formatting.", suggestion: "Reduce input size or minify nested data before formatting." }]);
      track({ name: "tool_error", tool: tool.id, action: tool.action, code: "processing_timeout", inputSize });
    }, MAX_PROCESSING_MS);
    const request: WorkerRequest = { requestId, tool: tool.id, engine: tool.engine, action: tool.action, input: source, options };
    try { worker.postMessage(request); }
    catch { workerError(inputSize); }
  }, [clearProcessingTimeout, getWorker, options, stopWorker, tool, workerError]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && input.trim()) { event.preventDefault(); processInput(input); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [input, processInput]);
  useEffect(() => {
    const applyExample = (text: string) => {
      ++requestRef.current;
      clearProcessingTimeout();
      setInput(text);
      setOutput("");
      setMetrics(null);
      setDiagnostics([]);
      setHasResult(false);
      setRevealOffset(null);
      setStatus(statusForInput(text));
    };
    try {
      const pending = sessionStorage.getItem(PENDING_EXAMPLE_KEY);
      if (pending) {
        sessionStorage.removeItem(PENDING_EXAMPLE_KEY);
        applyExample(pending);
      }
    } catch {
      /* ignore */
    }
    const onLoadExample = (event: Event) => {
      const detail = (event as CustomEvent<{ example?: string }>).detail;
      if (typeof detail?.example !== "string") return;
      applyExample(detail.example);
    };
    window.addEventListener(LOAD_EXAMPLE_EVENT, onLoadExample);
    return () => window.removeEventListener(LOAD_EXAMPLE_EVENT, onLoadExample);
  }, [clearProcessingTimeout]);

  const onInput = (text: string) => {
    if (text === inputRef.current) return;
    const grew = text.length > inputRef.current.length + 20 || (inputRef.current.length === 0 && text.length > 0);
    ++requestRef.current;
    clearProcessingTimeout();
    inputRef.current = text;
    setInput(text);
    setOutput("");
    setMetrics(null);
    setDiagnostics([]);
    setHasResult(false);
    setRevealOffset(null);
    setStatus(statusForInput(text));
    if (grew && text.trim()) track({ name: "tool_paste", tool: tool.id, inputSize: inputSizeBucket(encoder.encode(text).length) });
  };
  const onFile = async (file?: File) => {
    if (!file) return;
    const selectionId = ++requestRef.current;
    clearProcessingTimeout();
    if (file.size > MAX_EDITOR_INPUT_BYTES) {
      setInput("");
      setOutput("");
      setMetrics(null);
      setStatus("error");
      setHasResult(true);
      setDiagnostics([tooLargeDiagnostic(file.size)]);
      track({ name: "tool_error", tool: tool.id, action: tool.action, code: "input_too_large", inputSize: inputSizeBucket(file.size) });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const text = await file.text();
    if (selectionId === requestRef.current) onInput(text);
  };
  const updateOption = (id: string, value: string | number | boolean) => {
    ++requestRef.current; clearProcessingTimeout(); setOutput(""); setMetrics(null); setDiagnostics([]);
    setHasResult(false); setRevealOffset(null);
    setStatus(statusForInput(input));
    setStorageValue(`option.${tool.id}.${id}`, String(value));
    setOptions(current => ({ ...current, [id]: value }));
  };

  const buildValidateReportText = () => {
    const lang = tool.input.language.toUpperCase();
    if (status === "success" && !diagnostics.some(d => d.severity === "warning")) {
      return `Valid ${lang}\n${metrics ? `${formatBytes(metrics.inputBytes)} · ${metrics.durationMs} ms` : ""}`.trim();
    }
    return diagnostics.map(d => {
      const loc = d.line ? ` (line ${d.line}${d.column ? `, col ${d.column}` : ""})` : "";
      return `[${d.severity}] ${diagnosticTitle(d)}${loc}\n${d.message}${d.suggestion ? `\nFix: ${d.suggestion}` : ""}`;
    }).join("\n\n");
  };

  const copy = async () => {
    const text = isValidate ? buildValidateReportText() : output;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      track({ name: "tool_copy", tool: tool.id, action: tool.action });
      window.setTimeout(() => setCopied(false), 2000);
    }
    catch { setDiagnostics([{ severity: "error", code: "COPY_FAILED", title: "Copy failed", message: "Clipboard access was denied. Select and copy the result manually.", suggestion: "Allow clipboard permission or select the text manually." }]); }
  };
  const download = () => {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: downloadMime(tool.output.language) }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${tool.slug}${tool.output.extension}`; anchor.click();
    track({ name: "tool_download", tool: tool.id, action: tool.action });
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const reset = () => {
    ++requestRef.current; clearProcessingTimeout(); setInput(""); setOutput(""); setDiagnostics([]); setStatus("idle"); setMetrics(null); setHasResult(false); setRevealOffset(null);
    if (fileRef.current) fileRef.current.value = "";
  };
  const applyFix = (fix: NonNullable<Diagnostic["fix"]>) => {
    const next = `${input.slice(0, fix.startOffset)}${fix.replacement}${input.slice(fix.endOffset)}`;
    inputRef.current = next;
    setInput(next);
    setOutput("");
    setMetrics(null);
    setDiagnostics([]);
    setHasResult(false);
    processInput(next);
  };
  const onJump = (diagnostic: Diagnostic) => {
    if (diagnostic.startOffset === undefined) return;
    setRevealOffset(diagnostic.startOffset);
  };

  const visibleOptions = tool.options.filter(option => !option.actions || option.actions.includes(tool.action));
  const primaryDiagnostic = diagnostics.find(d => d.severity === "error" || d.severity === "blocked") || diagnostics[0];
  const statusText =
    status === "idle" ? "Ready when you are" :
    status === "ready" ? "Ready — click the button to run" :
    status === "guarded" ? "Large input — click the button to run" :
    status === "working" ? "Processing in your browser…" :
    status === "blocked" ? (primaryDiagnostic ? `${diagnosticTitle(primaryDiagnostic)}${primaryDiagnostic.line ? ` (line ${primaryDiagnostic.line})` : ""}` : "Blocked by policy") :
    status === "error" ? (primaryDiagnostic ? `Invalid — ${diagnosticTitle(primaryDiagnostic)}${primaryDiagnostic.line ? ` (line ${primaryDiagnostic.line})` : ""}` : "Needs attention") :
    diagnostics.some(d => d.severity === "warning") ? (isValidate ? "Valid with warnings" : "Completed with warnings") :
    isValidate ? "Valid input" : "Done — processed locally";

  const runIcon = isValidate ? "✓" : "▶";
  const showWorkingOverlay = status === "working";
  const showPreRunEmpty = !hasResult && !showWorkingOverlay && !output;
  const showValidateReport = isValidate && hasResult && !showWorkingOverlay;
  const showTransformError = !isValidate && hasResult && !output && (status === "error" || status === "blocked") && !showWorkingOverlay;
  const showOutputEditor = !isValidate && Boolean(output) && !showWorkingOverlay;
  const canCopy = isValidate ? hasResult && status !== "working" : Boolean(output);
  const byteDelta = metrics && metrics.outputBytes > 0
    ? `${formatBytes(metrics.inputBytes)} → ${formatBytes(metrics.outputBytes)}`
    : metrics ? formatBytes(metrics.inputBytes) : null;

  const modeHint = visibleOptions.find(o => o.id === "mode");

  return <section className="tool-workspace container" aria-label={`${tool.name} application`}>
    <div className="workspace-privacy-bar" aria-label="Runs in your browser. Never uploaded.">
      <span className="privacy-lock" aria-hidden="true">◉</span>
      <span className="privacy-bar-full">Runs in your browser · Never uploaded · Max {MAX_EDITOR_INPUT_LABEL}</span>
      <span className="privacy-bar-short">Local · Never uploaded · {MAX_EDITOR_INPUT_LABEL}</span>
    </div>
    <div className="workspace-toolbar">
      <div className="workspace-label"><span className="workspace-icon">{`{ }`}</span><span>WORKSPACE</span><span className="workspace-sep">/</span><strong>{tool.name}</strong></div>
      <div className="toolbar-options">
      {visibleOptions.map(option => (
        option.type === "checkbox" ? (
          <label className="tool-option" key={option.id} htmlFor={`option-${option.id}`}>
            <span className="tool-option-label">{option.label}</span>
            <input id={`option-${option.id}`} type="checkbox" checked={Boolean(options[option.id])} onChange={e => updateOption(option.id, e.target.checked)} />
          </label>
        ) : (
          <ThemeSelect
            key={option.id}
            id={`option-${option.id}`}
            label={option.label}
            value={options[option.id] ?? option.defaultValue}
            choices={option.choices ?? []}
            busy={status === "working"}
            onChange={next => updateOption(option.id, next)}
          />
        )
      ))}
      <button type="button" className="button secondary reset-button" onClick={reset} disabled={!input} aria-label="Reset workspace">Reset ↺</button>
    </div></div>
    {modeHint ? (
      <p className="workspace-mode-hint">
        {String(options.mode) === "lossless" && (tool.id.includes("xml")
          ? "Lossless uses a reversible envelope so attributes, comments, CDATA, and order can round-trip."
          : tool.category === "csv"
            ? "Lossless keeps every cell as text — no type inference."
            : "Lossless rejects conversions that would drop or reshape data.")}
        {String(options.mode) === "best-effort" && (tool.id.includes("xml")
          ? "Best effort produces a developer-friendly mapping; attributes, mixed content, and comments may be simplified."
          : "Best effort converts with warnings when some structure cannot map cleanly.")}
        {String(options.mode) === "compatibility" && "Compatibility prefers spreadsheet-friendly cells (nested values may become JSON text)."}
      </p>
    ) : null}
    <div className="editor-grid"><div className="editor-pane"><div className="pane-header"><div><span className="pane-dot input-dot" />{tool.inputLabel}</div><div className="pane-actions"><input ref={fileRef} type="file" accept={tool.input.extensions.join(",")} hidden onChange={e => onFile(e.target.files?.[0])} /><button type="button" onClick={() => fileRef.current?.click()}>↑ Open file</button></div></div><div className="editor-area"><LazyCodeEditor value={input} language={tool.input.language} onChange={onInput} diagnostics={diagnostics} label={tool.inputLabel} placeholder={`Paste or type ${tool.input.language.toUpperCase()} here...`} revealOffset={revealOffset} /></div><div className="pane-footer"><span>{input ? `${encoder.encode(input).length.toLocaleString()} bytes` : "Ready for input"}</span><span>Up to {MAX_EDITOR_INPUT_LABEL}</span></div></div>
      <div className="editor-pane output-pane"><div className="pane-header"><div><span className="pane-dot output-dot" />{tool.outputLabel}</div><div className="pane-actions"><button type="button" disabled={!canCopy} onClick={copy}>{copied ? "✓ Copied" : "▢ Copy"}</button><button type="button" disabled={!output} onClick={download}>↓ Download</button></div></div><div className="editor-area">
        {showOutputEditor ? <LazyCodeEditor value={output} language={tool.output.language} readOnly label={tool.outputLabel} /> : null}
        {showWorkingOverlay && (
          <div className="output-empty output-loading" role="status" aria-live="polite">
            <span className="loading-spinner" aria-hidden="true" />
            <strong>Updating result…</strong>
            <small>Processing in this browser — nothing is uploaded</small>
          </div>
        )}
        {showPreRunEmpty && (
          <div className="output-empty">
            <span className="empty-symbol">{`{ }`}</span>
            <strong>Your result appears here</strong>
            <small>{input.trim() ? `Click “${tool.buttonLabel}” below to process` : "Enter data, then click the action button"}</small>
          </div>
        )}
        {showValidateReport && (
          <ValidationReport
            language={tool.input.language}
            ok={status === "success"}
            diagnostics={diagnostics}
            source={input}
            metrics={metrics}
            onFix={applyFix}
            onJump={onJump}
            onCopyReport={copy}
          />
        )}
        {showTransformError && (
          <TransformErrorReport
            toolLabel={tool.name}
            diagnostics={diagnostics}
            source={input}
            onFix={applyFix}
            onJump={onJump}
          />
        )}
      </div><div className="pane-footer"><span>{output ? `${encoder.encode(output).length.toLocaleString()} bytes` : showWorkingOverlay ? "Working…" : showValidateReport ? (status === "success" ? "Report ready" : "Issues found") : showTransformError ? "No output" : "No output yet"}</span><span>{metrics ? `${metrics.durationMs} ms${byteDelta && output ? ` · ${byteDelta}` : ""}` : "LOCAL PROCESSING"}</span></div></div></div>
    <div className="workspace-bottom">
      <div className="run-cluster">
        <button type="button" className="button primary run-button" onClick={() => processInput(input)} disabled={!input.trim() || status === "working"}>
          {status === "working" ? "Processing…" : tool.buttonLabel}
          <span aria-hidden="true">{runIcon}</span>
        </button>
        <span className="run-shortcut" title="Keyboard shortcut">Ctrl/⌘ + Enter</span>
      </div>
      <div className={`status-message ${status}`} role="status" aria-live="polite"><span className="status-dot" />{statusText}</div>
      <span className="workspace-privacy">Private by design · Runs locally · Never uploaded · Max {MAX_EDITOR_INPUT_LABEL}</span>
    </div>
    {!isValidate && diagnostics.length > 0 && !(status === "error" || status === "blocked") ? (
      <DiagnosticPanel source={input} diagnostics={diagnostics} onFix={applyFix} onJump={onJump} />
    ) : null}
    {!isValidate && (status === "error" || status === "blocked") && diagnostics.length > 1 ? (
      <DiagnosticPanel source={input} diagnostics={diagnostics.slice(1)} onFix={applyFix} onJump={onJump} />
    ) : null}
  </section>;
}
