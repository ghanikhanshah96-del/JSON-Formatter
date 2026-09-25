"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Tool } from "@codeformattools/tool-registry";
import { iconForTool } from "@/lib/tool-icons";

type Category = { id: string; name: string };

export function ToolsGrid({ tools, categories }: { tools: Tool[]; categories: readonly Category[] }) {
  const [active, setActive] = useState<string>("all");

  const filters = useMemo(
    () => [{ id: "all", name: "All" }, ...categories.map(category => ({ id: category.id, name: category.name.replace(/ tools$/i, "") }))],
    [categories]
  );

  const visible = useMemo(
    () => (active === "all" ? tools : tools.filter(tool => tool.category === active)),
    [active, tools]
  );

  return (
    <div className="tools-browser">
      <div className="tools-filter" role="tablist" aria-label="Filter tools by category">
        {filters.map(filter => (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={active === filter.id}
            className={`tools-filter-chip${active === filter.id ? " active" : ""}`}
            onClick={() => setActive(filter.id)}
          >
            {filter.name}
          </button>
        ))}
      </div>
      <div className="tool-grid" role="tabpanel">
        {visible.map(tool => (
          <Link href={`/${tool.slug}`} className="tool-card" key={tool.id}>
            <div className="card-top">
              <span className="card-icon" aria-hidden="true">{iconForTool(tool.id)}</span>
            </div>
            <div className="card-eyebrow">{tool.eyebrow}</div>
            <h3>{tool.name}</h3>
            <p>{tool.cardDescription}</p>
            <span className="card-link">Open tool <span aria-hidden="true">→</span></span>
          </Link>
        ))}
      </div>
      {visible.length === 0 && <p className="tools-empty">No tools in this category yet.</p>}
    </div>
  );
}
