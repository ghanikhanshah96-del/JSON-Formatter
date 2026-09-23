"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { OptionValue } from "@codeformattools/tool-core";

type Choice = { label: string; value: OptionValue };

type Props = {
  id: string;
  label: string;
  value: OptionValue;
  choices: Choice[];
  busy?: boolean;
  onChange: (value: OptionValue) => void;
};

export function ThemeSelect({ id, label, value, choices, busy = false, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = choices.find(choice => String(choice.value) === String(value)) ?? choices[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (choice: Choice) => {
    onChange(choice.value);
    setOpen(false);
  };

  return (
    <div className={`theme-select${open ? " open" : ""}${busy ? " busy" : ""}`} ref={rootRef}>
      <span className="theme-select-label" id={`${id}-label`}>{label}</span>
      <div className="theme-select-control">
        <button
          type="button"
          id={id}
          className="theme-select-trigger"
          data-value={String(value)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={`${id}-label ${id}`}
          aria-busy={busy}
          disabled={busy}
          onClick={() => setOpen(current => !current)}
        >
          <span className="theme-select-value">{selected?.label ?? ""}</span>
          <span className="theme-select-chevron" aria-hidden="true" />
        </button>
        {open && (
          <ul id={listId} className="theme-select-menu" role="listbox" aria-labelledby={`${id}-label`}>
            {choices.map(choice => {
              const isActive = String(choice.value) === String(value);
              return (
                <li key={String(choice.value)} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    data-value={String(choice.value)}
                    className={`theme-select-option${isActive ? " active" : ""}`}
                    onClick={() => pick(choice)}
                  >
                    {choice.label}
                    {isActive && <span className="theme-select-check" aria-hidden="true">✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
