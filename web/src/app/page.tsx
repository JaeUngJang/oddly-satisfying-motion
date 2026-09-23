import { Catalog } from "@/components/Catalog";
import { Community } from "@/components/Community";
import { getUnitTiles } from "@/lib/units";

// What we can defend, in the order we can defend it. Measured per unit by the
// demo probe; see each unit page for the lane.
const SPECS: [term: string, value: string][] = [
  ["Haptic", "Within 50 ms of touch"],
  ["First frame", "Within 85 ms of touch"],
  ["Frame timing", "0 dropped at 60 Hz, 120 Hz device run pending"],
  ["Accessibility", "Reduce Motion honored, haptics optional"],
];

export default function Home() {
  const tiles = getUnitTiles();

  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1200px] px-4 pb-14 pt-16 sm:px-6 lg:pt-24">
          {/* 32px at phone width so the line breaks twice, not three times. */}
          <h1 className="text-balance text-[32px] font-medium leading-[1.05] tracking-[-0.02em] text-ink sm:text-4xl md:text-5xl">
            Ship with AI. Don&apos;t ship like AI.
          </h1>
          <p className="prose-measure mt-5 text-[15px] text-muted">
            Animated SwiftUI button units with haptics and timing. Copy two
            files. Nothing to configure.
          </p>
        </div>
      </section>

      <div
        id="units"
        className="mx-auto max-w-[1200px] scroll-mt-20 px-4 pb-14 pt-10 sm:px-6"
      >
        <dl className="mb-10 divide-y divide-line">
          {SPECS.map(([term, value]) => (
            <div
              key={term}
              className="grid grid-cols-1 items-baseline gap-x-6 py-2.5 sm:grid-cols-[160px_1fr]"
            >
              <dt className="text-[14px] text-faint">{term}</dt>
              <dd className="mono text-[12px] leading-snug text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="prose-measure mb-10 text-[13px] text-muted">
          We don&apos;t claim conversion lift. Nobody has a controlled test that
          shows it. We publish specs instead.
        </p>

        <Catalog tiles={tiles} />
      </div>

      <Community />
    </>
  );
}
