"use client";

import Link from "next/link";
import { TagChips } from "./TagChips";
import { VideoPane } from "./VideoPane";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { UnitTile as Tile } from "@/lib/types";

export function UnitTile({ tile }: { tile: Tile }) {
  const reduced = useReducedMotion();

  return (
    <Link
      href={`/units/${tile.id}`}
      className="block overflow-hidden rounded-[6px] border border-line hover:border-ink active:scale-[0.98]"
    >
      {/* No label over the clip: every unit in the catalog is SwiftUI, and the
          sidebar already says so.
          The recordings are opaque near-white (#fdfdfd) edge to edge, so a fill
          behind the video would never show. The --surface-2 mat around it is
          what gives the tile its depth against the white page. */}
      <div className="border-b border-line bg-surface-2 p-3">
        <VideoPane
          src={tile.mediaSrc}
          label={`${tile.name} preview`}
          reduced={reduced}
          shape="card"
          playMode="auto"
        />
      </div>

      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px] text-ink">{tile.name}</span>
          <span className="mono shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent-text">
            {`≤${tile.hapticBudgetMs} ms`}
          </span>
        </div>
        <TagChips tags={tile.tags} className="mt-2" />
      </div>
    </Link>
  );
}
