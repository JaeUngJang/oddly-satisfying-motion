"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Two destinations, not two client states: AI crawlers do not run JavaScript,
// so the AI version has to be its own URL.
const OPTIONS = [
  { label: "person", href: "/" },
  { label: "ai", href: "/ai" },
] as const;

export function ModeToggle() {
  const pathname = usePathname();
  const active = pathname === "/ai" ? "ai" : "person";

  return (
    <div className="flex items-center gap-2">
      <span className="mono text-[11px] text-muted">for</span>
      <div className="flex items-center rounded-full border border-line p-[2px]">
        {OPTIONS.map((option) => (
          <Link
            key={option.label}
            href={option.href}
            aria-current={active === option.label ? "page" : undefined}
            className={`mono rounded-full px-2 py-0.5 text-[11px] active:scale-[0.98] ${
              active === option.label
                ? "bg-accent-soft text-accent-text"
                : "text-muted hover:text-ink"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
