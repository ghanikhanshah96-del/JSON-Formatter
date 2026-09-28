type FaqItem = { question: string; answer: string };

/** Native details FAQ — no client JS (better TBT / Lighthouse performance). */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="faq-list">
      {items.map(item => (
        <details className="faq-item" key={item.question}>
          <summary className="faq-trigger">{item.question}</summary>
          <div className="faq-panel">
            <p>{item.answer}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
