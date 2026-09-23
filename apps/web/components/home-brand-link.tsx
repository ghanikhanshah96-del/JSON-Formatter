"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode, MouseEvent } from "react";

type Props = {
  href?: string;
  className?: string;
  "aria-label"?: string;
  children: ReactNode;
};

export function HomeBrandLink({ href = "/", className, "aria-label": ariaLabel, children }: Props) {
  const pathname = usePathname();

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (pathname !== "/" || href !== "/") return;
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.location.hash) {
      window.history.replaceState(null, "", "/");
    }
  };

  return (
    <Link href={href} className={className} aria-label={ariaLabel} onClick={onClick}>
      {children}
    </Link>
  );
}
