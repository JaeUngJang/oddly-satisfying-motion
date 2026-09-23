"use client";

// LiveSuccessCheck.tsx — units/success-check/WowSuccessCheck.swift, in the browser,
// wearing the demo's recipe around it (demo/Sources/ContentView.swift, column B):
//
//   release → ProgressView for 0.6 s → WowSuccessCheck in the label
//
// Choreography, straight out of the Swift's `start()`:
//   ring    spring(response 0.28, dampingFraction 0.72), scale 0.6 → 1
//   fade    easeOut 0.12 s, opacity 0 → 1
//   draw    easeOut 0.30 s after a 0.06 s delay, trim 0 → 1
//   haptic  at 0.06 + 0.30 − 0.02 = 0.34 s, so the pulse and the last frame of the stroke
//           land inside one simultaneity window
//   reduce motion  no scale, no draw; 0.15 s cross-fade, haptic at +0.10 s
//
// `size` and `lineWidth` come from the panel and are the Swift's own parameters, so the
// check on the stage is the check the copied line draws. None of the timings depend on
// them — the choreography is fixed in the Swift — so the lane does not move when they do.
//
// The recipe starts where the demo's does: on the release, the Button's action. This is a
// complete-triggered unit, so a press that ends `cancelled` or `interrupted` runs nothing.
// The lane still starts at touch-down with the press's own tap at 0; the recipe's marks are
// declared from the release (lanes.json `anchor: "release"`), so it reads tap at 0 →
// released at N → loading, ring, draw and `.success` from N. A new touch-down is a new run:
// whatever the last run left on the stage is dropped, so the stage and the lane agree.

import { memo, useCallback, useEffect, useRef, useState, type Ref, type RefObject } from "react";
import { IOSButton } from "./IOSButton";
import { createSpring, createTimers, easeOut, useLatest } from "./motion";
import { boolValue, numberValue } from "./params";
import type { LivePortProps } from "./LivePress";

/** Stand-in for the network call, same as the demo. */
const LOADING = 0.6;
const DRAW_DELAY = 0.06;
const DRAW = 0.3;
const HAPTIC_LEAD = 0.02;
const HAPTIC_AT = DRAW_DELAY + DRAW - HAPTIC_LEAD; // 0.34 s
const RING_FADE = 0.12;
const REDUCED_FADE = 0.15;
const REDUCED_HAPTIC_AT = 0.1;

type Stage = "idle" | "loading" | "done";

export const LiveSuccessCheck = memo(function LiveSuccessCheck({
  reduced,
  timeScale,
  onPress,
  onPhaseChange,
  emit,
  resetKey,
  params,
}: LivePortProps) {
  const size = numberValue(params, "size", 28);
  const line = numberValue(params, "lineWidth", 3);
  const haptic = boolValue(params, "haptic", true);

  const [stage, setStage] = useState<Stage>("idle");

  const spinRef = useRef<SVGSVGElement | null>(null);
  const checkRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);

  const spring = useRef(createSpring(0.28, 0.72, 0));
  const timers = useRef(createTimers());
  const frame = useRef(0);
  const t0 = useRef(0);
  const last = useRef(0);
  const scale = useLatest(timeScale);
  const reducedRef = useLatest(reduced);

  const stop = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    timers.current.clear();
  }, []);

  const tick = useCallback(() => {
    const now = performance.now();
    const dt = Math.min((now - last.current) / 1000, 0.064) / scale.current;
    last.current = now;
    const u = (now - t0.current) / 1000 / scale.current; // unit seconds since the press

    // iOS activity indicator: one turn per second, in eight discrete steps.
    if (spinRef.current) {
      spinRef.current.style.transform = `rotate(${Math.floor(u * 8) * 45}deg)`;
    }

    const c = u - LOADING; // unit seconds since the check was triggered
    const check = checkRef.current;
    if (c >= 0 && check) {
      if (reducedRef.current) {
        check.style.opacity = String(easeOut(Math.min(c / REDUCED_FADE, 1)));
        check.style.transform = "none";
        pathRef.current?.setAttribute("stroke-dashoffset", "0");
      } else {
        const p = spring.current.step(dt);
        check.style.transform = `scale(${0.6 + 0.4 * p})`;
        check.style.opacity = String(easeOut(Math.min(c / RING_FADE, 1)));
        const draw = easeOut(Math.min(Math.max((c - DRAW_DELAY) / DRAW, 0), 1));
        pathRef.current?.setAttribute("stroke-dashoffset", (1 - draw).toFixed(4));
      }
    }

    const settled = reducedRef.current
      ? c > REDUCED_FADE
      : c > DRAW_DELAY + DRAW && spring.current.settled;
    frame.current = settled ? 0 : requestAnimationFrame(tick);
  }, [reducedRef, scale]);

  /** Touch-down: a new run starts at t = 0 with the press's tap, and nothing else yet. */
  const down = useCallback(() => {
    stop();
    setStage("idle");
    onPress();
    // The button under the check is `.wowPress()`, whose own haptic this unit does not own;
    // `haptic` here is WowSuccessCheck's `.success` pulse and gates only that one.
    emit("haptic", "check-tap");
  }, [emit, onPress, stop]);

  /** `released`: the Button's action, which is where the recipe starts. */
  const run = useCallback(() => {
    stop();
    emit("visual", "check-loading");

    spring.current.jump(0);
    setStage("loading");
    t0.current = performance.now();
    last.current = t0.current;
    frame.current = requestAnimationFrame(tick);

    // Every offset below is measured from the release, so they are all scheduled here
    // rather than nested inside one another.
    const isReduced = reducedRef.current;
    const after = (seconds: number, task: () => void) =>
      timers.current.after(seconds * 1000 * scale.current, task);

    after(LOADING, () => {
      setStage("done");
      spring.current.retarget(1);
      emit("visual", "check-ring");
    });
    // Under Reduce Motion the stroke is already whole when the check appears, so the draw
    // marker fires with the ring and the haptic lands at +0.10 s. The lane keeps showing
    // the unit's standard budget, which is what it documents.
    after(isReduced ? LOADING : LOADING + DRAW_DELAY, () => emit("visual", "check-draw"));
    if (haptic) {
      after(LOADING + (isReduced ? REDUCED_HAPTIC_AT : HAPTIC_AT), () =>
        emit("haptic", "check-success"),
      );
    }
  }, [emit, haptic, reducedRef, scale, stop, tick]);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (resetKey === 0) return;
    stop();
    setStage("idle");
  }, [resetKey, stop]);

  // Resizing a check that has already finished re-renders `CheckMark`, which puts the JSX's
  // start values (opacity 0, scale 0.6, whole stroke hidden) back on the element the frame
  // loop owns. If the loop has already stopped nothing would repaint it, so the finished
  // state is restored here instead of leaving the check invisible.
  useEffect(() => {
    if (stage !== "done" || frame.current) return;
    const check = checkRef.current;
    if (!check) return;
    check.style.opacity = "1";
    check.style.transform = reduced ? "none" : "scale(1)";
    pathRef.current?.setAttribute("stroke-dashoffset", "0");
  }, [reduced, size, line, stage]);

  let label;
  if (stage === "idle") label = "Subscribe";
  else if (stage === "loading") label = <Spinner ref={spinRef} />;
  else
    label = <CheckMark size={size} line={line} svgRef={checkRef} pathRef={pathRef} />;

  return (
    <IOSButton
      label={label}
      ariaLabel="Subscribe, press to run the success check"
      reduced={reduced}
      timeScale={timeScale}
      onPressStart={down}
      onPressEnd={run}
      onPhaseChange={onPhaseChange}
    />
  );
});

/**
 * Ring + checkmark. Memoised so a parent re-render cannot reset the inline styles the
 * frame loop owns; `pathLength={1}` puts the dash offset in the same 0…1 units as
 * SwiftUI's `trim(from:to:)`.
 */
const CheckMark = memo(function CheckMark({
  size,
  line,
  svgRef,
  pathRef,
}: {
  size: number;
  line: number;
  svgRef: RefObject<SVGSVGElement | null>;
  pathRef: RefObject<SVGPathElement | null>;
}) {
  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      aria-hidden
      style={{
        transition: "none",
        transformOrigin: "center",
        opacity: 0,
        transform: "scale(0.6)",
      }}
    >
      {/* `Circle().strokeBorder(lineWidth:)` insets by half the stroke. */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={(size - line) / 2}
        stroke="#fff"
        strokeWidth={line}
      />
      {/* WowSuccessCheckMark, unit space × size: (.28,.53) → (.44,.69) → (.72,.36). */}
      <path
        ref={pathRef}
        d={`M ${0.28 * size} ${0.53 * size} L ${0.44 * size} ${0.69 * size} L ${
          0.72 * size
        } ${0.36 * size}`}
        stroke="#fff"
        strokeWidth={line}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1}
      />
    </svg>
  );
});

/** `ProgressView().progressViewStyle(.circular).tint(.white)` — eight spokes, 20 pt. */
const Spinner = memo(function Spinner({ ref }: { ref: Ref<SVGSVGElement> }) {
  return (
    <svg
      ref={ref}
      width={20}
      height={20}
      viewBox="0 0 20 20"
      aria-hidden
      style={{ transition: "none", transformOrigin: "center" }}
    >
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x={9.1}
          y={2}
          width={1.8}
          height={5}
          rx={0.9}
          fill="#fff"
          opacity={0.2 + (i / 7) * 0.8}
          transform={`rotate(${i * 45} 10 10)`}
        />
      ))}
    </svg>
  );
});
