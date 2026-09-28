"use client";

import { useEffect, useState, type ComponentType } from "react";

export function ObservabilityLoader() {
  const [Client, setClient] = useState<ComponentType | null>(null);

  useEffect(() => {
    let active = true;
    import("./observability-client").then(mod => {
      if (active) setClient(() => mod.ObservabilityClient);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!Client) return null;
  return <Client />;
}
