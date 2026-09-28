import type { Tool } from "@codeformattools/tool-registry";
import { iconForTool } from "@/lib/tool-icons";

type Category = { id: string; name: string };

/**
 * CSS radio-tab filter — works before deferred homepage scripts hydrate,
 * so chips filter in place without navigating to /tools/[category].
 */
export function ToolsGrid({ tools, categories }: { tools: Tool[]; categories: readonly Category[] }) {
  const filters = [{ id: "all", name: "All" }, ...categories.map(c => ({ id: c.id, name: c.name.replace(/ tools$/i, "") }))];

  return (
    <div className="tools-browser" id="tools-browser">
      {filters.map((filter, index) => (
        <input
          key={filter.id}
          type="radio"
          name="tools-category"
          id={`tools-cat-${filter.id}`}
          className="tools-cat-input visually-hidden"
          defaultChecked={index === 0}
        />
      ))}
      <div className="tools-filter" role="tablist" aria-label="Tool categories">
        {filters.map(filter => (
          <label
            key={filter.id}
            htmlFor={`tools-cat-${filter.id}`}
            className="tools-filter-chip"
            role="tab"
          >
            {filter.name}
          </label>
        ))}
      </div>
      <div className="tool-grid">
        {tools.map(tool => (
          <a
            href={`/${tool.slug}`}
            className="tool-card"
            data-category={tool.category}
            key={tool.id}
          >
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
