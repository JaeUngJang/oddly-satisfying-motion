import Link from "next/link";
import { ModeToggle } from "./ModeToggle";

const LINKS = [
  { href: "/#units", label: "Units" },
  { href: "/#community", label: "Community" },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-20 h-14 border-b border-line bg-bg">
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="text-[14px] font-medium tracking-[-0.01em] text-ink hover:underline"
        >
          Wow Units
        </Link>

        {/* Spacing separates the links; a middle dot between them is decoration. */}
        <nav className="hidden items-center gap-5 sm:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="mono text-[12px] text-muted hover:text-ink hover:underline"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <ModeToggle />
      </div>
    </header>
  );
}
