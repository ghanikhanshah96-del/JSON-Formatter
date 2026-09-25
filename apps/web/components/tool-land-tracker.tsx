"use client";

import { useEffect } from "react";
import { track } from "@codeformattools/analytics";
import type { ToolId } from "@codeformattools/tool-core";

export function ToolLandTracker({ toolId }: { toolId: ToolId }) {
  useEffect(() => {
    track({ name: "tool_land", tool: toolId });
  }, [toolId]);
  return null;
}
