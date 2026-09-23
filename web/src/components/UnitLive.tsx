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
//     the next press or Reset;
//   · the phase readout under the button is the press's `WowPressPhase` as it happens,
//     kept the same way: the phase a press ended in stays until the next press or Reset.
//     A cancel or a release is a ring on the lane's visual row at the moment it happened,
//     with nothing on the haptic row, because neither plays a haptic;
//   · units triggered by completion (success-check, reward-burst) run on the release, the
//     Button's action: their marks are declared from the release in lanes.json, so the lane
//     reads tap at 0 → released at N → the sequence from N, and a press dragged off or
//     taken by the system runs nothing.
//
// The recording is still one click away; it is just no longer the thing on the page.
//
// A unit whose web port has not been written yet still gets this panel: the iOS
// recording on the stage when there is one, otherwise a line saying so. The copy buttons
// work either way; the parameters and the live lane wait for the port.
//
// Units declared in live/stage.ts (loading-morph, hold-fill, icon-swap, label-roll,
// failure-shake) take Strings and Optionals as well, so their column is StagePanel and their
// values are `StageValues`; the first three ports still receive the number-and-switch view
// of them as `params`. Two things change for them only:
//   · the readout is the unit's own states (unit.json `states`) as the port reports them,
//     `idle` included: unlike a press's, a unit's idle is where a sequence lands (a re-armed
//     shake, a settled roll), not an instant that follows the outcome. hold-fill's states ARE
//     `WowPressPhase`, so they arrive as phases and read like the press unit's;
//   · a budget that is a parameter of the call (hold-fill's `duration`) is redrawn for the
//     values the run started with, and the run's axis is long enough for it from t = 0.

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { CopyButton } from "./CopyButton";
import { MeasurementLane } from "./MeasurementLane";
import { SectionHeading } from "./SectionHeading";
import { VideoPane } from "./VideoPane";
import type { PressPhase } from "./live/IOSButton";
import { ParamPanel } from "./live/ParamPanel";
import { LiveFailureShake } from "./live/LiveFailureShake";
import { LiveHoldFill } from "./live/LiveHoldFill";
import { LiveIconSwap } from "./live/LiveIconSwap";
import { LiveLabelRoll } from "./live/LiveLabelRoll";
import { LiveLoadingMorph } from "./live/LiveLoadingMorph";
import { LivePress } from "./live/LivePress";
import { LiveRewardBurst } from "./live/LiveRewardBurst";
import { LiveSuccessCheck } from "./live/LiveSuccessCheck";
import { useLatest } from "./live/motion";
import { defaultValues } from "./live/params";
import {
  laneAxis,
  paramView,
  stageDefaults,
  stageLane,
  stageUnit,
  type StageCueHandler,
  type StagePortProps,
  type StageValue,
  type StageValues,
} from "./live/stage";
import { StagePanel } from "./live/StagePanel";
import { trackLivePress, useLiveTimeline } from "./live/useLiveTimeline";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { TimelineLane, TimelineMark } from "@/lib/types";

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

const PORTS: Record<string, ComponentType<StagePortProps>> = {
  press: LivePress,
  "success-check": LiveSuccessCheck,
  "reward-burst": LiveRewardBurst,
  "loading-morph": LiveLoadingMorph,
  "hold-fill": LiveHoldFill,
  "icon-swap": LiveIconSwap,
  "label-roll": LiveLabelRoll,
  "failure-shake": LiveFailureShake,
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
  /** web/public/media/<id>-full.mp4 exists. Checked by the page at build time. */
  hasRecording: boolean;
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
  hasRecording,
}: Props) {
  const reduced = useReducedMotion();
  const [slow, setSlow] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const stage = stageUnit(unitId);
  const [values, setValues] = useState<StageValues>(() =>
    stageUnit(unitId) ? stageDefaults(unitId) : defaultValues(unitId),
  );
  /** The values the run on the lane started with: its budgets are drawn from these. */
  const [runValues, setRunValues] = useState<StageValues>(values);
  const [phase, setPhase] = useState<PressPhase>("idle");
  /** The unit's own state, for ports that report one; null until the first. */
  const [unitState, setUnitState] = useState<string | null>(null);
  const cueRef = useRef<StageCueHandler | null>(null);
  const params = useMemo(() => paramView(values), [values]);
  const timeScale = slow ? SLOW_FACTOR : 1;

  // The lane as the current call declares it (the next run's axis comes from this one), and
  // as the call the run on the lane was made with declares it (that run is drawn from this).
  const nextLane = useMemo(() => stageLane(unitId, lane, values), [unitId, lane, values]);
  const runLane = useMemo(() => stageLane(unitId, lane, runValues), [unitId, lane, runValues]);
  const baseAxisMs = useMemo(() => laneAxis(nextLane, axisMs, tickMs), [nextLane, axisMs, tickMs]);

  const {
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
  } = useLiveTimeline(baseAxisMs, tickMs, timeScale);

  // How far past the release the marks declared from it run: the run's axis has to reach
  // that far, or a long hold would push the end of the sequence off the lane.
  const releaseTailMs = useMemo(
    () =>
      Math.max(
        0,
        ...runLane.rows.flatMap((row) =>
          row.marks
            .filter((mark) => mark.anchor === "release")
            .map((mark) => mark.to ?? mark.t ?? 0),
        ),
      ),
    [runLane],
  );

  const pulseRef = useRef<HTMLDivElement | null>(null);
  const scaleRef = useLatest(timeScale);

  // Touch-down starts the lane; `live_press` waits for `released`. A press dragged off or
  // taken by the system is not one anybody completed, so it is not counted as one.
  // `idle` arrives the instant a press is over; showing it would wipe the outcome before
  // anyone could read it, so the readout keeps the phase the press ended in.
  const onPhaseChange = useCallback(
    (next: PressPhase) => {
      if (next !== "idle") setPhase(next);
      if (next === "cancelled") note("visual", { label: "cancelled", hollow: true });
      if (next === "released") {
        // The action: marked where it happened, and the origin of every mark declared
        // from the release. The button reports this before it runs the action.
        const at = note("visual", { label: "released", hollow: true });
        if (at !== null) anchor(at, releaseTailMs);
        trackLivePress(unitId);
      }
    },
    [anchor, note, releaseTailMs, unitId],
  );

  /** t = 0: the run starts, and its budgets are the call as it stands now. */
  const begin = useCallback(() => {
    setRunValues(values);
    start();
  }, [start, values]);

  const onCue = useCallback((key: string) => cueRef.current?.cue(key), []);

  const onReset = useCallback(() => {
    reset();
    setPhase("idle");
    setUnitState(null);
    setResetKey((n) => n + 1);
  }, [reset]);

  const setParam = useCallback((key: string, value: StageValue) => {
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

  const verb = stage?.verb ?? "press";

  // The lane shows what has actually happened in this run: the numbers are the unit's
  // declared budget (src/data/lanes.json), the presence of a marker is the live event.
  // A mark declared from the release keeps its budget, counted from where the release
  // happened in this run, so every number on the lane is on the same touch-down clock.
  const liveLane: TimelineLane = useMemo(() => {
    const place = (mark: TimelineMark): TimelineMark => {
      if (mark.anchor !== "release" || releaseMs === null) return mark;
      const shift = (ms: number | undefined) => (ms === undefined ? undefined : ms + releaseMs);
      return { ...mark, t: shift(mark.t), from: shift(mark.from), to: shift(mark.to) };
    };
    return {
      label: runLane.label,
      rows: runLane.rows.map((row) => ({
        ...row,
        marks: [
          ...row.marks.filter((mark) => fired.has(mark.id)).map(place),
          ...notes.filter((item) => item.row === row.id).map((item) => item.mark),
        ],
        emptyCaption: row.id === "visual" ? `${verb} the button to run it` : undefined,
      })),
    };
  }, [runLane, fired, notes, releaseMs, verb]);

  // Never assume a port: units land in index.json before their web port is written.
  const Port: ComponentType<StagePortProps> | undefined = PORTS[unitId];
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

          {Port ? (
            <>
              <div className={`grid ${SPLIT}`}>
                <div className={PARAM_COLUMN}>
                  {stage ? (
                    <StagePanel
                      unitId={unitId}
                      values={values}
                      onChange={setParam}
                      onCue={onCue}
                    />
                  ) : (
                    <ParamPanel unitId={unitId} values={params} onChange={setParam} />
                  )}
                </div>

                <div className="relative flex h-[240px] items-center justify-center overflow-hidden px-4 sm:h-[320px]">
                  <Port
                    reduced={reduced}
                    timeScale={timeScale}
                    onPress={begin}
                    onPhaseChange={onPhaseChange}
                    emit={emit}
                    resetKey={resetKey}
                    params={params}
                    values={values}
                    onStateChange={setUnitState}
                    cues={cueRef}
                  />
                  <p
                    aria-live="polite"
                    className="mono pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] text-muted"
                  >
                    {stage?.readout === "state"
                      ? `state · ${unitState ?? "idle"}`
                      : `phase · ${phase}`}
                  </p>
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
            </>
          ) : (
            // No port yet: the recording is the best honest stand-in, and when there is
            // none either the stage says so rather than showing an empty box.
            <div className="flex h-[240px] items-center justify-center overflow-hidden px-4 py-3 sm:h-[320px]">
              {hasRecording ? (
                <div className="aspect-[9/19.5] h-full">
                  <VideoPane
                    src={recording}
                    label={`${unitName}, recorded on iOS`}
                    reduced={reduced}
                  />
                </div>
              ) : (
                <p className="mono text-center text-[11px] leading-tight text-muted">
                  live preview coming; copy the Swift and run it
                </p>
              )}
            </div>
          )}
        </div>

        {hasRecording && (
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
        )}
      </section>

      <section className="mt-12">
        <SectionHeading id="measurement" title="Measurement" />

        {Port ? (
          // Same split as the panel, with the parameter column left empty: the lane is
          // exactly as wide as the stage it measures, and t = 0 sits under the button.
          <div className={`mt-4 grid ${SPLIT}`}>
            <div className="hidden sm:block" />
            <div className="sm:px-4">
              <div className="relative">
                <MeasurementLane
                  lane={liveLane}
                  axisMs={runAxisMs}
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
        ) : (
          // The lane only ever draws a run that happened; without a port nothing runs.
          <p className="mono mt-4 text-[11px] text-muted">
            the live lane arrives with the live preview
          </p>
        )}
      </section>
    </>
  );
}
