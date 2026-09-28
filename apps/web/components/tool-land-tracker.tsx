import type { ToolId } from "@codeformattools/tool-core";

/** Fire-and-forget land event without a React client bundle. */
export function ToolLandTracker({ toolId }: { toolId: ToolId }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `try{window.dispatchEvent(new CustomEvent("cft:tool_land",{detail:{tool:${JSON.stringify(toolId)}}}));}catch(e){}`
      }}
    />
  );
}
