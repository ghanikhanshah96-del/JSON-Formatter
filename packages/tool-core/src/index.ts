export type ToolId = string;
/** Browser-side editor safety ceiling. Larger inputs risk freezing the tab. */
export const MAX_EDITOR_INPUT_BYTES = 5 * 1024 * 1024;
export const MAX_EDITOR_INPUT_LABEL = "5 MB";
export type Action = string;
export type EngineId = "json" | "sql" | "yaml" | "xml" | "conversion";
export type EditorLanguage = "json" | "sql" | "yaml" | "xml" | "csv" | "text";
export type OptionValue = string | number | boolean;
export type ToolOptions = Record<string, OptionValue>;
export type DiagnosticSeverity = "error" | "warning" | "info" | "blocked";
export type DiagnosticCategory = "syntax" | "semantic" | "safety" | "mapping" | "limit";
export type Diagnostic = {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  /** Short headline for report cards (e.g. "Missing comma"). */
  title?: string;
  category?: DiagnosticCategory;
  line?: number;
  column?: number;
  startOffset?: number;
  endOffset?: number;
  suggestion?: string;
  fix?: { label: string; startOffset: number; endOffset: number; replacement: string };
};
export type WorkerRequest = {
  requestId: string;
  tool: ToolId;
  engine: EngineId;
  action: Action;
  input: string;
  options: ToolOptions;
};
export type WorkerResponse = {
  requestId: string;
  ok: boolean;
  output: string;
  diagnostics: Diagnostic[];
  metrics: { durationMs: number; inputBytes: number; outputBytes: number };
};

/** Human title for known diagnostic codes. */
export function diagnosticTitle(diagnostic: Diagnostic): string {
  if (diagnostic.title) return diagnostic.title;
  const map: Record<string, string> = {
    TRAILING_COMMA: "Trailing comma",
    MISSING_COMMA: "Missing comma",
    SINGLE_QUOTES: "Single quotes",
    BAD_ESCAPE: "Bad escape",
    UNEXPECTED_END: "Unexpected end",
    INVALID_JSON: "Invalid JSON",
    DEPTH_LIMIT: "Nesting too deep",
    OUTPUT_TOO_LARGE: "Output too large",
    INPUT_TOO_LARGE: "Input too large",
    DUPLICATE_KEY: "Duplicate key",
    YAML_COMMENT_PRESERVATION_LIMIT: "Comments detected",
    YAML_PARSE_ERROR: "YAML syntax error",
    YAML_SAFETY_LIMIT: "YAML safety limit",
    XML_DECLARATION_BLOCKED: "DOCTYPE blocked",
    XML_ENTITY_ERROR: "Entity not allowed",
    XML_MIXED_CONTENT: "Mixed content preserved",
    SQL_PARSE_ERROR: "SQL could not be parsed",
    PROCESSING_TIMEOUT: "Processing timed out",
    WORKER_ERROR: "Worker failed",
    COPY_FAILED: "Copy failed"
  };
  return map[diagnostic.code] || diagnostic.message.split(/[. —]/)[0] || diagnostic.code;
}
