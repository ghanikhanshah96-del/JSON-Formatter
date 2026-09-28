type FaqItem = { question: string; answer: string };

/** Native details FAQ — exclusive via the HTML `name` attribute (one open at a time). */
export function FaqAccordion({ items, group = "faq" }: { items: FaqItem[]; group?: string }) {
  return (
    <div className="faq-list">
      {items.map(item => (
        <details className="faq-item" name={group} key={item.question}>
          <summary className="faq-trigger">{item.question}</summary>
          <div className="faq-panel">
            <p>{item.answer}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
