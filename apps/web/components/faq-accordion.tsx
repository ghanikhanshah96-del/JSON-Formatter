"use client";

import { useId, useState } from "react";

type FaqItem = { question: string; answer: string };

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="faq-list" role="list">
      {items.map((item, index) => {
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;
        const isOpen = openIndex === index;
        return (
          <div className={`faq-item${isOpen ? " open" : ""}`} key={item.question} role="listitem">
            <h4 className="faq-question">
              <button
                type="button"
                id={buttonId}
                className="faq-trigger"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(current => (current === index ? null : index))}
              >
                {item.question}
              </button>
            </h4>
            <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!isOpen} className="faq-panel">
              <p>{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
