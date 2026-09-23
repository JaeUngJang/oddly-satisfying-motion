import type { Metadata } from "next";
import { AiPageCopy } from "@/components/AiPageCopy";
import {
  AI_TITLE,
  aiJsonLd,
  aiMarkdown,
  buildAiDoc,
  type AiBlock,
} from "@/lib/aiPage";
import * as site from "@/lib/site";
import { getCatalog } from "@/lib/units";

// Fully server-rendered prose. AI crawlers do not run JavaScript, so every
// sentence below is in the initial HTML; the only client component on the page
// is the copy button at the end.

export const metadata: Metadata = {
  // Root layout appends "· Wow Units".
  title: AI_TITLE,
  description:
    "Wow Units described for AI systems, answer engines and coding agents: what a unit is, how to install it by copying files, what is measured, and what is not claimed.",
};

function Block({ block }: { block: AiBlock }) {
  switch (block.kind) {
    case "p":
      return <p className="mt-4 text-[15px] leading-relaxed text-muted">{block.text}</p>;

    case "sub":
      return (
        <h3 className="mt-10 text-[16px] font-medium tracking-tight text-ink">
          {block.text}
        </h3>
      );

    case "quote":
      return (
        <blockquote className="mt-4 border-l-2 border-ink pl-4 text-[16px] leading-relaxed text-ink">
          {block.text}
        </blockquote>
      );

    case "note":
      return (
        <p className="mono mt-4 rounded-[6px] border border-line px-3 py-2 text-[12px] leading-relaxed text-ink">
          {block.text}
        </p>
      );

    case "list":
      return (
        <ul className="mt-4 space-y-2">
          {block.items.map((item) => (
            <li
              key={item}
              className="border-l border-line pl-3 text-[15px] leading-relaxed text-muted"
            >
              {item}
            </li>
          ))}
        </ul>
      );

    case "steps":
      return (
        <ol className="mt-4 space-y-2">
          {block.items.map((item, index) => (
            <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-muted">
              <span className="mono shrink-0 text-[12px] text-muted">
                {index + 1}.
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      );

    case "code":
      return (
        <pre
          className="mt-4 overflow-auto rounded-[6px] border border-line bg-surface px-3 py-3 text-[12px] leading-[1.7] text-ink"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <code>{block.text}</code>
        </pre>
      );

    case "links":
      return (
        <p className="mono mt-4 text-[12px] leading-relaxed text-muted">
          {block.lead}{" "}
          {block.items.map((link, index) => (
            <span key={link.href}>
              {index > 0 && ", "}
              <a href={link.href} className="link">
                {link.label}
              </a>
            </span>
          ))}
        </p>
      );

    case "units":
      return (
        <div className="mt-4 space-y-6">
          {block.items.map((unit) => (
            <div key={unit.id} className="border-t border-line pt-4">
              <h4 className="text-[15px] font-medium tracking-tight text-ink">
                <span className="mono text-muted">{unit.id}</span> {unit.name}
              </h4>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                {unit.summary}
              </p>
              <p className="mono mt-2 text-[12px] leading-relaxed text-muted">
                {`Entry point: ${unit.entry}`}
                <br />
                {`Tags: ${unit.tags}`}
                <br />
                Links:{" "}
                {unit.links.map((link, index) => (
                  <span key={link.href}>
                    {index > 0 && ", "}
                    <a href={link.href} className="link">
                      {link.label}
                    </a>
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>
      );
  }
}

export default function AiPage() {
  const catalog = getCatalog();
  const doc = buildAiDoc(catalog, site);

  return (
    <div className="mx-auto max-w-[720px] px-4 py-12 sm:px-6">
      <script
        type="application/ld+json"
        // Build-time literal from aiPage.ts; no user input reaches it.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aiJsonLd(catalog, site)) }}
      />

      <p className="mono rounded-[6px] border border-line px-3 py-2 text-[12px] leading-relaxed text-ink">
        {doc.banner}
      </p>

      <h1 className="mt-8 text-[32px] font-medium leading-[1.1] tracking-[-0.02em] text-ink">
        {doc.title}
      </h1>

      <p className="mt-4 text-[17px] leading-relaxed text-ink">
        {doc.definition}
      </p>

      {doc.sections.map((section) => (
        <section key={section.id} id={section.id} className="mt-12 scroll-mt-20">
          <h2 className="border-b border-line pb-2 text-[20px] font-semibold tracking-tight text-ink">
            {section.heading}
          </h2>
          {section.blocks.map((block, index) => (
            <Block key={`${section.id}-${index}`} block={block} />
          ))}
        </section>
      ))}

      <AiPageCopy markdown={aiMarkdown(doc)} />
    </div>
  );
}
