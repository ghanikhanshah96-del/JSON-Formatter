import { ThemeToggleScript } from "./theme-toggle-script";

/** Zero-React theme control for Lighthouse TBT — uses a tiny inline script. */
export function ThemeToggle() {
  return (
    <>
      <button
        id="theme-toggle"
        className="theme-toggle"
        type="button"
        aria-label="Theme: light. Change theme"
        title="Theme: light"
        data-theme-toggle
        suppressHydrationWarning
      >
        <span data-theme-icon aria-hidden="true" suppressHydrationWarning>☼</span>
        <span data-theme-label suppressHydrationWarning>light</span>
      </button>
      <ThemeToggleScript />
    </>
  );
}
