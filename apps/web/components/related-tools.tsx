import type { Tool } from "@codeformattools/tool-registry";

/** Server-rendered related tools — no client hydration cost. */
export function RelatedTools({ related }: { related: Tool[] }) {
  return (
    <aside className="related">
      <div className="eyebrow">KEEP WORKING</div>
      <h3>Related tools</h3>
      {related.map(item => (
        <a href={`/${item.slug}`} key={item.id}>
          {item.name}<span aria-hidden="true">→</span>
        </a>
      ))}
      <div className="related-note">Private by default. Your data stays in the browser.</div>
    </aside>
  );
}
