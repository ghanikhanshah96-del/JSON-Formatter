import type { AnchorHTMLAttributes, ReactNode } from "react";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href?: string;
  className?: string;
  "aria-label"?: string;
  children: ReactNode;
};

/** Plain anchor — no Next.js client router hydration cost. */
export function HomeBrandLink({ href = "/", className, children, ...rest }: Props) {
  return (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  );
}
