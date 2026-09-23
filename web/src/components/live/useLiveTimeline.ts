"use client";

// useLiveTimeline.ts — the bus between a port and the measurement lane.
//
// A port calls `start()` on pointer-down (that instant is t = 0) and `emit()` as each
// thing actually happens. The lane draws only the markers that have fired, so the run
// you just performed is the run you are looking at.
//
// Marker ids are the ids in `src/data/lanes.json`: the lane owns the NUMBERS (they are
// the measured budget), the port owns the MOMENT. Keep the two id sets in step.

import { useCallback, useEffect, useRef, useState } from "react";
import { useLatest } from "./motion";
import { track, type WowEvent } from "@/lib/track";

export type LiveRow = "visual" | "haptic";

// `lib/track.ts` belongs to another change in flight, so this event is not in its union
// yet. One cast, in one place, rather than a second copy of the tracker.
const LIVE_PRESS = "live_press" as unknown as WowEvent;

/** Fired once per press, from the port that was pressed. */
export function trackLivePress(unit: string) {
  track(LIVE_PRESS, { unit });
}

export type LiveTimeline = {
  /** Marks t = 0 and clears the previous run. */
  start: () => void;
  /** Lights marker `id` on `row`. */
  emit: (row: LiveRow, id: string) => void;
  /** Back to nothing drawn. */
  reset: () => void;
  /** Playhead position in UNIT milliseconds, or null before the first press. */
  headMs: number | null;
  /** Markers that have fired in this run. */
  fired: ReadonlySet<string>;
  /** Increments on every haptic emit; the lane flashes its haptic row off this. */
  hapticPulse: number;
};

const EMPTY: ReadonlySet<string> = new Set();

/**
 * @param axisMs  end of the lane's axis; the playhead sweeps 0…axisMs and parks there.
 * @param timeScale 1, or 4 while `slow ×4` is on. The playhead divides by it, so markers
 *                  keep landing on the millisecond the unit actually commits to.
 */
export function useLiveTimeline(axisMs: number, timeScale: number): LiveTimeline {
  const [headMs, setHeadMs] = useState<number | null>(null);
  const [fired, setFired] = useState<ReadonlySet<string>>(EMPTY);
  const [hapticPulse, setHapticPulse] = useState(0);

  const t0 = useRef(0);
  const frame = useRef(0);
  const scale = useLatest(timeScale);

  const stop = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
  }, []);

  const start = useCallback(() => {
    stop();
    t0.current = performance.now();
    setFired(EMPTY);
    setHeadMs(0);

    const loop = () => {
      const unitMs = (performance.now() - t0.current) / scale.current;
      if (unitMs >= axisMs) {
        setHeadMs(axisMs);
        frame.current = 0;
        return;
      }
      setHeadMs(unitMs);
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
  }, [axisMs, scale, stop]);

  const emit = useCallback((row: LiveRow, id: string) => {
    setFired((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
    if (row === "haptic") setHapticPulse((n) => n + 1);
  }, []);

  const reset = useCallback(() => {
    stop();
    setHeadMs(null);
    setFired(EMPTY);
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { start, emit, reset, headMs, fired, hapticPulse };
}
