"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { Tool } from "@codeformattools/tool-registry";

/** Mounts ToolShell as soon as the page hydrates — workspace is ready for paste. */
export function ToolShellHydrator({ tool }: { tool: Tool }) {
  const [Shell, setShell] = useState<ComponentType<{ tool: Tool }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("./tool-shell").then(mod => {
      if (!cancelled) setShell(() => mod.ToolShell);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!Shell) return;
    // Drop the SSR placeholder entirely so it cannot collide with live selectors/a11y.
    document.getElementById("tool-workspace-gate")?.remove();
  }, [Shell]);

  if (!Shell) return null;
  return <Shell tool={tool} />;
}
