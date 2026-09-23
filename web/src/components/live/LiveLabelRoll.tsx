"use client";

// LiveLabelRoll.tsx — units/label-roll/WowLabelRoll.swift, in the browser, on the demo's recipe
// (demo/Sources/RecordView.swift):
//
//   Button { likes += 1 } label: { HStack { Text("Like"); WowLabelRoll(value: likes, tint: .white) } }
//
// From the Swift:
//   motion   spring(response 0.30, dampingFraction 0.85). On iOS 17+ `.numericText(value:)` rolls
//            only the characters that changed, in the direction of the change: up when the value
//            rose, down when it fell. The recording (label-roll-full.mp4) shows how: the old digit
//            leaves upward, fading and blurring, the new one rises in from below. The Swift does
//            not state the travel or the blur (they are the system's), so those two numbers are
//            the web's, read off the recording: 0.6 em and 3 px at the far end. The spring is the
//            Swift's
//   digits   monospaced (`.monospacedDigit()`), so the width holds while they roll
//   format   "%.0f" in the environment locale; the recording shows en_US grouping ("1,204"), so
//            the stage formats en-US on every visitor's machine, server render included
//   haptic   none on ordinary changes. With `hapticThreshold` set, .tap once on the change that
//            moves the value across it, either direction, fired before the roll
//   reduce   no roll: the label cross-fades over 0.15 s easeOut; the threshold haptic unchanged
//   states   rolling-up / rolling-down / threshold-crossed as each change lands, idle once settled
//
// Each press is the Button's action, `likes += 1`, on the release. The panel's −1 is the other
// direction: it starts a run of its own at the moment of the change, so its roll is drawn from 0.
// A prefix or suffix edit is not a change of `value`, and the Swift animates on `value` only, so
// it lands without a roll.

import {
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { IOSButton } from "./IOSButton";
import { clamp, createSpring, easeOut, useLatest } from "./motion";
import { stageBool, stageOptional, stageText, type StagePortProps } from "./stage";

/** The demo's starting count. */
const START = 1204;
const RESPONSE = 0.3;
const DAMPING = 0.85;
const REDUCED_FADE = 0.15;
/** Travel and blur at the far end of a roll: the system's, read off the recording. */
const TRAVEL_EM = 0.6;
const BLUR_PX = 3;

type Roll = { from: number; to: number; up: boolean; id: number };

const NUMBER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** `prefix + String(format: "%.0f", locale:, value) + suffix`. */
function display(prefix: string, value: number, suffix: string): string {
  return `${prefix}${NUMBER.format(value)}${suffix}`;
}

/** Old and new text as columns, aligned from the right so ones stay over ones. */
function columns(from: string, to: string): { out: string; in: string }[] {
  const width = Math.max(from.length, to.length);
  const a = from.padStart(width, "\u0000");
  const b = to.padStart(width, "\u0000");
  return Array.from({ length: width }, (_, i) => ({
    out: a[i] === "\u0000" ? "" : a[i],
    in: b[i] === "\u0000" ? "" : b[i],
  }));
}

/** A rolling column's pose at progress p (0 → 1). */
function pose(p: number, up: boolean, reduced: boolean, entering: boolean): CSSProperties {
  const opacity = clamp(entering ? p : 1 - p, 0, 1);
  if (reduced) return { opacity };
  const sign = up ? 1 : -1;
  const offset = entering ? sign * TRAVEL_EM * (1 - p) : -sign * TRAVEL_EM * p;
  const blur = BLUR_PX * (entering ? 1 - p : p);
  return {
    opacity,
    transform: `translateY(${offset.toFixed(4)}em)`,
    filter: blur < 0.01 ? "none" : `blur(${blur.toFixed(3)}px)`,
  };
}

export const LiveLabelRoll = memo(function LiveLabelRoll({
  reduced,
  timeScale,
  onPress,
  onPhaseChange,
  emit,
  resetKey,
  values,
  onStateChange,
  cues,
}: StagePortProps) {
  const prefix = stageText(values, "prefix", "");
  const suffix = stageText(values, "suffix", "");
  const threshold = stageOptional(values, "hapticThreshold");
  const haptic = stageBool(values, "haptic", true);

  const [roll, setRoll] = useState<Roll>({ from: START, to: START, up: true, id: 0 });
  const value = useRef(START);
  const rowRef = useRef<HTMLSpanElement | null>(null);

  const spring = useRef(createSpring(RESPONSE, DAMPING, 0));
  const fadeStart = useRef(0);
  const frame = useRef(0);
  const last = useRef(0);
  const up = useRef(true);
  const scaleRef = useLatest(timeScale);
  const reducedRef = useLatest(reduced);

  const paint = useCallback(
    (p: number) => {
      const row = rowRef.current;
      if (!row) return;
      const isReduced = reducedRef.current;
      row.querySelectorAll<HTMLElement>("[data-roll]").forEach((node) => {
        Object.assign(
          node.style,
          pose(p, up.current, isReduced, node.dataset.roll === "in"),
        );
      });
    },
    [reducedRef],
  );

  const tick = useCallback(function step() {
    const now = performance.now();
    const dt = Math.min((now - last.current) / 1000, 0.064) / scaleRef.current;
    last.current = now;

    let p: number;
    let done: boolean;
    if (reducedRef.current) {
      const t = clamp((now - fadeStart.current) / 1000 / scaleRef.current / REDUCED_FADE, 0, 1);
      p = easeOut(t);
      done = t >= 1;
    } else {
      p = spring.current.step(dt);
      done = spring.current.settled;
    }
    paint(p);

    if (!done) {
      frame.current = requestAnimationFrame(step);
      return;
    }
    frame.current = 0;
    // Settled: the rolled columns become plain text again.
    setRoll((current) => ({ ...current, from: current.to }));
    onStateChange("idle");
  }, [onStateChange, paint, reducedRef, scaleRef]);

  /** `wowOnChange(of: value) { changed(to:) }`, and the roll the animation runs for it. */
  const change = useCallback(
    (delta: number) => {
      const old = value.current;
      const next = old + delta;
      value.current = next;

      // 1 — the threshold haptic, before the roll.
      const crossed = threshold !== null && old >= threshold !== next >= threshold;
      if (haptic && crossed) emit("haptic", "roll-tap");
      // 2 — WowProbe.onVisual
      emit("visual", next > old ? "roll-up" : "roll-down");
      onStateChange(crossed ? "threshold-crossed" : next > old ? "rolling-up" : "rolling-down");

      // A change mid-roll starts from what is settled on screen: the new text's old columns
      // are the last target, at rest.
      up.current = next > old;
      setRoll((current) => ({ from: old, to: next, up: next > old, id: current.id + 1 }));
      spring.current.jump(0);
      spring.current.retarget(1);
      fadeStart.current = performance.now();
      last.current = fadeStart.current;
      if (frame.current) cancelAnimationFrame(frame.current);
      // After React has put the new columns in: the first frame paints them at p ≈ 0.
      frame.current = requestAnimationFrame(tick);
    },
    [emit, haptic, onStateChange, threshold, tick],
  );

  /** The panel's −1: a change of its own, so a run of its own from the moment it happens. */
  useImperativeHandle(
    cues,
    () => ({
      cue(key: string) {
        if (key !== "decrement") return;
        onPress();
        change(-1);
      },
    }),
    [change, onPress],
  );

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  useEffect(() => {
    if (resetKey === 0) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    value.current = START;
    spring.current.jump(0);
    setRoll((current) => ({ from: START, to: START, up: true, id: current.id + 1 }));
  }, [resetKey]);

  const text = display(prefix, roll.to, suffix);
  const cells = columns(display(prefix, roll.from, suffix), text);
  const rolling = roll.from !== roll.to;
  // The first frame of a roll: the incoming columns start where the loop will pick them up.
  const enterStyle: CSSProperties = { transition: "none", ...pose(0, roll.up, reduced, true) };
  const leaveStyle: CSSProperties = { transition: "none", ...pose(0, roll.up, reduced, false) };

  const label = (
    <span className="inline-flex items-baseline" style={{ gap: 8 }}>
      <span>Like</span>
      <span
        ref={rowRef}
        className="inline-flex"
        style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "pre" }}
      >
        {!rolling
          ? text
          : reduced
            ? (
                // Reduce Motion: `.contentTransition(.opacity)`, the whole label at once.
                <span key={roll.id} className="relative inline-block">
                  <span data-roll="in" className="inline-block" style={enterStyle}>
                    {text}
                  </span>
                  <span
                    data-roll="out"
                    aria-hidden
                    className="absolute top-0 right-0"
                    style={leaveStyle}
                  >
                    {display(prefix, roll.from, suffix)}
                  </span>
                </span>
              )
            : cells.map((cell, i) =>
                cell.in === cell.out ? (
                  <span key={`${roll.id}-${i}`}>{cell.in}</span>
                ) : (
                  <span key={`${roll.id}-${i}`} className="relative inline-block">
                    <span data-roll="in" className="inline-block" style={enterStyle}>
                      {cell.in}
                    </span>
                    <span
                      data-roll="out"
                      aria-hidden
                      className="absolute top-0 left-0"
                      style={leaveStyle}
                    >
                      {cell.out}
                    </span>
                  </span>
                ),
              )}
      </span>
    </span>
  );

  return (
    <IOSButton
      label={label}
      ariaLabel={`Like, ${text}. Press to run the label roll`}
      reduced={reduced}
      timeScale={timeScale}
      onPressStart={onPress}
      onPressEnd={() => change(1)}
      onPhaseChange={onPhaseChange}
    />
  );
});
