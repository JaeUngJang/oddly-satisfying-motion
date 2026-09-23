"use client";

import { CopyButton } from "./CopyButton";

/**
 * The only interactive element on /ai. Copies the exact bytes served at
 * /ai.md, so a person pasting into an agent gets what a crawler gets.
 */
export function AiPageCopy({ markdown }: { markdown: string }) {
  return (
    <section className="mt-16 rounded-[6px] border border-line p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[14px] font-medium text-ink">
            For humans who paste
          </p>
          <p className="prose-measure mt-2 text-[14px] text-muted">
            The same text as{" "}
            <a href="/ai.md" className="link">
              /ai.md
            </a>
            . Paste it into a coding agent before asking for a unit.
          </p>
        </div>
        <CopyButton
          text={markdown}
          label="Copy this page as a prompt"
          event="copy_ai_page"
          eventProps={{ bytes: markdown.length }}
          variant="solid"
        />
      </div>
    </section>
  );
}
