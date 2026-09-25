"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Tool } from "@codeformattools/tool-registry";
import { MAX_EDITOR_INPUT_BYTES, MAX_EDITOR_INPUT_LABEL, type Diagnostic, type ToolOptions, type WorkerRequest, type WorkerResponse } from "@codeformattools/tool-core";
import { inputSizeBucket, track } from "@codeformattools/analytics";
import { CodeEditor } from "@codeformattools/editor";
import { migratedStorageValue, setStorageValue } from "@/lib/browser-storage";
import { downloadMime } from "@/lib/download-mime";
import { DiagnosticPanel } from "./diagnostic-panel";
import { LOAD_EXAMPLE_EVENT } from "./example-snippet";
import { ThemeSelect } from "./theme-select";

const AUTO_LIMIT_BYTES = 1 * 1024 * 1024;
const SMALL_INPUT_BYTES = 100 * 1024;
const MAX_PROCESSING_MS = 30_000;
const encoder = new TextEncoder();
type Status = "idle" | "working" | "guarded" | "success" | "error";

function defaults(tool: Tool): ToolOptions {
  return Object.fromEntries(tool.options.map(option => [option.id, option.defaultValue]));
}

function statusForInput(text: string): Status {
  if (!text.trim()) return "idle";
  return encoder.encode(text).length > AUTO_LIMIT_BYTES ? "guarded" : "working";
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
    message: `This file is about ${formatBytes(size)}. The editor can process up to ${MAX_EDITOR_INPUT_LABEL} in your browser.`,
    suggestion: `Try a smaller file, minify first, or split the document. Files over ${MAX_EDITOR_INPUT_LABEL} can freeze the tab because everything runs locally.`
  };
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
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const autoTimerRef = useRef<number | null>(null);
  const requestRef = useRef(0);
  const inputRef = useRef(input);
  const fileRef = useRef<HTMLInputElement>(null);
  inputRef.current = input;

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
    setDiagnostics([{ severity: "error", code: "WORKER_ERROR", message: "The browser worker could not process this input. Try again or use a smaller input." }]);
    track({ name: "tool_error", tool: tool.id, action: tool.action, code: "worker_error", inputSize });
  }, [stopWorker, tool]);
  const getWorker = useCallback((inputSize?: ReturnType<typeof inputSizeBucket>) => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("../workers/tool.worker.ts", import.meta.url));
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.requestId !== String(requestRef.current)) return;
      clearProcessingTimeout();
      setOutput(event.data.output); setDiagnostics(event.data.diagnostics); setMetrics(event.data.metrics);
      setStatus(event.data.ok ? "success" : "error");
      track({ name: "tool_execution", tool: tool.id, action: tool.action, success: event.data.ok, inputSize: inputSizeBucket(event.data.metrics.inputBytes), durationMs: event.data.metrics.durationMs });
    };
    worker.onerror = () => {
      if (!workerRef.current) return;
      workerError(inputSize);
    };
    workerRef.current = worker;
    return worker;
  }, [clearProcessingTimeout, tool, workerError]);
  const stopAutoTimer = useCallback(() => {
    if (autoTimerRef.current !== null) window.clearTimeout(autoTimerRef.current);
    autoTimerRef.current = null;
  }, []);

  useEffect(() => {
    const values = defaults(tool);
    for (const option of tool.options) {
      const saved = migratedStorageValue(`option.${tool.id}.${option.id}`, value => Boolean(option.choices?.some(item => String(item.value) === value)) || (option.type === "checkbox" && (value === "true" || value === "false")));
      const choice = option.choices?.find(item => String(item.value) === saved);
      if (choice) values[option.id] = choice.value;
      if (option.type === "checkbox" && (saved === "true" || saved === "false")) values[option.id] = saved === "true";
    }
    // Restore safe, primitive preferences after server rendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptions(values);
    setPreferencesReady(true);
  }, [tool]);
  useEffect(() => {
    if (!preferencesReady) return;
    for (const option of tool.options) setStorageValue(`option.${tool.id}.${option.id}`, String(options[option.id] ?? option.defaultValue));
  }, [options, preferencesReady, tool]);
  useEffect(() => () => { stopWorker(); stopAutoTimer(); }, [stopWorker, stopAutoTimer]);

  const processInput = useCallback((source: string) => {
    stopAutoTimer();
    clearProcessingTimeout();
    const requestId = String(++requestRef.current);
    setCopied(false);
    if (!source.trim()) { setOutput(""); setDiagnostics([]); setStatus("idle"); setMetrics(null); return; }
    const inputBytes = encoder.encode(source).length;
    const inputSize = inputSizeBucket(inputBytes);
    if (inputBytes > MAX_EDITOR_INPUT_BYTES) {
      setOutput(""); setStatus("error"); setMetrics(null);
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
      setDiagnostics([{ severity: "error", code: "PROCESSING_TIMEOUT", message: "Processing took too long. Try a smaller input, or minify before formatting." }]);
      track({ name: "tool_error", tool: tool.id, action: tool.action, code: "processing_timeout", inputSize });
    }, MAX_PROCESSING_MS);
    const request: WorkerRequest = { requestId, tool: tool.id, engine: tool.engine, action: tool.action, input: source, options };
    try { worker.postMessage(request); }
    catch { workerError(inputSize); }
  }, [clearProcessingTimeout, getWorker, options, stopAutoTimer, stopWorker, tool, workerError]);

  useEffect(() => {
    if (!input.trim() || !preferencesReady) return;
    const size = encoder.encode(input).length;
    if (size > AUTO_LIMIT_BYTES) return;
    const timer = window.setTimeout(() => processInput(input), size <= SMALL_INPUT_BYTES ? 450 : 900);
    autoTimerRef.current = timer;
    return () => { window.clearTimeout(timer); if (autoTimerRef.current === timer) autoTimerRef.current = null; };
  }, [input, preferencesReady, processInput]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && input.trim()) { event.preventDefault(); processInput(input); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [input, processInput]);
  useEffect(() => {
    const onLoadExample = (event: Event) => {
      const detail = (event as CustomEvent<{ example?: string }>).detail;
      if (typeof detail?.example !== "string") return;
      const text = detail.example;
      ++requestRef.current;
      clearProcessingTimeout();
      stopAutoTimer();
      setInput(text);
      setOutput("");
      setMetrics(null);
      setDiagnostics([]);
      setStatus(statusForInput(text));
    };
    window.addEventListener(LOAD_EXAMPLE_EVENT, onLoadExample);
    return () => window.removeEventListener(LOAD_EXAMPLE_EVENT, onLoadExample);
  }, [clearProcessingTimeout, stopAutoTimer]);

  const onInput = (text: string) => {
    if (text === inputRef.current) {
      if (!text.trim()) return;
      if (encoder.encode(text).length > AUTO_LIMIT_BYTES) {
        setStatus("guarded");
        return;
      }
      processInput(text);
      return;
    }
    const grew = text.length > inputRef.current.length + 20 || (inputRef.current.length === 0 && text.length > 0);
    ++requestRef.current;
    clearProcessingTimeout();
    stopAutoTimer();
    setInput(text);
    setOutput("");
    setMetrics(null);
    setDiagnostics([]);
    setStatus(statusForInput(text));
    if (grew && text.trim()) track({ name: "tool_paste", tool: tool.id, inputSize: inputSizeBucket(encoder.encode(text).length) });
  };
  const onFile = async (file?: File) => {
    if (!file) return;
    const selectionId = ++requestRef.current;
    clearProcessingTimeout(); stopAutoTimer();
    if (file.size > MAX_EDITOR_INPUT_BYTES) {
      setInput("");
      setOutput("");
      setMetrics(null);
      setStatus("error");
      setDiagnostics([tooLargeDiagnostic(file.size)]);
      track({ name: "tool_error", tool: tool.id, action: tool.action, code: "input_too_large", inputSize: inputSizeBucket(file.size) });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const text = await file.text();
    if (selectionId === requestRef.current) onInput(text);
  };
  const updateOption = (id: string, value: string | number | boolean) => {
    ++requestRef.current; clearProcessingTimeout(); stopAutoTimer(); setOutput(""); setMetrics(null); setDiagnostics([]);
    setStatus(statusForInput(input));
    setStorageValue(`option.${tool.id}.${id}`, String(value));
    setOptions(current => ({ ...current, [id]: value }));
  };
  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      track({ name: "tool_copy", tool: tool.id, action: tool.action });
      window.setTimeout(() => setCopied(false), 2000);
    }
    catch { setDiagnostics([{ severity: "error", code: "COPY_FAILED", message: "Clipboard access was denied. Select and copy the result manually." }]); }
  };
  const download = () => {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: downloadMime(tool.output.language) }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${tool.slug}${tool.output.extension}`; anchor.click();
    track({ name: "tool_download", tool: tool.id, action: tool.action });
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const reset = () => {
    ++requestRef.current; clearProcessingTimeout(); stopAutoTimer(); setInput(""); setOutput(""); setDiagnostics([]); setStatus("idle"); setMetrics(null);
    if (fileRef.current) fileRef.current.value = "";
  };
  const applyFix = (fix: NonNullable<Diagnostic["fix"]>) => onInput(`${input.slice(0, fix.startOffset)}${fix.replacement}${input.slice(fix.endOffset)}`);
  const visibleOptions = tool.options.filter(option => !option.actions || option.actions.includes(tool.action));
  const statusText = status === "idle" ? "Ready when you are" : status === "guarded" ? "Large input — run manually" : status === "working" ? "Processing in your browser…" : status === "error" ? "Needs attention" : diagnostics.some(d => d.severity === "warning") ? "Completed with warnings" : tool.action === "validate" ? "Valid input" : "Done — processed locally";
  const runIcon = tool.action === "validate" ? "✓" : "▶";
  const showWorkingOverlay = status === "working" && !output;
  const showIdleEmpty = !output && !showWorkingOverlay;

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
    <div className="editor-grid"><div className="editor-pane"><div className="pane-header"><div><span className="pane-dot input-dot" />{tool.inputLabel}</div><div className="pane-actions"><input ref={fileRef} type="file" accept={tool.input.extensions.join(",")} hidden onChange={e => onFile(e.target.files?.[0])} /><button type="button" onClick={() => fileRef.current?.click()}>↑ Open file</button></div></div><div className="editor-area"><CodeEditor value={input} language={tool.input.language} onChange={onInput} diagnostics={diagnostics} label={tool.inputLabel} placeholder={`Paste or type ${tool.input.language.toUpperCase()} here...`} /></div><div className="pane-footer"><span>{input ? `${encoder.encode(input).length.toLocaleString()} bytes` : "Ready for input"}</span><span>Up to {MAX_EDITOR_INPUT_LABEL}</span></div></div>
      <div className="editor-pane output-pane"><div className="pane-header"><div><span className="pane-dot output-dot" />{tool.outputLabel}</div><div className="pane-actions"><button type="button" disabled={!output} onClick={copy}>{copied ? "✓ Copied" : "▢ Copy"}</button><button type="button" disabled={!output} onClick={download}>↓ Download</button></div></div><div className="editor-area">
        <CodeEditor value={output} language={tool.output.language} readOnly label={tool.outputLabel} />
        {showWorkingOverlay && (
          <div className="output-empty output-loading" role="status" aria-live="polite">
            <span className="loading-spinner" aria-hidden="true" />
            <strong>Updating result…</strong>
            <small>Applying your option change in this browser</small>
          </div>
        )}
        {showIdleEmpty && (
          <div className="output-empty">
            <span className="empty-symbol">{`{ }`}</span>
            <strong>{status === "success" && tool.action === "validate" ? "Input is valid" : "Your result appears here"}</strong>
            <small>{tool.action === "validate" ? "Validation details appear below" : "Enter data to see the result"}</small>
          </div>
        )}
      </div><div className="pane-footer"><span>{output ? `${encoder.encode(output).length.toLocaleString()} bytes` : showWorkingOverlay ? "Working…" : "No output yet"}</span><span>{metrics ? `${metrics.durationMs} ms` : "LOCAL PROCESSING"}</span></div></div></div>
    <div className="workspace-bottom">
      <div className="run-cluster">
        <button type="button" className="button primary run-button" onClick={() => processInput(input)} disabled={!input.trim()}>
          {status === "working" ? "Processing…" : tool.buttonLabel}
          <span aria-hidden="true">{runIcon}</span>
        </button>
        <span className="run-shortcut" title="Keyboard shortcut">Ctrl/⌘ + Enter</span>
      </div>
      <div className={`status-message ${status}`} role="status" aria-live="polite"><span className="status-dot" />{statusText}</div>
      <span className="workspace-privacy">Private by design · Runs locally · Never uploaded · Max {MAX_EDITOR_INPUT_LABEL}</span>
    </div>
    <DiagnosticPanel source={input} diagnostics={diagnostics} onFix={applyFix} />
  </section>;
}
