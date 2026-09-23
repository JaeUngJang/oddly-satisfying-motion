import type { ReactNode } from "react";

export function CodeBlock({
  code,
  fileName,
  action,
  clamp = false,
}: {
  code: string;
  /** Shown mono on the left of the block header. */
  fileName?: string;
  /** Usually a CopyButton, right-aligned in the header. */
  action?: ReactNode;
  clamp?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[6px] border border-line bg-surface">
      {(fileName || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
          <span className="mono text-[11px] text-muted">{fileName}</span>
          {action}
        </div>
      )}
      <pre
        className={`overflow-auto px-3 py-3 text-[11px] leading-[1.7] text-ink ${
          clamp ? "max-h-80" : ""
        }`}
        style={{ fontFamily: "var(--font-mono)" }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
