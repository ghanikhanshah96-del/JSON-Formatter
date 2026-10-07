"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { siteConfig } from "@codeformattools/seo";
import { HomeBrandLink } from "@/components/home-brand-link";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { href: "/tools", label: "Tools", hint: "Format, validate, convert", icon: "grid" },
  { href: "/blog", label: "Blog", hint: "Guides & long-tails", icon: "book" },
  { href: "/about", label: "About", hint: "Why we stay local-first", icon: "info" },
  { href: "/privacy", label: "Privacy", hint: "Your data never leaves", icon: "shield" },
  { href: "/contact", label: "Contact", hint: "Questions & feedback", icon: "mail" }
] as const;

const QUICK_TOOLS = [
  { href: "/json-formatter", label: "JSON Formatter", short: "JSON" },
  { href: "/json-validator", label: "JSON Validator", short: "Validate" },
  { href: "/yaml-formatter", label: "YAML Formatter", short: "YAML" },
  { href: "/xml-formatter", label: "XML Formatter", short: "XML" }
] as const;

const TOOL_TITLES: Record<string, string> = {
  "/json-formatter": "JSON Formatter",
  "/json-validator": "JSON Validator",
  "/json-minifier": "JSON Minifier",
  "/json-sorter": "JSON Sorter",
  "/json-to-yaml": "JSON → YAML",
  "/json-to-xml": "JSON → XML",
  "/yaml-formatter": "YAML Formatter",
  "/yaml-to-json": "YAML → JSON",
  "/xml-formatter": "XML Formatter",
  "/xml-to-json": "XML → JSON"
};

function NavIcon({ name }: { name: (typeof NAV_LINKS)[number]["icon"] }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className: "mobile-nav-icon"
  };
  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M4.5 5.5A2 2 0 0 1 6.5 3.5H19v15.5H6.5a2 2 0 0 0-2 2V5.5Z" />
          <path d="M6.5 19.5a2 2 0 0 1 2-2H19" />
        </svg>
      );
    case "info":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.25" />
          <path d="M12 10.5v5" />
          <path d="M12 7.75h.01" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3.5 5.5 6.5v5.2c0 4.1 2.7 7.8 6.5 9 3.8-1.2 6.5-4.9 6.5-9V6.5L12 3.5Z" />
          <path d="m9.5 12 1.8 1.8 3.5-3.8" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="m4.5 7.5 7.5 6 7.5-6" />
        </svg>
      );
  }
}

function isActive(pathname: string, href: string) {
  if (href.startsWith("/#")) return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function titleFromPath(pathname: string) {
  if (pathname === "/") return null;
  if (TOOL_TITLES[pathname]) return TOOL_TITLES[pathname];
  if (pathname === "/tools" || pathname.startsWith("/tools/")) return "Tools";
  if (pathname.startsWith("/blog")) return "Blog";
  if (pathname === "/about") return "About";
  if (pathname === "/privacy") return "Privacy";
  if (pathname === "/disclaimer") return "Disclaimer";
  if (pathname === "/contact") return "Contact";
  if (pathname === "/terms") return "Terms";
  if (pathname === "/editorial-policy") return "Editorial Policy";
  return null;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const navId = useId();
  const pathname = usePathname() || "/";
  const closeRef = useRef<HTMLButtonElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const pageTitle = titleFromPath(pathname);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen(value => !value), []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const nodes = [...drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        el => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("nav-open");
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      document.documentElement.classList.remove("nav-open");
      window.clearTimeout(focusTimer);
      toggleRef.current?.focus();
    };
  }, [open, close]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <header className={`site-header${open ? " nav-open" : ""}`}>
      <div className="container header-inner">
        <HomeBrandLink className="brand" aria-label={`${siteConfig.name} home`} href="/">
          <span className="brand-mark" aria-hidden="true">{`{ }`}</span>
          <span className="brand-text">
            <span className="brand-text-full">{siteConfig.name}</span>
            <span className="brand-text-compact" aria-hidden="true">
              CFT
            </span>
            <span className="brand-dot" aria-hidden="true">
              .
            </span>
          </span>
        </HomeBrandLink>

        <nav className="top-nav desktop-nav" aria-label="Primary navigation">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              className={isActive(pathname, link.href) ? "is-active" : undefined}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          <button
            ref={toggleRef}
            type="button"
            className="nav-toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls={navId}
            onClick={toggle}
          >
            <span className="nav-toggle-bars" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </button>
        </div>
      </div>

      <div className="nav-backdrop" hidden={!open} onClick={close} aria-hidden="true" />

      <aside
        ref={drawerRef}
        id={navId}
        className="mobile-drawer"
        data-open={open ? "true" : "false"}
        aria-hidden={!open}
        aria-modal={open}
        role="dialog"
        aria-label="Site menu"
      >
        <div className="mobile-drawer-glow" aria-hidden="true" />

        <div className="mobile-drawer-top">
          <HomeBrandLink
            className="mobile-drawer-brand"
            href="/"
            onClick={close}
            aria-label={`${siteConfig.name} home`}
          >
            <span className="brand-mark" aria-hidden="true">{`{ }`}</span>
            <span>
              <strong>CFT</strong>
              <small>Local-first tools</small>
            </span>
          </HomeBrandLink>
          <button
            ref={closeRef}
            type="button"
            className="mobile-drawer-close"
            aria-label="Close menu"
            onClick={close}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="mobile-drawer-scroll">
          {pageTitle ? (
            <div className="mobile-drawer-here">
              <span className="mobile-drawer-here-dot" aria-hidden="true" />
              <div>
                <small>Now viewing</small>
                <strong>{pageTitle}</strong>
              </div>
            </div>
          ) : null}

          <a href="/tools" className="mobile-drawer-cta" onClick={close}>
            <span className="mobile-drawer-cta-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="m16 16 3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <span>
              <strong>Browse all tools</strong>
              <small>JSON, YAML, XML & converters</small>
            </span>
            <span className="mobile-drawer-chevron" aria-hidden="true">
              →
            </span>
          </a>

          <p className="mobile-drawer-kicker">Navigate</p>
          <nav className="mobile-drawer-nav" aria-label="Primary">
            {NAV_LINKS.map((link, index) => {
              const active = isActive(pathname, link.href);
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`mobile-drawer-link${active ? " is-active" : ""}`}
                  style={{ ["--i" as string]: index }}
                  onClick={close}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="mobile-drawer-link-icon">
                    <NavIcon name={link.icon} />
                  </span>
                  <span className="mobile-drawer-link-copy">
                    <strong>{link.label}</strong>
                    <small>{link.hint}</small>
                  </span>
                  <span className="mobile-drawer-chevron" aria-hidden="true">
                    →
                  </span>
                </a>
              );
            })}
          </nav>

          <p className="mobile-drawer-kicker">Jump in</p>
          <div className="mobile-drawer-tools">
            {QUICK_TOOLS.map(tool => {
              const active = pathname === tool.href;
              return (
                <a
                  key={tool.href}
                  href={tool.href}
                  className={active ? "is-active" : undefined}
                  onClick={close}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="mobile-drawer-tool-short">{tool.short}</span>
                  <span className="mobile-drawer-tool-label">{tool.label}</span>
                </a>
              );
            })}
          </div>
        </div>

        <div className="mobile-drawer-foot">
          <div className="mobile-drawer-theme">
            <div>
              <span>Appearance</span>
              <small>Light, dark, or system</small>
            </div>
            <ThemeToggle id="theme-toggle-mobile" withScript={false} />
          </div>
        </div>
      </aside>
    </header>
  );
}
