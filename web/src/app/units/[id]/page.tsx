import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CodeBlock } from "@/components/CodeBlock";
import { CommunityLink } from "@/components/CommunityLink";
import { CopyButton } from "@/components/CopyButton";
import { Disclosure } from "@/components/Disclosure";
import { PortabilityTable } from "@/components/PortabilityTable";
import { SectionHeading } from "@/components/SectionHeading";
import { StatesTable } from "@/components/StatesTable";
import { TagChips } from "@/components/TagChips";
import { UnitLive } from "@/components/UnitLive";
import { UnitTile } from "@/components/UnitTile";
import { ISSUES_URL } from "@/lib/site";
import { getCatalog, getUnitIds, getUnitTiles, hasMedia } from "@/lib/units";
import lanesData from "@/data/lanes.json";
import portabilityData from "@/data/portability.json";
import type { Portability, TimelineLane, UnitLanes } from "@/lib/types";

const lanes = lanesData as unknown as UnitLanes;
const portability = portabilityData as unknown as Portability;

/** Date the units and the portability run were last verified. */
const VERIFIED_ON = "2026-09-23";

const TOC = [
  ["live-example", "Live example"],
  ["measurement", "Measurement"],
  ["source-code", "Source code"],
  ["portability", "Portability"],
  ["related", "Related"],
] as const;

export function generateStaticParams() {
  return getUnitIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const unit = getCatalog().units.find((u) => u.id === id);
  if (!unit) return {};
  // The root layout supplies the "· Oddly Satisfying Motion" suffix through its template.
  return { title: unit.name, description: unit.summary };
}

export default async function UnitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { core, units } = getCatalog();
  const unit = units.find((u) => u.id === id);
  if (!unit) notFound();

  const platform = unit.platforms.swiftui;
  const related = getUnitTiles().filter((tile) => tile.id !== unit.id);
  const lane: TimelineLane = lanes.units[unit.id] ?? {
    label: unit.name,
    rows: [],
  };

  // unit.json `states` is optional until every unit declares it; no table, no TOC entry.
  const states = unit.states ?? [];
  const toc = states.length > 0 ? [["states", "States"] as const, ...TOC] : TOC;

  const chips = [
    `haptic ≤ ${unit.spec.hapticBudgetMs} ms`,
    `first frame ≤ ${unit.spec.visualBudgetMs} ms`,
    `haptic length ≤ ${unit.spec.hapticMaxDurationMs} ms`,
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
      {/* minmax(0,1fr) on the single-column track: without it the code blocks'
          min-content width blows the grid past the viewport at phone widths. */}
      <div className="grid gap-10 grid-cols-[minmax(0,1fr)] lg:grid-cols-[180px_minmax(0,720px)]">
        <div className="hidden lg:block" />

        <header>
          <p className="eyebrow text-muted">
            <Link href="/" className="hover:text-ink hover:underline">
              Units
            </Link>
            <span className="text-faint">{" / "}</span>
            Buttons
            <span className="text-faint">{" / "}</span>
            <span aria-current="page" className="text-accent-text">
              {unit.name}
            </span>
          </p>

          <h1 className="mt-4 text-[32px] font-medium leading-[1.1] tracking-[-0.02em] text-ink">
            {unit.name}
          </h1>

          <p className="prose-measure mt-3 text-[15px] text-muted">
            {unit.summary}
          </p>

          <TagChips tags={unit.tags} className="mt-4" />

          {/* Two short lines instead of one dot-joined strip. */}
          <div className="mt-5 border-t border-line pt-3">
            <p className="eyebrow text-muted">
              {`SwiftUI, iOS ${platform.minIOS} or later`}
            </p>
            <p className="eyebrow mt-1 text-muted">{`Updated ${VERIFIED_ON}`}</p>
          </div>

          <ul className="mt-3 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <li
                key={chip}
                className="mono rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent-text"
              >
                {chip}
              </li>
            ))}
          </ul>
        </header>

        <aside className="hidden min-w-0 lg:block lg:sticky lg:top-20 lg:self-start">
          <p className="eyebrow text-muted">On this page</p>
          <ul className="mt-2.5 space-y-1">
            {toc.map(([anchor, label]) => (
              <li key={anchor}>
                <a
                  href={`#${anchor}`}
                  className="text-[13px] text-muted hover:text-ink hover:underline"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>

          <p className="eyebrow mt-8 text-muted">Built with</p>
          <ul className="mt-2.5 space-y-1">
            {unit.builtWith.map((item) => (
              <li key={item} className="mono text-[12px] leading-snug text-muted [overflow-wrap:anywhere]">
                {item}
              </li>
            ))}
          </ul>
        </aside>

        <div>
          {states.length > 0 && (
            <section className="mb-12">
              <SectionHeading id="states" title="States" />
              <div className="mt-4">
                <StatesTable states={states} />
              </div>
            </section>
          )}

          <UnitLive
            unitId={unit.id}
            unitName={unit.name}
            swiftFileName={platform.file}
            swiftSource={unit.source}
            coreFileName={core.fileName}
            coreSource={core.source}
            lane={lane}
            axisMs={lanes.axisMs}
            tickMs={lanes.tickMs}
            hasRecording={hasMedia(`${unit.id}-full.mp4`)}
          />

          <section className="mt-12">
            <SectionHeading id="source-code" title="Source code" />

            <div className="mt-4">
              <CodeBlock code={unit.usage} fileName="usage" />
            </div>

            <div className="mt-3">
              <CodeBlock
                code={unit.source}
                fileName={platform.file}
                action={
                  <CopyButton
                    text={unit.source}
                    label="Copy"
                    event="copy_unit"
                    eventProps={{ unit: unit.id, file: platform.file }}
                    size="sm"
                  />
                }
              />
            </div>

            <div className="mt-3">
              <Disclosure summary={`${core.fileName} · copy once`}>
                <CodeBlock
                  code={core.source}
                  fileName={core.fileName}
                  action={
                    <CopyButton
                      text={core.source}
                      label="Copy"
                      event="copy_core"
                      eventProps={{ file: core.fileName, from: unit.id }}
                      size="sm"
                    />
                  }
                />
              </Disclosure>
            </div>

            <p className="mono mt-4 text-[12px] text-muted">
              Something off in this unit?{" "}
              <CommunityLink
                href={ISSUES_URL}
                eventProps={{ target: "unit_issue", unit: unit.id }}
                className="link"
              >
                Open an issue
                <span aria-hidden>{" ↗"}</span>
              </CommunityLink>
            </p>
          </section>

          <section className="mt-12">
            <SectionHeading id="portability" title="Portability" />
            <div className="mt-4">
              <PortabilityTable data={portability} />
            </div>
          </section>

          <section className="mt-12">
            <SectionHeading id="related" title="Related" />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {related.map((tile) => (
                <UnitTile key={tile.id} tile={tile} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
