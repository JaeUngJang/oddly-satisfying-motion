"use client";

import { useMemo, useState } from "react";
import { AXIS_TONE } from "./TagChips";
import { UnitTile } from "./UnitTile";
import type { UnitTags, UnitTile as Tile } from "@/lib/types";

type Axis = keyof UnitTags;

// Canonical axis vocabularies. Values a unit does not carry show a 0 count,
// which is itself information: the catalog says what it does not cover yet.
const AXES: { axis: Axis; label: string; values: string[] }[] = [
  {
    axis: "surface",
    label: "Surface",
    values: ["button", "card", "sheet", "list-item", "toggle", "tab-bar"],
  },
  {
    axis: "trigger",
    label: "Trigger",
    values: ["tap", "long-press", "swipe", "appear", "complete", "error"],
  },
  {
    axis: "intent",
    label: "Intent",
    values: ["convert", "confirm", "reward", "guide", "delight"],
  },
];

function countFor(tiles: Tile[], axis: Axis, value: string) {
  return tiles.filter((tile) => tile.tags[axis]?.includes(value)).length;
}

export function Catalog({ tiles }: { tiles: Tile[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string[]>([]);

  const toggle = (key: string) =>
    setActive((current) =>
      current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key],
    );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return tiles.filter((tile) => {
      if (needle) {
        const haystack = [
          tile.name,
          tile.id,
          tile.summary,
          ...tile.builtWith,
          ...Object.values(tile.tags).flat(),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }

      // AND across axes, OR inside one axis.
      return AXES.every(({ axis }) => {
        const wanted = active
          .filter((key) => key.startsWith(`${axis}:`))
          .map((key) => key.slice(axis.length + 1));
        if (wanted.length === 0) return true;
        return wanted.some((value) => tile.tags[axis]?.includes(value));
      });
    });
  }, [tiles, query, active]);

  const dirty = active.length > 0 || query.trim().length > 0;

  const clear = () => {
    setActive([]);
    setQuery("");
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-10">
      <aside className="rounded-[6px] bg-surface-2 p-4 lg:sticky lg:top-20 lg:self-start">
        <label htmlFor="unit-search" className="sr-only">
          Search units
        </label>
        <input
          id="unit-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="name, api, tag"
          className="mono w-full rounded-[6px] border border-line bg-bg px-2.5 py-2 text-[12px] text-ink placeholder:text-muted hover:border-ink focus:border-ink"
        />

        <div className="mt-7 space-y-7">
          {AXES.map(({ axis, label, values }) => (
            <div key={axis}>
              <p className="eyebrow flex items-center gap-2 text-muted">
                <span
                  aria-hidden
                  className={`size-2 shrink-0 rounded-[2px] ${AXIS_TONE[axis].swatch}`}
                />
                {label}
              </p>
              <ul className="mt-2.5">
                {values.map((value) => {
                  const key = `${axis}:${value}`;
                  const count = countFor(tiles, axis, value);
                  const on = active.includes(key);
                  const empty = count === 0;
                  // Disabled rows go faint rather than 40% opacity: the 0 is
                  // information and should stay readable (3.1:1, not 1.7:1).
                  const tone = empty
                    ? "border-transparent text-faint"
                    : on
                      ? "border-accent text-accent-text hover:bg-bg active:scale-[0.98]"
                      : "border-transparent text-muted hover:bg-bg hover:text-ink active:scale-[0.98]";
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        disabled={empty}
                        onClick={() => toggle(key)}
                        aria-pressed={on}
                        className={`flex w-full items-center justify-between gap-2 border-l py-1 pl-2.5 text-left text-[13px] ${tone}`}
                      >
                        <span>{value}</span>
                        <span className="mono text-[11px]">{count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div>
            <p className="eyebrow text-muted">Platform</p>
            <ul className="mt-2.5">
              <li className="flex items-center justify-between gap-2 border-l border-ink py-1 pl-2.5 text-[13px] text-ink">
                <span>SwiftUI</span>
                <span className="mono text-[11px]">{tiles.length}</span>
              </li>
              <li className="flex items-center justify-between gap-2 border-l border-transparent py-1 pl-2.5 text-[13px] text-faint">
                <span>Compose</span>
                <span className="mono text-[11px]">0 · soon</span>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
          <h2 className="text-[20px] font-semibold tracking-tight text-ink">
            Buttons
          </h2>
          <p className="mono flex items-baseline gap-4 text-[11px] text-muted">
            <span>
              {`${visible.length} unit${visible.length === 1 ? "" : "s"}`}
            </span>
            {dirty && (
              <button
                type="button"
                onClick={clear}
                className="link active:scale-[0.98]"
              >
                Clear filters
              </button>
            )}
          </p>
        </div>

        {visible.length === 0 ? (
          <p className="mono mt-6 text-[12px] text-muted">
            no units match. clear the filters.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((tile) => (
              <UnitTile key={tile.id} tile={tile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
