type FaqItem = { question: string; answer: string };

/** Native details FAQ — exclusive via the HTML `name` attribute (one open at a time). */
export function FaqAccordion({ items, group = "faq" }: { items: FaqItem[]; group?: string }) {
  const columnSize = Math.ceil(items.length / 2);
  const columns = [items.slice(0, columnSize), items.slice(columnSize)];

  return (
    <div className="faq-list">
      {columns.map((column, columnIndex) => (
        <div className="faq-column" key={columnIndex}>
          {column.map((item, index) => {
            const itemIndex = columnIndex === 0 ? index : columnSize + index;
            return (
              <details className="faq-item" name={group} key={item.question}>
                <summary className="faq-trigger">
                  <span className="faq-index" aria-hidden="true">{String(itemIndex + 1).padStart(2, "0")}</span>
                  <span className="faq-question">{item.question}</span>
                  <span className="faq-chevron" aria-hidden="true" />
                </summary>
                <div className="faq-panel">
                  <p>{item.answer}</p>
                </div>
              </details>
            );
          })}
        </div>
      ))}
    </div>
  );
}
