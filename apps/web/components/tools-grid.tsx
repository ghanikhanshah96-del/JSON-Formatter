import type { Tool } from "@codeformattools/tool-registry";
import { iconForTool } from "@/lib/tool-icons";

type Category = { id: string; name: string };

/** Server-rendered tools grid — plain anchors avoid Link hydration/TBT. */
export function ToolsGrid({ tools, categories }: { tools: Tool[]; categories: readonly Category[] }) {
  return (
    <div className="tools-browser">
      <div className="tools-filter" aria-label="Tool categories">
        <a href="/#tools" className="tools-filter-chip active">All</a>
        {categories.map(category => (
          <a
            key={category.id}
            href={`/tools/${category.id}`}
            className="tools-filter-chip"
          >
            {category.name.replace(/ tools$/i, "")}
          </a>
        ))}
      </div>
      <div className="tool-grid">
        {tools.map(tool => (
          <a href={`/${tool.slug}`} className="tool-card" key={tool.id}>
            <div className="card-top">
              <span className="card-icon" aria-hidden="true">{iconForTool(tool.id)}</span>
            </div>
            <div className="card-eyebrow">{tool.eyebrow}</div>
            <h3>{tool.name}</h3>
            <p>{tool.cardDescription}</p>
            <span className="card-link">Open tool <span aria-hidden="true">→</span></span>
          </a>
        ))}
      </div>
    </div>
  );
}
