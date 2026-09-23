import type { UnitTags } from "@/lib/types";

type Axis = keyof UnitTags;

/**
 * One muted pastel per catalog axis. `swatch` is the square in front of the
 * sidebar group name, so a chip on a tile keys back to the filter that finds it.
 */
export const AXIS_TONE: Record<Axis, { chip: string; swatch: string }> = {
  surface: { chip: "bg-tag-surface text-tag-surface-fg", swatch: "bg-tag-surface-fg" },
  trigger: { chip: "bg-tag-trigger text-tag-trigger-fg", swatch: "bg-tag-trigger-fg" },
  intent: { chip: "bg-tag-intent text-tag-intent-fg", swatch: "bg-tag-intent-fg" },
};

const ORDER: Axis[] = ["surface", "trigger", "intent"];

export function TagChips({
  tags,
  className = "",
}: {
  tags: UnitTags;
  className?: string;
}) {
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`}>
      {ORDER.flatMap((axis) =>
        (tags[axis] ?? []).map((value) => (
          <li
            key={`${axis}:${value}`}
            className={`rounded-full px-2 py-0.5 text-[11px] leading-[1.5] ${AXIS_TONE[axis].chip}`}
          >
            {/* The color names the axis; this says it for everyone who can't see it. */}
            <span className="sr-only">{`${axis}: `}</span>
            {value}
          </li>
        )),
      )}
    </ul>
  );
}
