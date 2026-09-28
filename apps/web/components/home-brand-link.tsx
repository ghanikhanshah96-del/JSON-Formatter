import type { ReactNode } from "react";

type Props = {
  href?: string;
  className?: string;
  "aria-label"?: string;
  children: ReactNode;
};

/** Plain anchor — no Next.js client router hydration cost. */
export function HomeBrandLink({ href = "/", className, "aria-label": ariaLabel, children }: Props) {
  return (
    <a href={href} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  );
}
