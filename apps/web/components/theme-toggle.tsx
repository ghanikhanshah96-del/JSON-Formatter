import { ThemeToggleScript } from "./theme-toggle-script";

/** Zero-React theme control — cycles light → dark → system. */
export function ThemeToggle() {
  return (
    <>
      <button
        id="theme-toggle"
        className="theme-toggle"
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
      <ThemeToggleScript />
    </>
  );
}
