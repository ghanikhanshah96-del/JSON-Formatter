import { ThemeToggleScript } from "./theme-toggle-script";

type Props = {
  id?: string;
  className?: string;
  /** When false, skip injecting the theme script (use when another toggle already mounts it). */
  withScript?: boolean;
};

/** Zero-React theme control — cycles light → dark → system. */
export function ThemeToggle({ id = "theme-toggle", className = "theme-toggle", withScript = true }: Props) {
  return (
    <>
      <button
        id={id || undefined}
        className={className}
        type="button"
        aria-label="Switch to dark theme"
        title="Switch to dark theme"
        aria-pressed="false"
        data-theme-toggle
        suppressHydrationWarning
      >
        <span className="theme-toggle-icon" data-theme-icon aria-hidden="true" suppressHydrationWarning>☾</span>
        <span className="theme-toggle-label" data-theme-label suppressHydrationWarning>Dark</span>
      </button>
      {withScript ? <ThemeToggleScript /> : null}
    </>
  );
}
