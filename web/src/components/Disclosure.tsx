"use client";

import { useState, type ReactNode } from "react";

export function Disclosure({
  summary,
  children,
}: {
  summary: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-[6px] border border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mono flex w-full items-center justify-between gap-3 rounded-[6px] px-3 py-2 text-[11px] text-muted hover:bg-surface hover:text-ink active:scale-[0.98]"
      >
        <span>{summary}</span>
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open && <div className="border-t border-line p-3">{children}</div>}
    </div>
  );
}
