import { CommunityLink } from "./CommunityLink";
import { CONTRIBUTING_URL, ISSUES_URL, RELEASES_URL } from "@/lib/site";

// Three ways in, all on GitHub. `target` is what community_click records.
const ROWS = [
  {
    target: "request_unit",
    title: "Request a unit",
    line: "Describe what you press, what should happen, and in which app.",
    href: ISSUES_URL,
    label: "New issue",
  },
  {
    target: "contribute",
    title: "Add a unit",
    line: "One folder: a Swift file, a unit.json and a recording. The contract is in the README.",
    href: CONTRIBUTING_URL,
    label: "CONTRIBUTING.md",
  },
  {
    target: "releases",
    title: "Follow new units",
    line: "New units ship as releases, roughly weekly.",
    href: RELEASES_URL,
    label: "Releases",
  },
] as const;

export function Community() {
  return (
    <section id="community" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto max-w-[1200px] px-4 pb-16 pt-14 sm:px-6">
        {/* Split is allowed here because the right column carries the three
            links, not a floating explainer paragraph. On desktop the MCP note
            drops to the foot of the left column, level with the last row; on
            a phone it follows the rows, in source order. */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-0">
          <div>
            <h2 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink">
              Built in the open
            </h2>
            <p className="prose-measure mt-3 text-[14px] text-muted">
              Every unit is free. New units come from what people ask for.
            </p>
          </div>

          {/* Hairlines stay on the rows; the hover fill reaches 12px past them
              (-mx-3) so the text lines up with the heading. */}
          <ul className="divide-y divide-line border-y border-line lg:col-start-2 lg:row-span-2 lg:row-start-1">
            {ROWS.map((row) => (
              <li key={row.target}>
                <CommunityLink
                  href={row.href}
                  eventProps={{ target: row.target }}
                  className="group -mx-3 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1 rounded-[6px] px-3 py-4 hover:bg-surface active:scale-[0.98]"
                >
                  <span className="text-[15px] font-semibold text-ink">
                    {row.title}
                  </span>
                  <span className="mono text-[12px] text-accent-text underline decoration-accent-text/40 decoration-1 underline-offset-2 group-hover:decoration-current">
                    {row.label}
                    <span aria-hidden>{" ↗"}</span>
                  </span>
                  <span className="col-span-2 text-[14px] text-muted">
                    {row.line}
                  </span>
                </CommunityLink>
              </li>
            ))}
          </ul>

          <p className="mono text-[12px] text-muted lg:col-start-1 lg:row-start-2 lg:self-end lg:pb-4">
            MCP install ships next. Until then, copy the two files.
          </p>
        </div>
      </div>
    </section>
  );
}
