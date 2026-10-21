"use client";

import { useEffect, useState, type ComponentType } from "react";
import { usePathname } from "next/navigation";

export function ObservabilityLoader() {
  const pathname = usePathname();
  const [Client, setClient] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    let active = true;
    import("./observability-client").then(mod => {
      if (active) setClient(() => mod.ObservabilityClient);
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  if (pathname.startsWith("/admin") || !Client) return null;
  return <Client />;
}
