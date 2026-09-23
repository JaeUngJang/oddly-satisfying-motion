"use client";

// IOSButton.tsx — the button all three ports are pressed on, plus the press unit's own
// mechanics (they are shared because the demo's recipe shares them: column B is
// `.wowPress()` first, then whatever the unit adds).
//
// ── Appearance: iOS 26 `.glassProminent`, stage A ───────────────────────────────────
// The look is not styled by eye here. `web/glass-lab/` diffs three renderings of the same
// iOS 26 capture: stage A (`glass-lab/style.css`) is the CSS/SVG rendition and measured
// 93 % against the reference; stage B (`glass-lab/webgl.js`) reaches 96 % with a WebGL
// refraction pass. This file is a port of STAGE A, deliberately: the site is four static
// pages of monochrome chrome and a GL context per unit page is not worth three points.
// If a higher-fidelity button is ever wanted, stage B is already written and verified.
//
// Ported from the lab, value for value:
//   · capsule, 300 × 52 pt, radius 26 pt, 1 pt = 1 px on this stage
//   · fill  #0083F7 light / #0A84FF dark — the measured interior. The lab composites it
//     at ~0.985 alpha over a blurred backdrop; this stage's backdrop is a flat #FAFAFA
//     panel, so the same colour is laid down opaque and the backdrop-filter layers
//     (`.btnA-refract` / `.btnA-blur`) are dropped rather than faked.
//   · rim   the 1.25 pt ramp: rgb(56,228,255) at 0.90 / 0.42 / 0.18 over 0.5 / 1 / 2 px
//   · shadow 0 3px 7px black 10 % + 0 9px 22px black 8.5 %, on a SIBLING span — a filter
//     on an ancestor would make it a backdrop root, and the lab's comment on that stands
//   · specular sweep along the top edge, pointer-driven (iOS drives it from the gyro)
//   · label 17 pt system font, weight 600, tracking −0.012em
//
// Pressed state: the lab swaps the tint to a deeper measured fill (0,110,224), which is
// the same colour SwiftUI's `.brightness(-dim)` produces at dim ≈ 0.085. Rather than run
// two mechanisms, this keeps the Swift's one — an ADDITIVE brightness, so the slider on
// the page is the unit's real `dim` parameter and the lab's pressed fill sits inside its
// range. Scale is the same spring the Swift declares.
// ────────────────────────────────────────────────────────────────────────────────────
//
// ── Press phases: `WowPressPhase` in units/_core/WowCore.swift ───────────────────────
// A button that only knows "down" and "up" gets the edges wrong (dragged off, it stayed
// pressed), so this runs the five phases the Swift documents, one for one:
//
//   idle         nothing in flight
//   pressing     pointer down inside, or Space / Enter down. Spring to pressed; the
//                haptic marker fires once per press, on entry (`onPressStart`)
//   cancelled    dragged outside the button + 8 px slop, or Escape. easeOut 160 ms back
//                to rest: no overshoot, no marker. Dragging back in resumes `pressing`
//                silently; lifting outside ends the press still `cancelled`
//   released     lifted inside, or the key comes up. Spring back with its overshoot;
//                `onPressEnd` is where a SwiftUI Button runs its action
//   interrupted  pointercancel, lostpointercapture, window or focus blur: the system
//                took the touch. easeOut 120 ms to rest, no marker
//
// `idle` is reported the moment a press is over, after whichever of the last three it
// ended in: the same contract as `wowPress { phase in … }` in units/press/WowPress.swift,
// where `onPhaseChange` hears every transition. The curves are that file's `curve(into:)`.
//
// The pointer is captured on touch-down, so moves outside the button keep arriving and
// are hit-tested; the listeners sit on `window`, so a press whose capture could not be
// taken still ends. The hit test uses the LAYOUT box (`.wow-glass`, unscaled), not the
// button under its press transform: at `scale: 0.90` the pressed capsule is 15 px
// narrower a side, and testing against it would flip a finger resting near the edge
// between pressing and cancelled on every frame.
// ────────────────────────────────────────────────────────────────────────────────────

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createSpring, easeOut, useLatest } from "./motion";

/** WowPressStyle defaults, used by the ports that do not expose press as a parameter. */
const PRESS_SCALE = 0.96;
const PRESS_DIM = 0.06;
/** Reduce Motion: `.opacity(0.75)` over `.easeOut(duration: 0.12)`. */
const REDUCED_OPACITY = 0.75;
const REDUCED_SECONDS = 0.12;
/** `cancelled`: back to rest without the spring's overshoot. */
const CANCEL_SECONDS = 0.16;
/** `interrupted`: the system took the touch; snap to rest. */
const INTERRUPT_SECONDS = 0.12;
/** Slop around the layout box before a drag counts as outside, px (1 pt = 1 px here). */
const HIT_SLOP = 8;

/** `WowPressPhase` in units/_core/WowCore.swift, one for one. */
export type PressPhase = "idle" | "pressing" | "cancelled" | "released" | "interrupted";

/** How a transition moves: SwiftUI's spring, or an easeOut leg of a set length. */
type Curve = { kind: "spring" } | { kind: "ease"; seconds: number };

const SPRING: Curve = { kind: "spring" };
const CANCEL: Curve = { kind: "ease", seconds: CANCEL_SECONDS };
const INTERRUPT: Curve = { kind: "ease", seconds: INTERRUPT_SECONDS };

/** The press in flight: the pointer or key that owns it, and whether it is over the button. */
type Press = { pointerId: number | null; key: string | null; inside: boolean };

const GLASS_CSS = `
.wow-glass {
  --wow-fill: 0, 131, 247;
  --wow-rim: 56, 228, 255;
  position: relative;
  width: 300px;
  height: 52px;
  max-width: 100%;
}
@media (prefers-color-scheme: dark) {
  .wow-glass { --wow-fill: 10, 132, 255; }
}
.wow-glass-wrap {
  position: absolute;
  inset: 0;
  transition: none;
  will-change: transform;
}
.wow-glass-shadow {
  position: absolute;
  inset: 0;
  border-radius: 26px;
  box-shadow: 0 3px 7px rgba(0, 0, 0, 0.10), 0 9px 22px rgba(0, 0, 0, 0.085);
}
.wow-glass-btn {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 15px 20px;
  border: 0;
  border-radius: 26px;
  overflow: hidden;
  background: transparent;
  transition: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
  cursor: pointer;
}
.wow-glass-tint {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: rgb(var(--wow-fill));
}
.wow-glass-rim {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow:
    inset 0 0 0 0.5px rgba(var(--wow-rim), 0.90),
    inset 0 0 0 1px rgba(var(--wow-rim), 0.42),
    inset 0 0 2px 0.25px rgba(var(--wow-rim), 0.18);
}
.wow-glass-spec {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 6px;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0.85;
  background: radial-gradient(
    46px 5px at var(--wow-spec-x, 50%) 0.5px,
    rgba(255, 255, 255, 0.40) 0%,
    rgba(255, 255, 255, 0.10) 52%,
    rgba(255, 255, 255, 0) 80%);
}
.wow-glass-label {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  color: #fff;
  font: 600 17px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
  letter-spacing: -0.012em;
}
`;

type Props = {
  /** Button content. Ports swap it for a spinner or a check. */
  label: ReactNode;
  ariaLabel: string;
  reduced: boolean;
  /** 1, or 4 under `slow ×4`. The spring is solved in slowed time. */
  timeScale: number;
  /** `wowPress(scale:)`. Only the press unit exposes it; the others run the Swift default. */
  pressScale?: number;
  /** `wowPress(dim:)`, an ADDITIVE darkening, same as SwiftUI's `.brightness(-dim)`. */
  pressDim?: number;
  /**
   * idle → pressing: touch-down or key-down. This is t = 0 for the whole run, and it fires
   * once per press: a drag that comes back inside does not fire it again.
   */
  onPressStart: () => void;
  /** `released`: lifted inside. Where a SwiftUI Button runs its action. */
  onPressEnd?: () => void;
  /**
   * Every transition, as the Swift reports them: `idle` follows `released`, `cancelled` or
   * `interrupted` the moment the press is over.
   */
  onPhaseChange?: (phase: PressPhase) => void;
  /** The button's layout box, for a port that needs to position an overlay against it. */
  hostRef?: RefObject<HTMLDivElement | null>;
  /** Drawn above the button and outside its transform, the way a SwiftUI `.overlay` is. */
  overlay?: ReactNode;
};

export function IOSButton({
  label,
  ariaLabel,
  reduced,
  timeScale,
  pressScale = PRESS_SCALE,
  pressDim = PRESS_DIM,
  onPressStart,
  onPressEnd,
  onPhaseChange,
  hostRef,
  overlay,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const funcsRef = useRef<(SVGComponentTransferFunctionElement | null)[]>([]);
  const filterId = `wow-dim-${useId().replace(/[:]/g, "")}`;

  // One normalised value drives both properties, because SwiftUI drives both from one
  // `.animation(…, value: pressed)`: scale = 1 − (1 − scale)·p, brightness = −dim·p.
  // Two curves can move it: the spring (pressing, released) and an easeOut leg (the
  // cancel and interrupt returns, and every transition under Reduce Motion).
  const spring = useRef(createSpring(0.18, 0.7, 0));
  const tween = useRef({ from: 0, to: 0, elapsed: 0, seconds: REDUCED_SECONDS });
  const driver = useRef<Curve["kind"]>("spring");
  /** p as last painted: where a handover from one curve to the other starts. */
  const shown = useRef(0);
  const frame = useRef(0);
  const last = useRef(0);
  const scale = useLatest(timeScale);
  const reducedRef = useLatest(reduced);
  // Read per frame, so moving a slider mid-press lands on the very next frame.
  const pressScaleRef = useLatest(pressScale);
  const pressDimRef = useLatest(pressDim);
  const onPressStartRef = useLatest(onPressStart);
  const onPressEndRef = useLatest(onPressEnd);
  const onPhaseChangeRef = useLatest(onPhaseChange);

  const paint = useCallback(
    (p: number) => {
      const wrap = wrapRef.current;
      const button = buttonRef.current;
      if (!wrap || !button) return;

      if (reducedRef.current) {
        wrap.style.transform = "";
        wrap.style.opacity = String(1 - (1 - REDUCED_OPACITY) * p);
      } else {
        wrap.style.transform = `scale(${1 - (1 - pressScaleRef.current) * p})`;
        wrap.style.opacity = "";
      }

      // SwiftUI's `.brightness` ADDS to each channel, so the port is an feComponentTransfer
      // with slope 1 and a negative intercept — not CSS `filter: brightness()`, which
      // multiplies. Dropped entirely at rest so the button is not rendered off-screen.
      const intercept = -pressDimRef.current * p;
      if (Math.abs(intercept) < 0.0005) {
        button.style.filter = "";
        return;
      }
      for (const func of funcsRef.current) {
        func?.setAttribute("intercept", intercept.toFixed(4));
      }
      button.style.filter = `url(#${filterId})`;
    },
    [filterId, pressDimRef, pressScaleRef, reducedRef],
  );

  const drive = useCallback(
    (target: number, curve: Curve) => {
      // Reduce Motion has one curve for every transition, `.easeOut(duration: 0.12)`.
      const how: Curve = reducedRef.current ? { kind: "ease", seconds: REDUCED_SECONDS } : curve;

      if (how.kind === "spring") {
        // Retargeting keeps velocity, so a re-press mid-return keeps its momentum. Coming
        // off an easeOut leg, the spring starts where that leg actually is.
        if (driver.current !== "spring") spring.current.jump(shown.current);
        spring.current.retarget(target);
      } else {
        // Starts from what is on screen, so a fast double press or a cancel mid-spring
        // does not jump.
        const t = tween.current;
        t.from = shown.current;
        t.to = target;
        t.elapsed = 0;
        t.seconds = how.seconds;
      }
      driver.current = how.kind;

      if (frame.current) return;
      last.current = performance.now();

      const loop = () => {
        const now = performance.now();
        // Wall-clock delta converted to unit time: `slow ×4` stretches the same curve.
        const dt = Math.min((now - last.current) / 1000, 0.064) / scale.current;
        last.current = now;

        let p: number;
        let done: boolean;

        if (driver.current === "ease") {
          const t = tween.current;
          t.elapsed += dt;
          const progress = Math.min(t.elapsed / t.seconds, 1);
          p = t.from + (t.to - t.from) * easeOut(progress);
          done = progress >= 1;
        } else {
          p = spring.current.step(dt);
          done = spring.current.settled;
        }

        shown.current = p;
        paint(p);
        frame.current = done ? 0 : requestAnimationFrame(loop);
      };

      frame.current = requestAnimationFrame(loop);
    },
    [paint, reducedRef, scale],
  );

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  // ── The phase machine. See the header for the table it implements. ─────────────────
  const press = useRef<Press | null>(null);

  const report = useCallback(
    (phase: PressPhase) => onPhaseChangeRef.current?.(phase),
    [onPhaseChangeRef],
  );

  /** idle → pressing: the one place the haptic marker and t = 0 come from. */
  const begin = useCallback(
    (pointerId: number | null, key: string | null) => {
      press.current = { pointerId, key, inside: true };
      drive(1, SPRING);
      onPressStartRef.current();
      report("pressing");
    },
    [drive, onPressStartRef, report],
  );

  /** pressing → cancelled, still held: the finger went outside. */
  const leave = useCallback(() => {
    const current = press.current;
    if (!current?.inside) return;
    current.inside = false;
    drive(0, CANCEL);
    report("cancelled");
  }, [drive, report]);

  /** cancelled → pressing, same press: back inside. No marker, no new t = 0. */
  const enter = useCallback(() => {
    const current = press.current;
    if (!current || current.inside) return;
    current.inside = true;
    drive(1, SPRING);
    report("pressing");
  }, [drive, report]);

  /** Lifted. Inside it is `released` and the action runs; outside it stays `cancelled`. */
  const lift = useCallback(() => {
    const current = press.current;
    if (!current) return;
    press.current = null;
    if (current.inside) {
      drive(0, SPRING);
      report("released");
      onPressEndRef.current?.();
    }
    report("idle");
  }, [drive, onPressEndRef, report]);

  /** Escape: the press is retracted. Nothing resumes it and the later key-up does nothing. */
  const retract = useCallback(() => {
    const current = press.current;
    if (!current) return;
    press.current = null;
    if (current.inside) {
      drive(0, CANCEL);
      report("cancelled");
    }
    report("idle");
  }, [drive, report]);

  /** The system took the touch, inside or already dragged out. */
  const interrupt = useCallback(() => {
    if (!press.current) return;
    press.current = null;
    drive(0, INTERRUPT);
    report("interrupted");
    report("idle");
  }, [drive, report]);

  /** Inside the unscaled layout box plus HIT_SLOP. The header says why not the button's rect. */
  const isInside = useCallback((x: number, y: number) => {
    const box = wrapRef.current?.parentElement?.getBoundingClientRect();
    if (!box) return false;
    return (
      x >= box.left - HIT_SLOP &&
      x <= box.right + HIT_SLOP &&
      y >= box.top - HIT_SLOP &&
      y <= box.bottom + HIT_SLOP
    );
  }, []);

  useEffect(() => {
    const owns = (event: PointerEvent) => press.current?.pointerId === event.pointerId;

    const move = (event: PointerEvent) => {
      if (!owns(event)) return;
      if (isInside(event.clientX, event.clientY)) enter();
      else leave();
    };
    const up = (event: PointerEvent) => {
      if (!owns(event)) return;
      // Where it lifts decides, not the last move: a flick can end with no move between.
      move(event);
      lift();
    };
    const cancel = (event: PointerEvent) => {
      if (owns(event)) interrupt();
    };

    // Capture phase, so nothing else on the page can swallow the end of a press.
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", cancel, true);
    window.addEventListener("blur", interrupt);
    return () => {
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", cancel, true);
      window.removeEventListener("blur", interrupt);
    };
  }, [enter, interrupt, isInside, leave, lift]);

  /** Stand-in for the device tilt iOS reads off the gyro: the sweep follows the pointer. */
  const sweep = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    // Clamped: under capture the pointer can be far outside, and the sweep stays on the rim.
    const x = Math.min(Math.max(((event.clientX - rect.left) / rect.width) * 100, 0), 100);
    button.style.setProperty("--wow-spec-x", `${x.toFixed(1)}%`);
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      sweep(event);
      // Primary button only, and one press at a time: a second finger is ignored.
      if (event.button !== 0 || press.current) return;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Not a live pointer (a synthetic event). The window listeners still follow it.
      }
      begin(event.pointerId, null);
    },
    [begin, sweep],
  );

  const onLostPointerCapture = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      // A child's implicit touch capture handing over to the button bubbles here too; only
      // the button's own capture ending means the system took the pointer. After a normal
      // lift the press is already over, so this does nothing then.
      if (event.target !== event.currentTarget) return;
      if (press.current?.pointerId === event.pointerId) interrupt();
    },
    [interrupt],
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Escape") {
        if (!press.current) return;
        event.preventDefault();
        retract();
        return;
      }
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      // Auto-repeat is the same press held down, not a new one.
      if (!event.repeat && !press.current) begin(null, event.key);
    },
    [begin, retract],
  );

  const onKeyUp = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      if (press.current?.key === event.key) lift();
    },
    [lift],
  );

  /** Focus leaving mid key-press means the key-up will never reach this button. */
  const onBlur = useCallback(() => {
    if (press.current?.key) interrupt();
  }, [interrupt]);

  return (
    <div className="wow-glass" ref={hostRef}>
      <style>{GLASS_CSS}</style>

      {/* The additive-brightness filter, off-screen and inert until a press. */}
      <svg aria-hidden focusable="false" width="0" height="0" className="absolute">
        <filter id={filterId} colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR
              type="linear"
              slope="1"
              intercept="0"
              ref={(el) => {
                funcsRef.current[0] = el;
              }}
            />
            <feFuncG
              type="linear"
              slope="1"
              intercept="0"
              ref={(el) => {
                funcsRef.current[1] = el;
              }}
            />
            <feFuncB
              type="linear"
              slope="1"
              intercept="0"
              ref={(el) => {
                funcsRef.current[2] = el;
              }}
            />
          </feComponentTransfer>
        </filter>
      </svg>

      <div className="wow-glass-wrap" ref={wrapRef}>
        <span className="wow-glass-shadow" />
        <button
          ref={buttonRef}
          type="button"
          aria-label={ariaLabel}
          className="wow-glass-btn"
          onPointerDown={onPointerDown}
          onPointerMove={sweep}
          onLostPointerCapture={onLostPointerCapture}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onBlur={onBlur}
          onContextMenu={(event) => event.preventDefault()}
        >
          <span className="wow-glass-tint" />
          <span className="wow-glass-rim" />
          <span className="wow-glass-spec" />
          <span className="wow-glass-label">{label}</span>
        </button>
      </div>

      {overlay}
    </div>
  );
}
