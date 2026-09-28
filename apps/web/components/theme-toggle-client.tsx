"use client";
import { useEffect, useState } from "react";
import { migratedStorageValue, setStorageValue } from "@/lib/browser-storage";

type Theme = "light" | "dark" | "system";
const themes: Theme[] = ["light", "dark", "system"];

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function actionFor(theme: Theme) {
  if (theme === "light") return { icon: "☾", label: "Dark", aria: "Switch to dark theme", pressed: false };
  if (theme === "dark") return { icon: "◑", label: "System", aria: "Use system theme preference", pressed: true };
  return { icon: "☼", label: "Light", aria: "Switch to light theme", pressed: false };
}

export function ThemeToggleClient() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    const initial = (migratedStorageValue("theme", value => themes.includes(value as Theme)) as Theme | null) ?? "system";
    // Browser preference is available only after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial);
    apply(initial);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      if ((migratedStorageValue("theme", value => themes.includes(value as Theme)) || "system") === "system") apply("system");
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const cycle = () => {
    const next = themes[(themes.indexOf(theme) + 1) % themes.length];
    setTheme(next);
    setStorageValue("theme", next);
    apply(next);
  };
  const action = actionFor(theme);
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={cycle}
      aria-label={action.aria}
      title={action.aria}
      aria-pressed={action.pressed}
    >
      <span className="theme-toggle-icon" aria-hidden="true">{action.icon}</span>
      <span className="theme-toggle-label">{action.label}</span>
    </button>
  );
}
