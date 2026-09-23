"use client";

// LiveLoadingMorph.tsx — units/loading-morph/WowLoadingMorph.swift, in the browser, on the
// demo's recipe (demo/Sources/RecordView.swift):
//
//   Button { phase = .loading; …0.9 s… phase = ok ? .success : .failure } label: {
//       WowLoadingMorph(phase: phase, label: "Checkout")
//   }
//
// The Swift's `morph(to:)`, layer for layer. All four layers are laid out at all times in one
// grid cell, the inactive ones at opacity 0, so the label's frame is the widest state's from the
// first frame and nothing reflows:
//   → loading   label out: opacity 1 → 0 and blur 0 → 4 pt, 0.12 s easeOut (only if it was
//               showing: a retry from a result leaves on the same curve without the blur);
//               spinner (.small, 14 pt) mounted at once, its layer in over 0.12 s easeOut from
//               +0.04 s. No haptic
//   → success   everything showing out over 0.10 s easeOut; the checkmark scales 0.6 → 1 on
//               spring(response 0.28, dampingFraction 0.72) while it fades in over 0.12 s.
//               .success at +0.18 s, dropped if the phase changes first
//   → failure   .error at +0, before any visual work; then as success, with an xmark
//   → idle      0.16 s easeOut cross-fade, no haptic (the stage's Reset)
//   park        +0.21 s after each change (the longest exit + a few frames), the hidden layers
//               go back to their start values at once: label unblurred, glyphs at 0.6, spinner
//               unmounted
//   reduce      no blur, no scale; same timings, haptics at the same moments
//   states      idle / loading / success / failure
//
// The recipe runs on the release, the Button's action, and its 0.9 s is the demo's stand-in for
// the network. The panel's `fail` is what that call reports; it is read when the result lands.
// The Swift's usage guards the action with `phase != .loading`, so a press while loading runs
// nothing: it is not the unit's, starts no run on the lane and is not reported.

import { memo, useCallback, useEffect, useRef, type ReactNode, type Ref, type RefObject } from "react";
import { Checkmark, Xmark } from "./Glyphs";
import { IOSButton, type PressPhase } from "./IOSButton";
import { clamp, createSpring, createTimers, easeOut, useLatest, type Spring } from "./motion";
import { stageBool, stageText, type StagePortProps } from "./stage";

/** The demo's stand-in for the network, s. */
const NETWORK = 0.9;
const LABEL_OUT = 0.12;
const BLUR_RADIUS = 4;
const SPINNER_IN = 0.12;
const SPINNER_DELAY = 0.04;
const RESULT_OUT = 0.1;
const GLYPH_IN = 0.12;
const GLYPH_START_SCALE = 0.6;
const SUCCESS_HAPTIC_AT = 0.18;
const CROSS_FADE = 0.16;
const PARK_AT = CROSS_FADE + 0.05;
const SPINNER_SPACING = 8;
/** `.controlSize(.small)`. */
const SPINNER_SIZE = 14;

type LoadPhase = "idle" | "loading" | "success" | "failure";

/** An easeOut leg of a set length, from wherever the value is when it starts. */
type Tween = { from: number; to: number; start: number; seconds: number; delay: number };

function tween(value: number): Tween {
  return { from: value, to: value, start: 0, seconds: 0, delay: 0 };
}

/** Unit seconds since the leg started, delay included. */
function elapsed(leg: Tween, now: number, scale: number): number {
  return (now - leg.start) / 1000 / scale;
}

function sample(leg: Tween, now: number, scale: number): number {
  if (leg.seconds <= 0) return leg.to;
  const progress = clamp((elapsed(leg, now, scale) - leg.delay) / leg.seconds, 0, 1);
  return leg.from + (leg.to - leg.from) * easeOut(progress);
}

export const LiveLoadingMorph = memo(function LiveLoadingMorph({
  reduced,
  timeScale,
  onPress,
  onPhaseChange,
  emit,
  resetKey,
  values,
  onStateChange,
}: StagePortProps) {
  const label = stageText(values, "label", "Checkout");
  const loadingLabel = stageText(values, "loadingLabel", "");
  const haptic = stageBool(values, "haptic", true);
  const fail = stageBool(values, "fail", false);

  const labelRef = useRef<HTMLSpanElement | null>(null);
  const loadingRef = useRef<HTMLSpanElement | null>(null);
  const spinnerRef = useRef<SVGSVGElement | null>(null);
  const checkRef = useRef<HTMLSpanElement | null>(null);
  const xmarkRef = useRef<HTMLSpanElement | null>(null);

  // The Swift's @State, as the targets the legs below run to.
  const flags = useRef({
    labelVisible: true,
    labelBlurred: false,
    loadingVisible: false,
    spinnerMounted: false,
    spinnerSince: 0,
    checkmarkVisible: false,
    xmarkVisible: false,
  });
  const legs = useRef({
    labelOpacity: tween(1),
    labelBlur: tween(0),
    loadingOpacity: tween(0),
    checkOpacity: tween(0),
    xmarkOpacity: tween(0),
  });
  // `scaleEffect(scaledIn ? 1 : 0.6)`, as a 0 → 1 spring each.
  const checkScale = useRef<Spring>(createSpring(0.28, 0.72, 0));
  const xmarkScale = useRef<Spring>(createSpring(0.28, 0.72, 0));

  const shown = useRef<LoadPhase>("idle");
  /** Bumped on every phase change: delayed work whose run no longer matches is dropped. */
  const run = useRef(0);
  const laneRun = useRef(0);
  const ignored = useRef(false);
  const frame = useRef(0);
  const last = useRef(0);
  const timers = useRef(createTimers());
  const scaleRef = useLatest(timeScale);
  const reducedRef = useLatest(reduced);
  const hapticRef = useLatest(haptic);
  const failRef = useLatest(fail);

  const paint = useCallback(() => {
    const now = performance.now();
    const s = scaleRef.current;
    const isReduced = reducedRef.current;
    const l = legs.current;

    const labelNode = labelRef.current;
    if (labelNode) {
      labelNode.style.opacity = sample(l.labelOpacity, now, s).toFixed(4);
      const blur = isReduced ? 0 : sample(l.labelBlur, now, s);
      labelNode.style.filter = blur < 0.01 ? "" : `blur(${blur.toFixed(3)}px)`;
    }
    if (loadingRef.current) {
      loadingRef.current.style.opacity = sample(l.loadingOpacity, now, s).toFixed(4);
    }
    const glyph = (node: HTMLSpanElement | null, opacity: Tween, spring: Spring) => {
      if (!node) return;
      node.style.opacity = sample(opacity, now, s).toFixed(4);
      const size = isReduced ? 1 : GLYPH_START_SCALE + (1 - GLYPH_START_SCALE) * spring.value;
      node.style.transform = `scale(${size.toFixed(4)})`;
    };
    glyph(checkRef.current, l.checkOpacity, checkScale.current);
    glyph(xmarkRef.current, l.xmarkOpacity, xmarkScale.current);

    // iOS activity indicator: one turn a second, in eight steps. It exists only while mounted.
    const spinner = spinnerRef.current;
    if (spinner) {
      const f = flags.current;
      spinner.style.visibility = f.spinnerMounted ? "" : "hidden";
      const turns = (now - f.spinnerSince) / 1000 / s;
      spinner.style.transform = `rotate(${Math.floor(turns * 8) * 45}deg)`;
    }
  }, [reducedRef, scaleRef]);

  const loop = useCallback(function step() {
    const now = performance.now();
    const s = scaleRef.current;
    const dt = Math.min((now - last.current) / 1000, 0.064) / s;
    last.current = now;
    checkScale.current.step(dt);
    xmarkScale.current.step(dt);
    paint();

    const moving =
      Object.values(legs.current).some((leg) => elapsed(leg, now, s) < leg.delay + leg.seconds) ||
      !checkScale.current.settled ||
      !xmarkScale.current.settled ||
      flags.current.spinnerMounted;
    frame.current = moving ? requestAnimationFrame(step) : 0;
  }, [paint, scaleRef]);

  const wake = useCallback(() => {
    if (frame.current) return;
    last.current = performance.now();
    frame.current = requestAnimationFrame(loop);
  }, [loop]);

  /** `withAnimation(.easeOut(duration:).delay(…)) { … }` for one value. */
  const animate = useCallback(
    (leg: Tween, to: number, seconds: number, delay = 0) => {
      const now = performance.now();
      leg.from = sample(leg, now, scaleRef.current);
      leg.to = to;
      leg.start = now;
      leg.seconds = seconds;
      leg.delay = delay;
    },
    [scaleRef],
  );

  const instantly = useCallback((leg: Tween, value: number) => {
    leg.from = value;
    leg.to = value;
    leg.seconds = 0;
    leg.delay = 0;
  }, []);

  const after = useCallback(
    (seconds: number, task: () => void) =>
      timers.current.after(seconds * 1000 * scaleRef.current, task),
    [scaleRef],
  );

  /**
   * Once every exit is over, the hidden layers go back to their start values so the next
   * entrance runs from them. Only the latest change cleans up.
   */
  const schedulePark = useCallback(
    (token: number) => {
      after(PARK_AT, () => {
        if (token !== run.current) return;
        const f = flags.current;
        const l = legs.current;
        if (!f.labelVisible) {
          f.labelBlurred = false;
          instantly(l.labelBlur, 0);
        }
        if (!f.loadingVisible) f.spinnerMounted = false;
        if (!f.checkmarkVisible) checkScale.current.jump(0);
        if (!f.xmarkVisible) xmarkScale.current.jump(0);
        paint();
      });
    },
    [after, instantly, paint],
  );

  /** `morph(to:)`. */
  const morph = useCallback(
    (next: LoadPhase) => {
      run.current += 1; // drops a success pulse still pending
      const token = run.current;
      const lane = laneRun.current;
      shown.current = next;
      const f = flags.current;
      const l = legs.current;

      if (next === "failure" && hapticRef.current) emit("haptic", "morph-error"); // before any visual work
      if (next === "loading") emit("visual", "morph-loading"); // WowProbe.onVisual
      if (next === "success") emit("visual", "morph-check");
      if (next === "failure") emit("visual", "morph-xmark");

      switch (next) {
        case "loading": {
          f.spinnerMounted = true; // instantly: its layer is still at opacity 0
          f.spinnerSince = performance.now();
          if (f.labelVisible) {
            f.labelVisible = false;
            f.labelBlurred = true;
            animate(l.labelOpacity, 0, LABEL_OUT);
            animate(l.labelBlur, BLUR_RADIUS, LABEL_OUT);
          }
          // A retry: the result leaves on the same curve, without the blur.
          f.checkmarkVisible = false;
          f.xmarkVisible = false;
          animate(l.checkOpacity, 0, LABEL_OUT);
          animate(l.xmarkOpacity, 0, LABEL_OUT);
          f.loadingVisible = true;
          animate(l.loadingOpacity, 1, SPINNER_IN, SPINNER_DELAY);
          break;
        }
        case "success":
        case "failure": {
          const success = next === "success";
          f.labelVisible = false;
          f.loadingVisible = false;
          animate(l.labelOpacity, 0, RESULT_OUT);
          animate(l.loadingOpacity, 0, RESULT_OUT);
          if (success) {
            f.xmarkVisible = false;
            animate(l.xmarkOpacity, 0, RESULT_OUT);
            checkScale.current.retarget(1);
            f.checkmarkVisible = true;
            animate(l.checkOpacity, 1, GLYPH_IN);
            if (hapticRef.current) {
              after(SUCCESS_HAPTIC_AT, () => {
                // A phase change before the glyph landed has already moved the run on.
                if (token === run.current && lane === laneRun.current) {
                  emit("haptic", "morph-success");
                }
              });
            }
          } else {
            f.checkmarkVisible = false;
            animate(l.checkOpacity, 0, RESULT_OUT);
            xmarkScale.current.retarget(1);
            f.xmarkVisible = true;
            animate(l.xmarkOpacity, 1, GLYPH_IN);
          }
          break;
        }
        case "idle": {
          f.loadingVisible = false;
          f.checkmarkVisible = false;
          f.xmarkVisible = false;
          f.labelVisible = true;
          f.labelBlurred = false; // already false unless cut short
          animate(l.loadingOpacity, 0, CROSS_FADE);
          animate(l.checkOpacity, 0, CROSS_FADE);
          animate(l.xmarkOpacity, 0, CROSS_FADE);
          animate(l.labelOpacity, 1, CROSS_FADE);
          animate(l.labelBlur, 0, CROSS_FADE);
          break;
        }
      }
      schedulePark(token);
      onStateChange(next);
      wake();
    },
    [after, animate, emit, hapticRef, onStateChange, schedulePark, wake],
  );

  /** Touch-down. While loading the action is guarded, so the press is not a run. */
  const down = useCallback(() => {
    ignored.current = shown.current === "loading";
    if (ignored.current) return;
    laneRun.current += 1;
    onPress();
  }, [onPress]);

  /** `released`: the Button's action, which is the recipe. */
  const action = useCallback(() => {
    if (ignored.current || shown.current === "loading") return;
    morph("loading");
    after(NETWORK, () => morph(failRef.current ? "failure" : "success"));
  }, [after, failRef, morph]);

  const phaseChange = useCallback(
    (next: PressPhase) => {
      if (!ignored.current) onPhaseChange(next);
    },
    [onPhaseChange],
  );

  useEffect(() => {
    paint();
    const pending = timers.current;
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
      pending.clear();
    };
  }, [paint]);

  // Reset: the recipe is dropped, and the app sets the phase back to idle, which the unit
  // animates like any other change: the 0.16 s cross-fade.
  useEffect(() => {
    if (resetKey === 0) return;
    timers.current.clear();
    if (shown.current !== "idle") morph("idle");
  }, [morph, resetKey]);

  // Reduce Motion switched while at rest: repaint without (or with) blur and scale.
  useEffect(() => {
    if (!frame.current) paint();
  }, [paint, reduced]);

  return (
    <IOSButton
      label={
        <span className="grid place-items-center">
          <Layer layerRef={labelRef} opacity={1}>
            <span style={{ whiteSpace: "pre" }}>{label}</span>
          </Layer>
          <Layer layerRef={loadingRef} opacity={0}>
            <span className="inline-flex items-center" style={{ gap: SPINNER_SPACING }}>
              {/* The slot holds the spinner's size whether or not it is mounted. */}
              <span
                className="grid place-items-center"
                style={{ width: SPINNER_SIZE, height: SPINNER_SIZE }}
              >
                <Spinner ref={spinnerRef} />
              </span>
              {loadingLabel !== "" && <span style={{ whiteSpace: "pre" }}>{loadingLabel}</span>}
            </span>
          </Layer>
          <Layer layerRef={checkRef} opacity={0}>
            <Checkmark size={17} />
          </Layer>
          <Layer layerRef={xmarkRef} opacity={0}>
            <Xmark size={17} />
          </Layer>
        </span>
      }
      ariaLabel={`${label}, press to run the loading morph`}
      reduced={reduced}
      timeScale={timeScale}
      onPressStart={down}
      onPressEnd={action}
      onPhaseChange={phaseChange}
    />
  );
});

/** One of the four layers, all in the same grid cell. The frame loop owns its style. */
function Layer({
  layerRef,
  opacity,
  children,
}: {
  layerRef: RefObject<HTMLSpanElement | null>;
  opacity: number;
  children: ReactNode;
}) {
  return (
    <span
      ref={layerRef}
      className="grid place-items-center"
      style={{ gridArea: "1 / 1", opacity, transition: "none", transformOrigin: "center" }}
    >
      {children}
    </span>
  );
}

/** `ProgressView()` at `.controlSize(.small)`: eight spokes, 14 pt, in the tint. */
function Spinner({ ref }: { ref: Ref<SVGSVGElement> }) {
  return (
    <svg
      ref={ref}
      width={SPINNER_SIZE}
      height={SPINNER_SIZE}
      viewBox="0 0 20 20"
      aria-hidden
      style={{ transition: "none", transformOrigin: "center", visibility: "hidden" }}
    >
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x={9.1}
          y={2}
          width={1.8}
          height={5}
          rx={0.9}
          fill="currentColor"
          opacity={0.2 + (i / 7) * 0.8}
          transform={`rotate(${i * 45} 10 10)`}
        />
      ))}
    </svg>
  );
}
