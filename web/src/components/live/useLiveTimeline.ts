"use client";

// useLiveTimeline.ts — the bus between a port and the measurement lane.
//
// A port calls `start()` on pointer-down (that instant is t = 0) and `emit()` as each
// thing actually happens. The lane draws only the markers that have fired, so the run
// you just performed is the run you are looking at.
//
// Marker ids are the ids in `src/data/lanes.json`: the lane owns the NUMBERS (they are
// the measured budget), the port owns the MOMENT. Keep the two id sets in step.
//
// One kind of mark has no budget to own its number: a cancel or a release happens whenever
// the finger does it. `note()` places those at the playhead's time when they happen, so the
// lane shows a drag-off where it actually was. Marks declared `anchor: "release"` are budgets
// counted from the release; `anchor()` records where that was, so the lane can draw them
// from there. Either can land past the axis (a long hold), so the run's axis grows, in whole
// ticks, to keep them on it.

import { useCallback, useEffect, useRef, useState } from "react";
import { useLatest } from "./motion";
import { track, type WowEvent } from "@/lib/track";
import type { TimelineMark } from "@/lib/types";

export type LiveRow = "visual" | "haptic";

/** A mark timed live rather than by a budget. */
export type LiveNote = { row: LiveRow; mark: TimelineMark };

// `lib/track.ts` belongs to another change in flight, so this event is not in its union
// yet. One cast, in one place, rather than a second copy of the tracker.
const LIVE_PRESS = "live_press" as unknown as WowEvent;

/** Fired once per completed press (`released`), never for a cancelled or interrupted one. */
export function trackLivePress(unit: string) {
  track(LIVE_PRESS, { unit });
}

export type LiveTimeline = {
  /** Marks t = 0 and clears the previous run. */
  start: () => void;
  /** Lights marker `id` on `row`. */
  emit: (row: LiveRow, id: string) => void;
  /**
   * Places a mark on `row` at the current playhead time and returns that time in unit ms,
   * or null (and places nothing) when no run is on the lane.
   */
  note: (row: LiveRow, mark: { label: string; hollow?: boolean }) => number | null;
  /** The release happened at `ms`; marks anchored to it run `tailMs` past it. */
  anchor: (ms: number, tailMs: number) => void;
  /** Back to nothing drawn. */
  reset: () => void;
  /** Playhead position in UNIT milliseconds, or null before the first press. */
  headMs: number | null;
  /** Markers that have fired in this run. */
  fired: ReadonlySet<string>;
  /** Live-timed marks in this run, in the order they happened. */
  notes: readonly LiveNote[];
  /** Unit ms of this run's release, or null before it (or when the press did not release). */
  releaseMs: number | null;
  /** This run's axis: the lane's own, grown in whole ticks when a late event needs it. */
  axisMs: number;
  /** Increments on every haptic emit; the lane flashes its haptic row off this. */
  hapticPulse: number;
};

const EMPTY: ReadonlySet<string> = new Set();
const NO_NOTES: readonly LiveNote[] = [];

/**
 * @param axisMs  end of the lane's axis; the playhead sweeps 0…axisMs and parks there.
 * @param tickMs  the axis grows in steps of this, so a grown axis still ends on a tick.
 * @param timeScale 1, or 4 while `slow ×4` is on. The playhead divides by it, so markers
 *                  keep landing on the millisecond the unit actually commits to.
 */
export function useLiveTimeline(
  axisMs: number,
  tickMs: number,
  timeScale: number,
): LiveTimeline {
  const [headMs, setHeadMs] = useState<number | null>(null);
  const [fired, setFired] = useState<ReadonlySet<string>>(EMPTY);
  const [notes, setNotes] = useState<readonly LiveNote[]>(NO_NOTES);
  const [releaseMs, setReleaseMs] = useState<number | null>(null);
  const [runAxisMs, setRunAxisMs] = useState(axisMs);
  const [hapticPulse, setHapticPulse] = useState(0);

  /** performance.now() at t = 0, or null while no run is on the lane. */
  const t0 = useRef<number | null>(null);
  /** The run's axis as the sweep reads it each frame, so it can grow mid-run. */
  const axis = useRef(axisMs);
  const frame = useRef(0);
  const scale = useLatest(timeScale);

  const stop = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
  }, []);

  /** Moves the playhead from `origin` to the axis, then parks it there. */
  const sweep = useCallback(
    (origin: number) => {
      const loop = () => {
        const unitMs = (performance.now() - origin) / scale.current;
        if (unitMs >= axis.current) {
          setHeadMs(axis.current);
          frame.current = 0;
          return;
        }
        setHeadMs(unitMs);
        frame.current = requestAnimationFrame(loop);
      };
      frame.current = requestAnimationFrame(loop);
    },
    [scale],
  );

  const start = useCallback(() => {
    stop();
    const origin = performance.now();
    t0.current = origin;
    axis.current = axisMs;
    setRunAxisMs(axisMs);
    setReleaseMs(null);
    setFired(EMPTY);
    setNotes(NO_NOTES);
    setHeadMs(0);
    sweep(origin);
  }, [axisMs, stop, sweep]);

  /** Grows the run's axis, in whole ticks, to reach `ms`; a parked playhead sweeps on. */
  const extend = useCallback(
    (ms: number) => {
      const origin = t0.current;
      if (origin === null) return;
      const needed = Math.ceil(ms / tickMs) * tickMs;
      if (needed <= axis.current) return;
      axis.current = needed;
      setRunAxisMs(needed);
      if (!frame.current) sweep(origin);
    },
    [sweep, tickMs],
  );

  const emit = useCallback((row: LiveRow, id: string) => {
    setFired((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
    if (row === "haptic") setHapticPulse((n) => n + 1);
  }, []);

  const note = useCallback(
    (row: LiveRow, mark: { label: string; hollow?: boolean }) => {
      const origin = t0.current;
      if (origin === null) return null;
      const t = Math.round((performance.now() - origin) / scale.current);
      setNotes((current) => [
        ...current,
        { row, mark: { ...mark, id: `note-${current.length}`, t } },
      ]);
      extend(t);
      return t;
    },
    [extend, scale],
  );

  const anchor = useCallback(
    (ms: number, tailMs: number) => {
      if (t0.current === null) return;
      setReleaseMs(ms);
      extend(ms + tailMs);
    },
    [extend],
  );

  const reset = useCallback(() => {
    stop();
    t0.current = null;
    axis.current = axisMs;
    setRunAxisMs(axisMs);
    setReleaseMs(null);
    setHeadMs(null);
    setFired(EMPTY);
    setNotes(NO_NOTES);
  }, [axisMs, stop]);

  useEffect(() => stop, [stop]);

  return {
    start,
    emit,
    note,
    anchor,
    reset,
    headMs,
    fired,
    notes,
    releaseMs,
    axisMs: runAxisMs,
    hapticPulse,
  };
}
