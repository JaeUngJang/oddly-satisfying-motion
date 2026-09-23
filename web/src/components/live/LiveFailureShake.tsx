"use client";

// LiveFailureShake.tsx — units/failure-shake/WowFailureShake.swift, in the browser, on the
// demo's recipe (demo/Sources/RecordView.swift):
//
//   Button("Pay $12.00") { … }.wowFailureShake(trigger: rejected)
//
// Straight out of the Swift's `WowShakeRun.pose(at:amplitude:)` and `start()`:
//   pose     x = amplitude · sin(4πp) · (9/8 − p), p = 1 − (1 − t)², t = elapsed / length, linear.
//            +8, −6, +4, −2 pt at the default amplitude (peaks at 24, 82, 151, 247 ms of 400),
//            home at p = 1 with no velocity; outside 0 < t < 1 the pose is exactly (0, 1)
//   length   `duration` clamped to 0.2…1.0 s
//   haptic   .error at t = 0, before any visual work
//   tint     nil or .red. On from the first frame, never animated in; once the motion has landed
//            it eases back over 0.15 s easeOut (`withAnimation(.easeOut(0.15)) { start = nil }`)
//   reduce   no translation: opacity 1 − 0.4·sin(πt) over 0.2 s; same haptic, same tint
//   states   idle / shaking / settled, reported as the unit's states
//
// The trigger is the Swift's: a false → true edge shakes. The stage is one rejection per press,
// so each release is a false → true edge, and each touch-down re-arms (trigger → false), which
// is what the Swift asks a caller to do before the next attempt. A re-arm while a shake is still
// running is silent and makes that shake land in `idle`, not `settled`; a release mid-shake
// starts over from the first swing. Both are the Swift's own rules, so a double press shows them.
//
// A prominent button takes the tint as its fill, so the tint is the button's `--wow-fill` for
// the length of the shake. systemRed is Apple's; the rim under it is not measured (glass-lab
// measured the blue button only), it is the fill lightened the way the blue rim is.

import { memo, useCallback, useEffect, useRef } from "react";
import { IOSButton } from "./IOSButton";
import { clamp, createTimers, easeOut, useLatest } from "./motion";
import { stageBool, stageNumber, stageText, type StagePortProps } from "./stage";

const DURATION_MIN = 0.2;
const DURATION_MAX = 1.0;
/** Reduce Motion: the opacity dip's length, s. */
const DIP = 0.2;
/** The tint eases back over this once the motion has landed, s. */
const TINT_RETURN = 0.15;

type Rgb = [number, number, number];
/** UIColor.systemRed, light and dark. */
const RED_LIGHT: Rgb = [255, 59, 48];
const RED_DARK: Rgb = [255, 69, 58];
const RED_RIM: Rgb = [255, 160, 150];

type Run = {
  generation: number;
  /** performance.now() of the edge, or null at rest. */
  start: number | null;
  /** Unit seconds. */
  length: number;
  reduced: boolean;
  /** Trigger went back to false mid-shake: land in idle, not settled. */
  rearmed: boolean;
  /** The tint of this shake, or null. */
  tint: { fill: Rgb; rim: Rgb; restFill: Rgb; restRim: Rgb } | null;
  /** performance.now() when the tint began easing back, or null. */
  tintBack: number | null;
  /** The lane run this shake was started in; its late marks go nowhere else. */
  laneRun: number;
};

function parseRgb(value: string, fallback: Rgb): Rgb {
  const parts = value.split(",").map((part) => Number(part.trim()));
  return parts.length === 3 && parts.every(Number.isFinite) ? [parts[0], parts[1], parts[2]] : fallback;
}

function mix(a: Rgb, b: Rgb, amount: number): string {
  return a.map((channel, i) => Math.round(channel + (b[i] - channel) * amount)).join(", ");
}

export const LiveFailureShake = memo(function LiveFailureShake({
  reduced,
  timeScale,
  onPress,
  onPhaseChange,
  emit,
  resetKey,
  values,
  onStateChange,
}: StagePortProps) {
  const amplitude = stageNumber(values, "amplitude", 8);
  const duration = stageNumber(values, "duration", 0.4);
  const tint = stageText(values, "tint", "nil") !== "nil";
  const haptic = stageBool(values, "haptic", true);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const shakeRef = useRef<HTMLDivElement | null>(null);
  const run = useRef<Run>({
    generation: 0,
    start: null,
    length: 0,
    reduced: false,
    rearmed: false,
    tint: null,
    tintBack: null,
    laneRun: 0,
  });
  const trigger = useRef(false);
  const laneRun = useRef(0);
  const frame = useRef(0);
  const timers = useRef(createTimers());
  const scaleRef = useLatest(timeScale);
  const amplitudeRef = useLatest(amplitude);

  /** Pose and tint, straight onto the DOM. `mixAmount` 1 = tinted, 0 = the host's own. */
  const paint = useCallback((x: number, opacity: number, mixAmount: number) => {
    const body = shakeRef.current;
    if (body) {
      body.style.transform = x === 0 ? "" : `translateX(${x.toFixed(3)}px)`;
      body.style.opacity = opacity >= 1 ? "" : opacity.toFixed(4);
    }
    const host = hostRef.current;
    const colours = run.current.tint;
    if (!host) return;
    if (!colours || mixAmount <= 0) {
      host.style.removeProperty("--wow-fill");
      host.style.removeProperty("--wow-rim");
      return;
    }
    host.style.setProperty("--wow-fill", mix(colours.restFill, colours.fill, mixAmount));
    host.style.setProperty("--wow-rim", mix(colours.restRim, colours.rim, mixAmount));
  }, []);

  const stop = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    timers.current.clear();
    run.current.start = null;
    run.current.tintBack = null;
    paint(0, 1, 0);
    run.current.tint = null;
  }, [paint]);

  const tick = useCallback(function step() {
    const now = performance.now();
    const current = run.current;
    let x = 0;
    let opacity = 1;
    let tinted = 0;

    if (current.start !== null) {
      // `WowShakeRun.pose(at:)`, sampled per frame the way the TimelineView samples it.
      const t = (now - current.start) / 1000 / scaleRef.current / current.length;
      if (t > 0 && t < 1) {
        if (current.reduced) {
          opacity = 1 - 0.4 * Math.sin(Math.PI * t);
        } else {
          const p = 1 - (1 - t) * (1 - t);
          x = amplitudeRef.current * Math.sin(4 * Math.PI * p) * (1.125 - p);
        }
      }
      tinted = 1;
    } else if (current.tintBack !== null) {
      const back = (now - current.tintBack) / 1000 / scaleRef.current / TINT_RETURN;
      tinted = 1 - easeOut(clamp(back, 0, 1));
      if (back >= 1) current.tintBack = null;
    }

    paint(x, opacity, tinted);
    const busy = current.start !== null || current.tintBack !== null;
    frame.current = busy ? requestAnimationFrame(step) : 0;
  }, [amplitudeRef, paint, scaleRef]);

  /** false → true. `WowFailureShake.start()`, in its order: haptic, probe, then the view. */
  const shake = useCallback(() => {
    trigger.current = true;
    if (haptic) emit("haptic", "shake-error"); // 1 — WowHaptics.play(.error), before any view work
    emit("visual", "shake-motion"); // 2 — WowProbe.onVisual

    const previous = run.current;
    let colours: Run["tint"] = null;
    const host = hostRef.current;
    if (tint && host) {
      // The host's own colours, read with any tint still easing back taken off first.
      host.style.removeProperty("--wow-fill");
      host.style.removeProperty("--wow-rim");
      const style = getComputedStyle(host);
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      colours = {
        fill: dark ? RED_DARK : RED_LIGHT,
        rim: RED_RIM,
        restFill: parseRgb(style.getPropertyValue("--wow-fill"), [0, 131, 247]),
        restRim: parseRgb(style.getPropertyValue("--wow-rim"), [56, 228, 255]),
      };
    }

    // 3 — a whole new run: a restart never inherits the old one's clock or its end.
    const length = reduced ? DIP : clamp(duration, DURATION_MIN, DURATION_MAX);
    run.current = {
      generation: previous.generation + 1,
      start: performance.now(),
      length,
      reduced,
      rearmed: false,
      tint: colours,
      tintBack: null,
      laneRun: laneRun.current,
    };
    onStateChange("shaking");

    // Never animated in: the first frame already carries the tint.
    paint(0, 1, colours ? 1 : 0);
    if (!frame.current) frame.current = requestAnimationFrame(tick);

    const generation = run.current.generation;
    timers.current.after(length * 1000 * scaleRef.current, () => {
      const current = run.current;
      if (current.generation !== generation || current.start === null) return;
      current.start = null;
      if (current.tint) {
        current.tintBack = performance.now();
        if (current.laneRun === laneRun.current) emit("visual", "shake-tint");
      }
      if (!frame.current) frame.current = requestAnimationFrame(tick);
      onStateChange(current.rearmed ? "idle" : "settled");
    });
  }, [duration, emit, haptic, onStateChange, paint, reduced, scaleRef, tick, tint]);

  /** Touch-down: a new run on the lane, and the re-arm the Swift asks for before an attempt. */
  const down = useCallback(() => {
    laneRun.current += 1;
    onPress();
    if (!trigger.current) return;
    trigger.current = false;
    // Silent. At rest it reports idle; mid-shake the shake lands in idle instead of settled.
    if (run.current.start !== null) run.current.rearmed = true;
    else onStateChange("idle");
  }, [onPress, onStateChange]);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (resetKey === 0) return;
    stop();
    trigger.current = false;
  }, [resetKey, stop]);

  return (
    <div ref={shakeRef} className="relative" style={{ transition: "none" }}>
      <IOSButton
        label="Pay $12.00"
        ariaLabel="Pay $12.00, press to run the failure shake"
        reduced={reduced}
        timeScale={timeScale}
        onPressStart={down}
        onPressEnd={shake}
        onPhaseChange={onPhaseChange}
        hostRef={hostRef}
      />
    </div>
  );
});
