"use client";

// LiveRewardBurst.tsx — units/reward-burst/WowRewardBurst.swift, in the browser.
//
// The React part is only plumbing; the burst itself is `burstPhysics.ts`, which is the
// Swift's `WowBurstPhysics` / `WowBurst` / `wowDrawPieces` / `wowDrawGlow` ported number
// for number. What matters here:
//
//   · the canvas is sized by the SOLVED envelope, offset against the button's layout box,
//     and the emission point is the button's top edge — the reward comes out of the button
//     that earned it;
//   · 1 pt = 1 px on this stage, so the physics' points are the canvas' CSS pixels and the
//     only conversion left is devicePixelRatio;
//   · the overlay is drawn AFTER the button and outside its press transform, which is what
//     a SwiftUI `.overlay` on the wrapper does;
//   · the haptic marker fires before any visual work, the order the Swift insists on;
//   · Reduce Motion: no particles, one 0.4 s glow pulse, same haptic.
//
// `count` and `duration` are the Swift's own parameters and come from the panel. The stage
// clips the burst at its edges the way a screen does; the lane, not the stage, is where the
// duration is read off.

import { memo, useCallback, useEffect, useRef } from "react";
import { IOSButton } from "./IOSButton";
import { useLatest } from "./motion";
import { boolValue, numberValue } from "./params";
import {
  burstBox,
  burstPalette,
  createBurst,
  drawGlow,
  drawPieces,
  type Box,
  type Burst,
} from "./burstPhysics";
import type { LivePortProps } from "./LivePress";

/** Retina is plenty; a 3× backing store on a 944 pt canvas is not. */
const MAX_DPR = 2;
/** Fallback tint if the button's custom property cannot be read. */
const FALLBACK_TINT = "rgb(0, 131, 247)";

type Live = {
  burst: Burst;
  box: Box;
  ctx: CanvasRenderingContext2D;
  palette: string[];
  tint: string;
  hostW: number;
};

export const LiveRewardBurst = memo(function LiveRewardBurst({
  reduced,
  timeScale,
  onPress,
  emit,
  resetKey,
  params,
}: LivePortProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const count = numberValue(params, "count", 24);
  const duration = numberValue(params, "duration", 1);
  const haptic = boolValue(params, "haptic", true);

  const live = useRef<Live | null>(null);
  const frame = useRef(0);
  const t0 = useRef(0);
  const scale = useLatest(timeScale);
  const reducedRef = useLatest(reduced);

  const clear = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    const state = live.current;
    if (state) {
      state.ctx.clearRect(0, 0, state.box.size.width, state.box.size.height);
    }
    live.current = null;
  }, []);

  const tick = useCallback(() => {
    const state = live.current;
    if (!state) {
      frame.current = 0;
      return;
    }
    const t = (performance.now() - t0.current) / 1000 / scale.current;
    state.ctx.clearRect(0, 0, state.box.size.width, state.box.size.height);

    // Last piece dead → nothing left to draw → the loop stops. Nothing loops.
    if (t >= state.burst.life) {
      live.current = null;
      frame.current = 0;
      return;
    }

    if (state.burst.glow) {
      drawGlow(state.ctx, t, state.box, state.tint);
    } else {
      drawPieces(state.ctx, t, state.box, state.hostW, state.burst.pieces, state.palette);
    }
    frame.current = requestAnimationFrame(tick);
  }, [scale]);

  const press = useCallback(() => {
    onPress();
    // `haptic: false` means WowHaptics is never asked, so the haptic row stays empty.
    if (haptic) emit("haptic", "burst-haptic"); // WowHaptics.play(.burst) — 1, before any view work
    emit("visual", "burst-visual"); // WowProbe.onVisual?("reward-burst", …) — 2

    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;

    // 1 pt = 1 px here, so the button's CSS box is already in the physics' units.
    const rect = host.getBoundingClientRect();
    const hostW = rect.width;
    const hostH = rect.height;

    // 3 — spawn. A trigger mid-flight replaces the burst, the way a fresh false→true does.
    const burst = createBurst(count, duration, reducedRef.current);
    const box = burstBox(burst, hostW, hostH);

    // One tint, read off the live button's own custom property, so dark mode needs no
    // second source of truth.
    const fill = getComputedStyle(host).getPropertyValue("--wow-fill").trim();
    const tint = fill ? `rgb(${fill})` : FALLBACK_TINT;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.style.left = `${box.offset.x}px`;
    canvas.style.top = `${box.offset.y}px`;
    canvas.style.width = `${box.size.width}px`;
    canvas.style.height = `${box.size.height}px`;
    canvas.width = Math.max(1, Math.ceil(box.size.width * dpr));
    canvas.height = Math.max(1, Math.ceil(box.size.height * dpr));

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Backing pixels per point: everything drawn from here on is in points.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    live.current = { burst, box, ctx, palette: burstPalette(tint), tint, hostW };
    t0.current = performance.now();
    frame.current = requestAnimationFrame(tick);
  }, [count, duration, emit, haptic, onPress, reducedRef, tick]);

  useEffect(() => clear, [clear]);

  useEffect(() => {
    if (resetKey === 0) return;
    clear();
  }, [resetKey, clear]);

  return (
    <IOSButton
      label="Claim"
      ariaLabel="Claim, press to fire the reward burst"
      reduced={reduced}
      timeScale={timeScale}
      onPressStart={press}
      hostRef={hostRef}
      overlay={
        <canvas
          ref={canvasRef}
          aria-hidden
          className="pointer-events-none absolute"
          style={{ transition: "none" }}
        />
      }
    />
  );
});
