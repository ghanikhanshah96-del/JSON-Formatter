import { MAX_EDITOR_INPUT_BYTES, MAX_EDITOR_INPUT_LABEL, type WorkerRequest, type WorkerResponse } from "@codeformattools/tool-core";
import { getToolById } from "@codeformattools/tool-registry";

type EngineResult = Pick<WorkerResponse, "ok" | "output" | "diagnostics">;
const bytes = (value: string) => new TextEncoder().encode(value).length;

async function dispatch(request: WorkerRequest): Promise<EngineResult> {
  const tool = getToolById(request.tool);
  if (!tool || tool.engine !== request.engine || !tool.operations.includes(request.action)) {
    return { ok: false, output: "", diagnostics: [{ severity: "error", code: "INVALID_REQUEST", message: "Unknown tool or operation." }] };
  }
  switch (tool.engine) {
    case "json": {
      const { runJson } = await import("@codeformattools/json-engine");
      return runJson(request.input, request.action, request.options);
    }
    case "sql": {
      const { runSql } = await import("@codeformattools/sql-engine");
      return runSql(request.input, request.options);
    }
    case "yaml": {
      const { runYaml } = await import("@codeformattools/yaml-engine");
      return runYaml(request.input, request.action, request.options);
    }
    case "xml": {
      const { runXml } = await import("@codeformattools/xml-engine");
      return runXml(request.input, request.action, request.options);
    }
    case "conversion": {
      const { runConversion } = await import("@codeformattools/conversion-engine");
      return runConversion(request.tool, request.input, request.options);
    }
    default:
      return { ok: false, output: "", diagnostics: [{ severity: "error", code: "ENGINE_UNAVAILABLE", message: `${tool.engine} processing is not available yet.` }] };
  }
}

function formatMb(size: number): string {
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export async function executeRequest(request: WorkerRequest): Promise<WorkerResponse> {
  const started = performance.now();
  const inputBytes = bytes(request.input);
  if (inputBytes > MAX_EDITOR_INPUT_BYTES) {
    return {
      requestId: request.requestId,
      ok: false,
      output: "",
      diagnostics: [{
        severity: "error",
        code: "INPUT_TOO_LARGE",
        message: `This input is about ${formatMb(inputBytes)}. The browser limit is ${MAX_EDITOR_INPUT_LABEL}. Try a smaller file, or minify/split it first.`,
        suggestion: "Larger files need more browser memory. Keep inputs under the limit for a smooth local run."
      }],
      metrics: { durationMs: 0, inputBytes, outputBytes: 0 }
    };
  }
  let result: EngineResult;
  try { result = await dispatch(request); }
  catch { result = { ok: false, output: "", diagnostics: [{ severity: "error", code: "ENGINE_ERROR", message: "The tool could not process this input." }] }; }
  return { requestId: request.requestId, ...result, metrics: { durationMs: Math.round(performance.now() - started), inputBytes, outputBytes: bytes(result.output) } };
}
