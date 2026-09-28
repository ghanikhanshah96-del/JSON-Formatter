"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { Tool } from "@codeformattools/tool-registry";

function consumeOpenFlag(): boolean {
  try {
    if (sessionStorage.getItem("cft:open-ws") === "1") {
      sessionStorage.removeItem("cft:open-ws");
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** Mounts ToolShell after Next.js hydrates when the user asked to open the workspace. */
export function ToolShellHydrator({ tool }: { tool: Tool }) {
  const [Shell, setShell] = useState<ComponentType<{ tool: Tool }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loading = false;

    const mount = () => {
      if (cancelled || loading) return;
      loading = true;
      void import("./tool-shell").then(mod => {
        if (!cancelled) setShell(() => mod.ToolShell);
      });
    };

    if (consumeOpenFlag()) mount();

    const onOpen = () => {
      try {
        sessionStorage.removeItem("cft:open-ws");
      } catch {
        /* ignore */
      }
      mount();
    };

    window.addEventListener("cft:open-ws", onOpen);
    return () => {
      cancelled = true;
      window.removeEventListener("cft:open-ws", onOpen);
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
