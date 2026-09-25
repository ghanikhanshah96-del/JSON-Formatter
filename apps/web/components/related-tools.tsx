"use client";

import Link from "next/link";
import type { Tool } from "@codeformattools/tool-registry";
import { track } from "@codeformattools/analytics";

export function RelatedTools({ current, related }: { current: Tool["id"]; related: Tool[] }) {
  return (
    <aside className="related">
      <div className="eyebrow">KEEP WORKING</div>
      <h3>Related tools</h3>
      {related.map(item => (
        <Link href={`/${item.slug}`} key={item.id} onClick={() => track({ name: "related_tool_click", from: current, to: item.id })}>
          {item.name}<span aria-hidden="true">→</span>
        </Link>
      ))}
      <div className="related-note">Private by default. Your data stays in the browser.</div>
    </aside>
  );
}
