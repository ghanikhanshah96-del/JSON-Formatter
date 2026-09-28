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

  if (!Shell) return null;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: "#tool-workspace-gate{display:none!important}" }} />
      <Shell tool={tool} />
    </>
  );
}
