"use client";

// UnitLive.tsx — the unit's own mechanic, running, instead of a recording of it running.
//
// The panel is a component stage, not a phone: a hairline box with the component centred
// on it, the unit's Swift parameters as controls to its left, and the measurement lane
// under it. There is no device frame and no empty screen around the button, because
// neither is the unit — the unit is the button and what it does when you press it.
//
// Everything is wired to the same numbers:
//   · the sliders are the Swift signature (see live/params.ts), so the usage line under
//     them is the call the stage is actually running;
//   · 1 pt = 1 px on this stage, so the 300 × 52 pt capsule is 300 × 52 px and nothing is
//     scaled through a frame width;
//   · the lane runs LIVE from the press — the playhead starts at t = 0 on pointer-down and
//     each marker appears at the moment its event fires. The last run stays drawn until
//     the next press or Reset.
//
// The recording is still one click away; it is just no longer the thing on the page.

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { CopyButton } from "./CopyButton";
import { MeasurementLane } from "./MeasurementLane";
import { SectionHeading } from "./SectionHeading";
import { ParamPanel } from "./live/ParamPanel";
import { LivePress, type LivePortProps } from "./live/LivePress";
import { LiveRewardBurst } from "./live/LiveRewardBurst";
import { LiveSuccessCheck } from "./live/LiveSuccessCheck";
import { useLatest } from "./live/motion";
import { defaultValues, type ParamValues } from "./live/params";
import { trackLivePress, useLiveTimeline } from "./live/useLiveTimeline";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { TimelineLane } from "@/lib/types";

/** `slow ×4` stretches every duration in the ports, the way the demo's own toggle does. */
const SLOW_FACTOR = 4;

/**
 * The parameter panel's track. Declared once because the measurement lane repeats it with
 * an empty first cell, which is what keeps the lane exactly as wide as the stage.
 */
const SPLIT = "sm:grid-cols-[208px_minmax(0,1fr)]";

/**
 * The parameter column's container. `live/*` is not restyled from the inside; this wrapper
 * sets the control column's tone and carries the accent onto its two live controls: the
 * slider (thumb and filled track, through `accent-color`) and a toggle's `true`. `grid`
 * stretches the panel to the row, so its divider runs the stage's full height.
 */
const PARAM_COLUMN = [
  "grid bg-surface-2",
  "[&_input[type=range]]:accent-accent",
  "[&_button[aria-pressed=true]]:bg-accent-soft",
  "[&_button[aria-pressed=true]]:text-accent-text",
].join(" ");

const PORTS: Record<string, ComponentType<LivePortProps>> = {
  press: LivePress,
  "success-check": LiveSuccessCheck,
  "reward-burst": LiveRewardBurst,
};

/**
 * Where the haptic row sits inside MeasurementLane's viewBox (360 × 104, plot 46 → 352,
 * haptic row y = 72). Kept here because the flash is an overlay on that instrument; if the
 * lane's geometry moves, these four numbers move with it.
 */
const HAPTIC_ROW = {
  left: `${(46 / 360) * 100}%`,
  width: `${((352 - 46) / 360) * 100}%`,
  top: `${((72 - 9) / 104) * 100}%`,
  height: `${(18 / 104) * 100}%`,
};

type Props = {
  unitId: string;
  unitName: string;
  swiftFileName: string;
  swiftSource: string;
  coreFileName: string;
  coreSource: string;
  lane: TimelineLane;
  axisMs: number;
  tickMs: number;
};

export function UnitLive({
  unitId,
  unitName,
  swiftFileName,
  swiftSource,
  coreFileName,
  coreSource,
  lane,
  axisMs,
  tickMs,
}: Props) {
  const reduced = useReducedMotion();
  const [slow, setSlow] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [values, setValues] = useState<ParamValues>(() => defaultValues(unitId));
  const timeScale = slow ? SLOW_FACTOR : 1;

  const { start, emit, reset, headMs, fired, hapticPulse } = useLiveTimeline(
    axisMs,
    timeScale,
  );

  const pulseRef = useRef<HTMLDivElement | null>(null);
  const scaleRef = useLatest(timeScale);

  const onPress = useCallback(() => {
    start();
    trackLivePress(unitId);
  }, [start, unitId]);

  const onReset = useCallback(() => {
    reset();
    setResetKey((n) => n + 1);
  }, [reset]);

  const setParam = useCallback((key: string, value: number | boolean) => {
    setValues((current) => ({ ...current, [key]: value }));
  }, []);

  const toggleSlow = useCallback(() => {
    // A run half in one time scale and half in the other would be a lie on the lane.
    setSlow((current) => !current);
    onReset();
  }, [onReset]);

  // Haptics cannot be felt on the web, so the haptic row flashes at the instant the unit
  // would have fired the Taptic Engine. Web Animations, not CSS: `globals.css` puts a
  // 120 ms transition on every element and this needs its own curve.
  useEffect(() => {
    if (hapticPulse === 0 || reduced) return;
    pulseRef.current?.animate([{ opacity: 0.24 }, { opacity: 0 }], {
      duration: 380 * scaleRef.current,
      easing: "ease-out",
    });
  }, [hapticPulse, reduced, scaleRef]);

  // The lane shows what has actually happened in this run: the numbers are the unit's
  // declared budget (src/data/lanes.json), the presence of a marker is the live event.
  const liveLane: TimelineLane = useMemo(
    () => ({
      label: lane.label,
      rows: lane.rows.map((row) => ({
        ...row,
        marks: row.marks.filter((mark) => fired.has(mark.id)),
        emptyCaption: row.id === "visual" ? "press the button to run it" : undefined,
      })),
    }),
    [lane, fired],
  );

  const Port = PORTS[unitId];
  const recording = `/media/${unitId}-full.mp4`;

  return (
    <>
      <section>
        <SectionHeading id="live-example" title="Live example" />

        <div className="mt-4 overflow-hidden rounded-[6px] border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-end gap-2 border-b border-line px-4 py-3">
            <CopyButton
              text={swiftSource}
              label="Copy Swift"
              event="copy_unit"
              eventProps={{ unit: unitId, file: swiftFileName }}
              variant="solid"
              size="sm"
            />
            <CopyButton
              text={coreSource}
              label={`Copy ${coreFileName}`}
              event="copy_core"
              eventProps={{ file: coreFileName, from: unitId }}
              size="sm"
            />
          </div>

          <div className={`grid ${SPLIT}`}>
            <div className={PARAM_COLUMN}>
              <ParamPanel unitId={unitId} values={values} onChange={setParam} />
            </div>

            <div className="flex h-[240px] items-center justify-center overflow-hidden px-4 sm:h-[320px]">
              {Port ? (
                <Port
                  reduced={reduced}
                  timeScale={timeScale}
                  onPress={onPress}
                  emit={emit}
                  resetKey={resetKey}
                  params={values}
                />
              ) : (
                <span className="mono text-center text-[11px] leading-tight text-muted">
                  no web port for {unitId} yet
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
            <button
              type="button"
              onClick={toggleSlow}
              aria-pressed={slow}
              className={`mono rounded-[6px] px-2.5 py-1 text-[11px] ${
                slow
                  ? "bg-ink text-bg"
                  : "border border-line text-muted hover:border-ink hover:text-ink"
              }`}
            >
              slow ×4
            </button>
            <button
              type="button"
              onClick={onReset}
              className="mono rounded-[6px] border border-line px-2.5 py-1 text-[11px] text-muted hover:border-ink hover:text-ink"
            >
              Reset
            </button>
            <span className="mono text-[11px] text-muted">
              {`${unitName} · every duration ${slow ? "×4" : "×1"}`}
            </span>
          </div>
        </div>

        <p className="mt-2 text-right">
          <a
            href={recording}
            target="_blank"
            rel="noreferrer"
            className="link mono text-[11px]"
          >
            Watch the iOS recording ↗
          </a>
        </p>
      </section>

      <section className="mt-12">
        <SectionHeading id="measurement" title="Measurement" />

        {/* Same split as the panel, with the parameter column left empty: the lane is
            exactly as wide as the stage it measures, and t = 0 sits under the button. */}
        <div className={`mt-4 grid ${SPLIT}`}>
          <div className="hidden sm:block" />
          <div className="sm:px-4">
            <div className="relative">
              <MeasurementLane
                lane={liveLane}
                axisMs={axisMs}
                tickMs={tickMs}
                playheadMs={headMs}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 top-3"
              >
                <div
                  ref={pulseRef}
                  className="absolute rounded-[2px] bg-ink"
                  style={{ ...HAPTIC_ROW, opacity: 0, transition: "none" }}
                />
              </div>
            </div>
            <p className="mono mt-2 text-[11px] text-muted">
              haptic shown, not felt: the web has no Taptic Engine
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
