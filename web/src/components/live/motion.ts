"use client";

// motion.ts — the numeric pieces every live port shares.
//
// Nothing here guesses a curve. SwiftUI's `spring(response:dampingFraction:)` and
// `easeOut(duration:)` are both fully specified, so both are solved rather than
// approximated with a CSS `transition` that happens to look close.
//
// Note on `globals.css`: it sets `* { transition-duration: 120ms }`. Every element these
// ports drive per frame therefore has to opt out with an explicit `transition: none`,
// or the browser would tween on top of the solver and none of the numbers below
// would reach the screen.

import { useEffect, useRef, type RefObject } from "react";

/**
 * The current value of `value`, readable from a frame loop or an event handler.
 *
 * The ports run on requestAnimationFrame, so they need `reduced` and the time scale as
 * they are NOW rather than as they were when the closure was made. Synced in an effect
 * because writing a ref during render is a render-purity break (react-hooks/refs).
 */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

// MARK: - Spring

export type Spring = {
  value: number;
  velocity: number;
  target: number;
  /** True once the spring is within tolerance of its target and has stopped. */
  settled: boolean;
  /** Advances `dt` seconds of UNIT time (slow motion divides before calling). */
  step(dt: number): number;
  /** Retargets without discarding velocity — a re-press mid-return keeps its momentum. */
  retarget(target: number): void;
  /** Hard reset: position, no velocity. */
  jump(value: number): void;
};

/** Integration sub-step. 1 ms keeps semi-implicit Euler stable at response 0.18 (ω ≈ 35 rad/s). */
const SUB_STEP = 0.001;
/** Beyond this a frame is a tab switch, not a frame; the solver refuses to teleport. */
const MAX_FRAME = 0.064;

/**
 * SwiftUI's `spring(response:dampingFraction:)`, solved.
 *
 *   ω₀ = 2π / response        stiffness = ω₀²        damping = 2 · ζ · √stiffness
 *
 * which is the unit-mass form of x'' = −k(x − target) − c·x'. ζ < 1 means it overshoots,
 * and the overshoot is kept: scaling past 0.96 on the way down and past 1.0 on the way
 * back is the spring, not a bug.
 */
export function createSpring(
  response: number,
  dampingFraction: number,
  initial = 0,
): Spring {
  const omega = (2 * Math.PI) / response;
  const stiffness = omega * omega;
  const damping = 2 * dampingFraction * Math.sqrt(stiffness);

  return {
    value: initial,
    velocity: 0,
    target: initial,
    settled: true,

    step(dt: number) {
      if (this.settled) return this.value;
      let remaining = Math.min(Math.max(dt, 0), MAX_FRAME);
      while (remaining > 0) {
        const h = Math.min(SUB_STEP, remaining);
        const accel = -stiffness * (this.value - this.target) - damping * this.velocity;
        this.velocity += accel * h;
        this.value += this.velocity * h;
        remaining -= h;
      }
      // Tolerances in units of the animated quantity (0…1 here), one part in ~2000.
      if (
        Math.abs(this.value - this.target) < 0.0005 &&
        Math.abs(this.velocity) < 0.005
      ) {
        this.value = this.target;
        this.velocity = 0;
        this.settled = true;
      }
      return this.value;
    },

    retarget(target: number) {
      this.target = target;
      this.settled = false;
    },

    jump(value: number) {
      this.value = value;
      this.target = value;
      this.velocity = 0;
      this.settled = true;
    },
  };
}

// MARK: - Easing

/**
 * `cubic-bezier(x1, y1, x2, y2)` as a progress function, Newton–Raphson with a bisection
 * fallback. SwiftUI's `.easeOut` is cubic-bezier(0, 0, 0.58, 1) — the same curve CSS calls
 * `ease-out` — so the draw and the fades below are the real curve, not `t²`.
 */
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): (t: number) => number {
  const ax = 3 * x1 - 3 * x2 + 1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const error = sampleX(t) - x;
      if (Math.abs(error) < 1e-6) return sampleY(t);
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= error / slope;
    }

    let low = 0;
    let high = 1;
    t = x;
    while (high - low > 1e-6) {
      if (sampleX(t) < x) low = t;
      else high = t;
      t = (low + high) / 2;
    }
    return sampleY(t);
  };
}

/** SwiftUI `.easeOut`. */
export const easeOut = cubicBezier(0, 0, 0.58, 1);

// MARK: - Small helpers

export function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

/** Uniform in [low, high]. The burst's only source of randomness. */
export function rand(low: number, high: number): number {
  return low + Math.random() * (high - low);
}

/** setTimeout bookkeeping, so a reset or an unmount can drop a whole schedule at once. */
export function createTimers() {
  let ids: ReturnType<typeof setTimeout>[] = [];
  return {
    after(ms: number, run: () => void) {
      ids.push(setTimeout(run, ms));
    },
    clear() {
      for (const id of ids) clearTimeout(id);
      ids = [];
    },
  };
}
