"use client";

// LiveHoldFill.tsx — units/hold-fill/WowHoldFill.swift, in the browser, on the demo's recipe
// (demo/Sources/RecordView.swift):
//
//   Text("Delete").ctaLook(tint: .red).wowHoldFill(duration: 2.0, tint: .white) { … }
//
// Hold-fill is not a Button. The hold replaces the tap and the unit has its own press (0.97 on an
// easeOut, not wowPress's 0.96 spring), so the capsule is IOSButton's look drawn inert, and the
// touch is this file's, running the Swift's machine one for one:
//   pressing     touch-down inside: .tap first, then the fill sweeps leading → trailing, LINEAR
//                over `duration` (never eased), and the label scales to 0.97 on 0.16 s easeOut
//   cancelled    lifted early, or the finger left the label's layout bounds (exact bounds, tested
//                outside the scale: decision 3): the fill retracts from where it is on 0.20 s
//                easeOut, the scale returns on 0.16 s easeOut, no haptic. Sticky for the rest of
//                that touch: coming back inside does not resume (decision 4)
//   released     the frame the fill completes, finger still down: .success, then the fill holds
//                full 0.12 s and fades over 0.20 s easeOut; the scale springs back (response 0.28,
//                dampingFraction 0.72). Lifting afterwards does nothing
//   interrupted  the system took the touch (pointercancel, lost capture, window blur): snap to
//                idle, no animation, no haptic
//   idle         once each sequence has settled: after the retract, after the fade
//   reduce       no scale. The fill still runs: it is the countdown, not decoration
//   keyboard     hold Space (or Enter): the same machine; Escape lets go early
//   voiceover    the Swift's "Confirm" action confirms without holding. Its web form is an
//                assistive click (a click with no pointer behind it): same haptic, same fade,
//                from a fill that starts full
//
// The long press is the clock (decision 1): the confirm is one timer `duration` after touch-down
// and the sweep is computed from that same instant, so it reads 100 % on the frame the confirm
// lands. `touch-action: none` is decision 5: a touch that starts on the label holds, it does not
// scroll the page.
//
// The fill is `tint` (white, the recipe's) at 22 % over the label, in a rounded rect of
// `cornerRadius`. That parameter's contract is "match the label's own shape", so the stage's
// label takes the same radius: at 26 it is the 52 pt capsule. systemRed is Apple's; the rim over
// it is not measured (glass-lab measured the blue button), it is lightened the way the blue one is.
//
// The phases are the unit's own WowPressPhase and go out through onPhaseChange, so the lane and
// the readout treat them as the press unit's: `released` is the confirm, and the success haptic
// and the fade are drawn from it.

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { IOSButton, type PressPhase } from "./IOSButton";
import { clamp, createSpring, createTimers, easeOut, useLatest } from "./motion";
import { stageBool, stageNumber, type StagePortProps } from "./stage";

const PRESSED_SCALE = 0.97;
/** Scale in, and on cancel back out. */
const PRESS_IN = 0.16;
/** Fill back to empty. */
const RETRACT = 0.2;
/** A confirmed fill stays full… */
const HOLD_FULL = 0.12;
/** …then fades. */
const FADE_OUT = 0.2;
/** Over the label, which stays legible under it. */
const FILL_OPACITY = 0.22;

const HOLD_CSS = `
.wow-hold .wow-glass { --wow-fill: 255, 59, 48; --wow-rim: 255, 160, 150; }
@media (prefers-color-scheme: dark) {
  .wow-hold .wow-glass { --wow-fill: 255, 69, 58; }
}
.wow-hold .wow-glass-btn,
.wow-hold .wow-glass-shadow { border-radius: var(--wow-hold-radius); }
`;

/** The touch in flight: the pointer or key that owns it. Stays until it lifts, whatever the phase. */
type Touch = { pointerId: number | null; key: string | null };

/** Where the fill's progress comes from. */
type Fill =
  | { mode: "none" }
  | { mode: "sweep"; start: number; seconds: number }
  | { mode: "retract"; start: number; from: number }
  | { mode: "full"; start: number };

export const LiveHoldFill = memo(function LiveHoldFill({
  reduced,
  timeScale,
  onPress,
  onPhaseChange,
  emit,
  resetKey,
  values,
}: StagePortProps) {
  const duration = stageNumber(values, "duration", 2);
  const cornerRadius = stageNumber(values, "cornerRadius", 26);
  const haptic = stageBool(values, "haptic", true);

  const hitRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const sweepRef = useRef<HTMLDivElement | null>(null);

  const phase = useRef<PressPhase>("idle");
  /** Bumped on every new hold: keys the fill and invalidates steps scheduled for the last one. */
  const attempt = useRef(0);
  const touch = useRef<Touch | null>(null);
  const fill = useRef<Fill>({ mode: "none" });

  // `pressed`, as p in 0…1 (scale = 1 − 0.03·p): an easeOut leg, or the confirm's spring.
  const press = useRef({ from: 0, to: 0, start: 0, seconds: PRESS_IN });
  const spring = useRef(createSpring(0.28, 0.72, 0));
  const driver = useRef<"ease" | "spring">("ease");
  const pressed = useRef(0);

  const frame = useRef(0);
  const last = useRef(0);
  const timers = useRef(createTimers());
  const scaleRef = useLatest(timeScale);
  const reducedRef = useLatest(reduced);

  /** Unit seconds since `start`. */
  const since = useCallback(
    (start: number, now: number) => (now - start) / 1000 / scaleRef.current,
    [scaleRef],
  );

  const progressAt = useCallback(
    (now: number) => {
      const f = fill.current;
      switch (f.mode) {
        case "none":
          return 0;
        case "sweep":
          return clamp(since(f.start, now) / f.seconds, 0, 1); // linear: the countdown
        case "retract":
          return f.from * (1 - easeOut(clamp(since(f.start, now) / RETRACT, 0, 1)));
        case "full":
          return 1;
      }
    },
    [since],
  );

  const paint = useCallback(
    (now: number) => {
      const f = fill.current;
      const layer = fillRef.current;
      if (layer) {
        let opacity = phase.current === "idle" ? 0 : FILL_OPACITY;
        if (f.mode === "full") {
          opacity *= 1 - easeOut(clamp((since(f.start, now) - HOLD_FULL) / FADE_OUT, 0, 1));
        }
        layer.style.opacity = opacity.toFixed(4);
      }
      if (sweepRef.current) {
        sweepRef.current.style.width = `${(progressAt(now) * 100).toFixed(3)}%`;
      }
      if (bodyRef.current) {
        const s = reducedRef.current ? 1 : 1 - (1 - PRESSED_SCALE) * pressed.current;
        bodyRef.current.style.transform = s === 1 ? "" : `scale(${s.toFixed(5)})`;
      }
    },
    [progressAt, reducedRef, since],
  );

  const loop = useCallback(function step() {
    const now = performance.now();
    const dt = Math.min((now - last.current) / 1000, 0.064) / scaleRef.current;
    last.current = now;

    let settled: boolean;
    if (driver.current === "spring") {
      pressed.current = spring.current.step(dt);
      settled = spring.current.settled;
    } else {
      const leg = press.current;
      const t = clamp(since(leg.start, now) / leg.seconds, 0, 1);
      pressed.current = leg.from + (leg.to - leg.from) * easeOut(t);
      settled = t >= 1;
    }
    paint(now);
    frame.current = settled && phase.current === "idle" ? 0 : requestAnimationFrame(step);
  }, [paint, scaleRef, since]);

  const wake = useCallback(() => {
    if (frame.current) return;
    last.current = performance.now();
    frame.current = requestAnimationFrame(loop);
  }, [loop]);

  /** `withAnimation(.easeOut(0.16)) { pressed = … }`, from wherever the scale is. */
  const easePress = useCallback((to: number) => {
    press.current = { from: pressed.current, to, start: performance.now(), seconds: PRESS_IN };
    driver.current = "ease";
  }, []);

  const after = useCallback(
    (seconds: number, task: () => void) =>
      timers.current.after(seconds * 1000 * scaleRef.current, task),
    [scaleRef],
  );

  const enter = useCallback(
    (next: PressPhase) => {
      phase.current = next;
      onPhaseChange(next);
    },
    [onPhaseChange],
  );

  /** Back to idle once this sequence's motion is over, unless a newer hold began. */
  const settle = useCallback(
    (delay: number) => {
      const token = attempt.current;
      after(delay, () => {
        if (token !== attempt.current) return;
        fill.current = { mode: "none" };
        enter("idle");
        wake();
      });
    },
    [after, enter, wake],
  );

  const confirm = useCallback(() => {
    if (haptic) emit("haptic", "hold-success"); // haptic first, on the full frame
    // onConfirm() would run here: the stage's action is the lane.
    enter("released"); // the page marks the release and draws the fade from it
    emit("visual", "hold-fade");
    fill.current = { mode: "full", start: performance.now() };
    spring.current.jump(pressed.current);
    spring.current.retarget(0);
    driver.current = "spring";
    settle(HOLD_FULL + FADE_OUT);
    wake();
  }, [emit, enter, haptic, settle, wake]);

  const begin = useCallback(() => {
    onPress(); // t = 0
    if (haptic) emit("haptic", "hold-tap"); // 1 — haptic, before any view work
    emit("visual", "hold-sweep"); // 2 — probe: the sweep starts
    attempt.current += 1; // 3 — a fresh fill: nothing in flight from the last hold
    const token = attempt.current;
    const now = performance.now();
    fill.current = { mode: "sweep", start: now, seconds: duration };
    enter("pressing");
    if (!reducedRef.current) emit("visual", "hold-press");
    easePress(1);
    wake();
    // Decision 1: the clock. `duration` after touch-down, finger still down, it confirms.
    after(duration, () => {
      if (token !== attempt.current || phase.current !== "pressing") return;
      confirm();
    });
  }, [after, confirm, duration, easePress, emit, enter, haptic, onPress, reducedRef, wake]);

  /** Lifted early or left the label. A no-op once confirmed, cancelled or interrupted. */
  const cancel = useCallback(() => {
    if (phase.current !== "pressing") return;
    const now = performance.now();
    fill.current = { mode: "retract", start: now, from: progressAt(now) };
    enter("cancelled");
    easePress(0);
    settle(RETRACT);
    wake();
  }, [easePress, enter, progressAt, settle, wake]);

  /** The system took the touch mid-hold: snap to idle, no animation. */
  const interrupt = useCallback(() => {
    if (phase.current !== "pressing") return;
    attempt.current += 1;
    enter("interrupted");
    fill.current = { mode: "none" };
    press.current = { from: 0, to: 0, start: 0, seconds: PRESS_IN };
    driver.current = "ease";
    pressed.current = 0;
    enter("idle");
    paint(performance.now());
  }, [enter, paint]);

  /** The Swift's "Confirm" accessibility action: no hold, a fill that starts full. */
  const confirmWithoutHolding = useCallback(() => {
    onPress();
    attempt.current += 1;
    confirm();
  }, [confirm, onPress]);

  const isInside = useCallback((x: number, y: number) => {
    const box = hitRef.current?.getBoundingClientRect();
    if (!box) return false;
    return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
  }, []);

  // The touch's life, on window so a finger dragged far off still reports in.
  useEffect(() => {
    const owns = (event: PointerEvent) => touch.current?.pointerId === event.pointerId;
    const move = (event: PointerEvent) => {
      if (owns(event) && !isInside(event.clientX, event.clientY)) cancel();
    };
    const up = (event: PointerEvent) => {
      if (!owns(event)) return;
      touch.current = null;
      cancel();
    };
    const lost = (event: PointerEvent) => {
      if (!owns(event)) return;
      touch.current = null;
      interrupt();
    };
    const blur = () => {
      if (!touch.current) return;
      touch.current = null;
      interrupt();
    };
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", lost, true);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", lost, true);
      window.removeEventListener("blur", blur);
    };
  }, [cancel, interrupt, isInside]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || touch.current) return;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Not a live pointer. The window listeners still follow it.
      }
      touch.current = { pointerId: event.pointerId, key: null };
      begin();
    },
    [begin],
  );

  const onLostPointerCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      if (touch.current?.pointerId !== event.pointerId) return;
      touch.current = null;
      interrupt();
    },
    [interrupt],
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        if (touch.current) cancel();
        return;
      }
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      if (event.repeat || touch.current) return;
      touch.current = { pointerId: null, key: event.key };
      begin();
    },
    [begin, cancel],
  );

  const onKeyUp = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (touch.current?.key !== event.key) return;
      event.preventDefault();
      touch.current = null;
      cancel();
    },
    [cancel],
  );

  const onBlur = useCallback(() => {
    if (!touch.current?.key) return;
    touch.current = null;
    interrupt();
  }, [interrupt]);

  /** A click with no pointer behind it is an assistive technology's activation. */
  const onClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.detail !== 0 || touch.current) return;
      confirmWithoutHolding();
    },
    [confirmWithoutHolding],
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
    touch.current = null;
    attempt.current += 1;
    phase.current = "idle";
    fill.current = { mode: "none" };
    press.current = { from: 0, to: 0, start: 0, seconds: PRESS_IN };
    driver.current = "ease";
    pressed.current = 0;
    paint(performance.now());
  }, [paint, resetKey, stop]);

  const radius = `${cornerRadius}px`;

  return (
    <div className="wow-hold" style={{ "--wow-hold-radius": radius } as CSSProperties}>
      <style>{HOLD_CSS}</style>
      <div
        ref={hitRef}
        role="button"
        tabIndex={0}
        aria-label="Delete, hold to run the hold fill"
        className="relative cursor-pointer select-none"
        style={{
          width: 300,
          maxWidth: "100%",
          height: 52,
          borderRadius: radius,
          touchAction: "none",
          WebkitTouchCallout: "none",
          WebkitTapHighlightColor: "transparent",
        }}
        onPointerDown={onPointerDown}
        onLostPointerCapture={onLostPointerCapture}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={onBlur}
        onClick={onClick}
        onContextMenu={(event) => event.preventDefault()}
      >
        {/* The scale, outside the hit test (decision 3): label and fill scale together. */}
        <div ref={bodyRef} className="absolute inset-0" style={{ transition: "none" }}>
          <div inert className="absolute inset-0">
            <IOSButton
              label="Delete"
              ariaLabel="Delete"
              reduced={reduced}
              timeScale={timeScale}
              pressScale={1}
              pressDim={0}
              onPressStart={() => {}}
            />
          </div>
          <div
            ref={fillRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ borderRadius: radius, opacity: 0, transition: "none", zIndex: 3 }}
          >
            <div
              ref={sweepRef}
              className="absolute inset-y-0 left-0 bg-white"
              style={{ width: "0%", transition: "none" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
