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

import {
  useCallback,
  useEffect,
  useId,
  useRef,
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
  /** Touch-down. This is t = 0 for the whole run. */
  onPressStart: () => void;
  onPressEnd?: () => void;
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
  hostRef,
  overlay,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const funcsRef = useRef<(SVGComponentTransferFunctionElement | null)[]>([]);
  const filterId = `wow-dim-${useId().replace(/[:]/g, "")}`;

  // One normalised value drives both properties, because SwiftUI drives both from one
  // `.animation(…, value: pressed)`: scale = 1 − (1 − scale)·p, brightness = −dim·p.
  const spring = useRef(createSpring(0.18, 0.7, 0));
  const tween = useRef({ from: 0, to: 0, elapsed: 0, running: false });
  const frame = useRef(0);
  const last = useRef(0);
  const scale = useLatest(timeScale);
  const reducedRef = useLatest(reduced);
  // Read per frame, so moving a slider mid-press lands on the very next frame.
  const pressScaleRef = useLatest(pressScale);
  const pressDimRef = useLatest(pressDim);

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
    (target: number) => {
      if (reducedRef.current) {
        // Reduce Motion gets `.easeOut(duration: 0.12)`, not a spring. Retargeting mid-tween
        // starts from where the curve actually is, so a fast double press does not jump.
        const t = tween.current;
        t.from = t.running
          ? t.from + (t.to - t.from) * easeOut(Math.min(t.elapsed / REDUCED_SECONDS, 1))
          : t.to;
        t.to = target;
        t.elapsed = 0;
        t.running = true;
      } else {
        spring.current.retarget(target);
      }

      if (frame.current) return;
      last.current = performance.now();

      const loop = () => {
        const now = performance.now();
        // Wall-clock delta converted to unit time: `slow ×4` stretches the same curve.
        const dt = Math.min((now - last.current) / 1000, 0.064) / scale.current;
        last.current = now;

        let p: number;
        let done: boolean;

        if (reducedRef.current) {
          const t = tween.current;
          t.elapsed += dt;
          const progress = Math.min(t.elapsed / REDUCED_SECONDS, 1);
          p = t.from + (t.to - t.from) * easeOut(progress);
          done = progress >= 1;
          if (done) t.running = false;
        } else {
          p = spring.current.step(dt);
          done = spring.current.settled;
        }

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

  const down = useRef(false);

  const press = useCallback(() => {
    if (down.current) return;
    down.current = true;
    drive(1);
    onPressStart();
  }, [drive, onPressStart]);

  const release = useCallback(() => {
    if (!down.current) return;
    down.current = false;
    drive(0);
    onPressEnd?.();
  }, [drive, onPressEnd]);

  /** Stand-in for the device tilt iOS reads off the gyro: the sweep follows the pointer. */
  const sweep = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    button.style.setProperty("--wow-spec-x", `${x.toFixed(1)}%`);
  }, []);

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
          onPointerDown={(event) => {
            sweep(event);
            press();
          }}
          onPointerMove={sweep}
          onPointerUp={release}
          onPointerCancel={release}
          onPointerLeave={release}
          onKeyDown={(event) => {
            if (event.key !== " " && event.key !== "Enter") return;
            event.preventDefault();
            if (!event.repeat) press();
          }}
          onKeyUp={(event) => {
            if (event.key !== " " && event.key !== "Enter") return;
            event.preventDefault();
            release();
          }}
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
