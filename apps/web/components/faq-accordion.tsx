type FaqItem = { question: string; answer: string };

/** Native details FAQ — exclusive via the HTML `name` attribute (one open at a time). */
export function FaqAccordion({ items, group = "faq" }: { items: FaqItem[]; group?: string }) {
  return (
    <div className="faq-list">
      {items.map((item, index) => (
        <details className="faq-item" name={group} key={item.question}>
          <summary className="faq-trigger">
            <span className="faq-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span className="faq-question">{item.question}</span>
            <span className="faq-chevron" aria-hidden="true" />
          </summary>
          <div className="faq-panel">
            <p>{item.answer}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
