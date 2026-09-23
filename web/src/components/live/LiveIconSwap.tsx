"use client";

// LiveIconSwap.tsx — units/icon-swap/WowIconSwap.swift, in the browser, on the demo's recipe
// (demo/Sources/RecordView.swift):
//
//   Button { copied = true } label: {
//       WowIconSwap(trigger: copied, tint: .white)
//           .frame(width: 52, height: 52).background(Color.accentColor, in: Capsule())
//   }
//
// Choreography, out of the Swift's `start()` and `revert()`:
//   swap     both glyphs stay mounted and one spring(response 0.30, dampingFraction 0.80) moves
//            them: the incoming glyph 0 → 1 opacity and 0.6 → 1 scale, the outgoing one 1 → 0 and
//            1 → 0.6. That is the Swift's iOS 16 path. On iOS 17+ the same spring drives SF
//            Symbols' `.replace.downUp`, an effect the web does not have; the fallback is the one
//            the Swift specifies in numbers, so it is the one ported
//   haptic   .success at +0.10 s, once the checkmark is on screen; dropped if reverted first
//   revert   `revertAfter` later (0 = never) the same spring runs back with no haptic, and the
//            caller re-arms on `.reverted` (trigger → false), as the Swift's usage does
//   reduce   no scale: a 0.15 s easeOut cross-fade; the haptic unchanged, at +0.10 s
//   states   idle / swapped / reverted
//
// The swap runs on the release, the Button's action. A press while the checkmark is up and the
// revert is pending finds the trigger already true, so nothing runs: the press is not the unit's,
// it starts no run on the lane and is not reported. With no revert pending (revertAfter 0) the
// checkmark stays until the trigger goes false, and the stage's next press does that: a silent
// revert, drawn from its release.
//
// `size` is the symbol's point size and the side of the square both glyphs sit in; the capsule
// around them stays 52 × 52, as in the recipe.

import { memo, useCallback, useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Checkmark, DocOnDoc } from "./Glyphs";
import { IOSButton, type PressPhase } from "./IOSButton";
import { clamp, createSpring, createTimers, easeOut, useLatest } from "./motion";
import { stageBool, stageNumber, type StagePortProps } from "./stage";

const RESPONSE = 0.3;
const DAMPING = 0.8;
const HAPTIC_AT = 0.1;
/** iOS 16 path: incoming 0.6 → 1, outgoing 1 → 0.6. */
const SHRUNK = 0.6;
const REDUCED_FADE = 0.15;

/** 52 × 52: the recipe's frame. Scoped overrides of the capsule IOSButton draws. */
const SWAP_CSS = `
.wow-swap .wow-glass { width: 52px; height: 52px; }
.wow-swap .wow-glass-btn { padding: 0; }
`;

type Phase = "idle" | "swapped" | "reverted";

export const LiveIconSwap = memo(function LiveIconSwap({
  reduced,
  timeScale,
  onPress,
  onPhaseChange,
  emit,
  resetKey,
  values,
  onStateChange,
}: StagePortProps) {
  const size = stageNumber(values, "size", 17);
  const revertAfter = stageNumber(values, "revertAfter", 1.5);
  const haptic = stageBool(values, "haptic", true);

  const fromRef = useRef<HTMLSpanElement | null>(null);
  const toRef = useRef<HTMLSpanElement | null>(null);

  // One value p drives both glyphs: 0 = `from` showing, 1 = `to` showing.
  const spring = useRef(createSpring(RESPONSE, DAMPING, 0));
  const tween = useRef({ from: 0, to: 0, start: 0 });
  const driver = useRef<"spring" | "ease">("spring");
  const shown = useRef(0);
  const frame = useRef(0);
  const last = useRef(0);

  const phase = useRef<Phase>("idle");
  const trigger = useRef(false);
  /** Bumped on every swap and revert: a pending haptic or timer from an older one is dropped. */
  const run = useRef(0);
  const revertPending = useRef(false);
  /** The press in flight found nothing to do (the trigger was already true). */
  const ignored = useRef(false);
  const laneRun = useRef(0);
  const timers = useRef(createTimers());
  const scaleRef = useLatest(timeScale);
  const reducedRef = useLatest(reduced);

  const paint = useCallback(
    (p: number) => {
      const scaled = !reducedRef.current;
      const from = fromRef.current;
      const to = toRef.current;
      if (from) {
        from.style.opacity = String(clamp(1 - p, 0, 1));
        from.style.transform = scaled ? `scale(${1 - (1 - SHRUNK) * p})` : "";
      }
      if (to) {
        to.style.opacity = String(clamp(p, 0, 1));
        to.style.transform = scaled ? `scale(${SHRUNK + (1 - SHRUNK) * p})` : "";
      }
    },
    [reducedRef],
  );

  const loop = useCallback(function step() {
    const now = performance.now();
    const dt = Math.min((now - last.current) / 1000, 0.064) / scaleRef.current;
    last.current = now;

    let p: number;
    let done: boolean;
    if (driver.current === "ease") {
      const t = tween.current;
      const progress = clamp((now - t.start) / 1000 / scaleRef.current / REDUCED_FADE, 0, 1);
      p = t.from + (t.to - t.from) * easeOut(progress);
      done = progress >= 1;
    } else {
      p = spring.current.step(dt);
      done = spring.current.settled;
    }
    shown.current = p;
    paint(p);
    frame.current = done ? 0 : requestAnimationFrame(step);
  }, [paint, scaleRef]);

  /** `withAnimation(swapAnimation) { phase = … }`: the spring, or the Reduce Motion fade. */
  const drive = useCallback(
    (target: number) => {
      if (reducedRef.current) {
        tween.current = { from: shown.current, to: target, start: performance.now() };
        driver.current = "ease";
      } else {
        if (driver.current !== "spring") spring.current.jump(shown.current);
        spring.current.retarget(target);
        driver.current = "spring";
      }
      if (frame.current) return;
      last.current = performance.now();
      frame.current = requestAnimationFrame(loop);
    },
    [loop, reducedRef],
  );

  const after = useCallback(
    (seconds: number, task: () => void) =>
      timers.current.after(seconds * 1000 * scaleRef.current, task),
    [scaleRef],
  );

  /** Timer or trigger → false. Never plays a haptic. */
  const revert = useCallback(
    (lane: number) => {
      run.current += 1; // drops a pending haptic and timer
      revertPending.current = false;
      if (phase.current !== "swapped") return;
      phase.current = "reverted";
      drive(0);
      if (lane === laneRun.current) emit("visual", "swap-revert");
      onStateChange("reverted");
    },
    [drive, emit, onStateChange],
  );

  /** false → true: `start()`. */
  const start = useCallback(() => {
    const lane = laneRun.current;
    emit("visual", "swap-in"); // WowProbe.onVisual
    run.current += 1;
    const token = run.current;
    phase.current = "swapped";
    drive(1);
    onStateChange("swapped");

    if (haptic) {
      after(HAPTIC_AT, () => {
        if (token === run.current && lane === laneRun.current) emit("haptic", "swap-success");
      });
    }
    if (revertAfter > 0) {
      revertPending.current = true;
      after(revertAfter, () => {
        if (token !== run.current) return;
        revert(lane);
        trigger.current = false; // the caller's re-arm on `.reverted`
      });
    }
  }, [after, drive, emit, haptic, onStateChange, revert, revertAfter]);

  /** Touch-down. A press the unit will ignore is not a run. */
  const down = useCallback(() => {
    ignored.current = trigger.current && revertPending.current;
    if (ignored.current) return;
    laneRun.current += 1;
    onPress();
  }, [onPress]);

  /** `released`: the Button's action. */
  const action = useCallback(() => {
    if (ignored.current) return;
    if (trigger.current) {
      trigger.current = false; // nothing will revert it on its own: the press does
      revert(laneRun.current);
      return;
    }
    trigger.current = true;
    start();
  }, [revert, start]);

  const phaseChange = useCallback(
    (next: PressPhase) => {
      if (!ignored.current) onPhaseChange(next);
    },
    [onPhaseChange],
  );

  const stop = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    timers.current.clear();
  }, []);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (resetKey === 0) return;
    stop();
    run.current += 1;
    revertPending.current = false;
    trigger.current = false;
    phase.current = "idle";
    spring.current.jump(0);
    driver.current = "spring";
    shown.current = 0;
    paint(0);
  }, [paint, resetKey, stop]);

  // Reduce Motion switched while at rest: repaint the pose without (or with) the scale.
  useEffect(() => {
    if (!frame.current) paint(shown.current);
  }, [paint, reduced]);

  return (
    <div className="wow-swap">
      <style>{SWAP_CSS}</style>
      <IOSButton
        label={
          <span
            className="grid place-items-center"
            style={{ width: size, height: size }}
          >
            <Layer layerRef={fromRef} initial={1}>
              <DocOnDoc size={size} />
            </Layer>
            <Layer layerRef={toRef} initial={0}>
              <Checkmark size={size} />
            </Layer>
          </span>
        }
        ariaLabel="Copy, press to run the icon swap"
        reduced={reduced}
        timeScale={timeScale}
        onPressStart={down}
        onPressEnd={action}
        onPhaseChange={phaseChange}
      />
    </div>
  );
});

/** One glyph of the pair, stacked on the other in the same grid cell. */
function Layer({
  layerRef,
  initial,
  children,
}: {
  layerRef: RefObject<HTMLSpanElement | null>;
  initial: number;
  children: ReactNode;
}) {
  return (
    <span
      ref={layerRef}
      className="grid place-items-center"
      style={{
        gridArea: "1 / 1",
        opacity: initial,
        transition: "none",
        transformOrigin: "center",
        willChange: "transform, opacity",
      }}
    >
      {children}
    </span>
  );
}
