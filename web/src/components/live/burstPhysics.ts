// burstPhysics.ts — a line-by-line port of `WowBurstPhysics`, `WowBurst` and the two
// draw functions in units/reward-burst/WowRewardBurst.swift.
//
// Everything is in POINTS and SECONDS, exactly as the Swift is. The canvas is scaled by
// pixels-per-point once, so gravity really is 900 pt/s² here too and the burst reaches
// the same height it does on the device.
//
// The four decisions the Swift file names are all kept:
//   1. closed form, p(t) = p₀ + v_t·t + (v₀ − v_t)(1 − e^(−kt))/k — no integration, so the
//      burst is identical at 60 and 120 Hz and cannot drift;
//   2. one random (mass) drives launch speed AND drag rate;
//   3. paper tumbles, x-scale = |cos(spin·t)| floored at 0.12;
//   4. the canvas is sized by the solved envelope, never by a guess.

import { rand } from "./motion";

export const BURST = {
  gravity: 900, // pt/s², down
  mass: [0.7, 1.3],
  drag: [1.6, 2.4], // force coefficient; drag rate k = drag/mass
  impulse: [520, 700], // pt/s at mass 1; launch speed = impulse/mass
  cone: [-110, -70], // degrees, screen coords: −90° is straight up
  lateral: [-60, 60], // pt/s sideways, on top of the cone
  spin: [-6, 6], // rad/s
  edge: [4, 7], // long edge, pt
  span: [0.75, 1.0], // fraction of `duration` each piece lives
  alpha: [0.85, 1.0],
  jitter: 0.2, // ± fraction of host width along the top edge
  seam: 2, // ± pt off the edge
  fadeFrom: 0.7, // fade over the last 30 % of each life
  count: [12, 40],
  duration: [0.3, 3.0],
  glowSeconds: 0.4,
  glowScale: 1.6,
  glowOpacity: 0.5,
  tumbleFloor: 0.12,
  driftShare: 0.4,
} as const;

/** Five brightness steps off ONE tint. A rainbow is a casino. */
const SHADES = [0.8, 0.9, 1.0, 1.1, 1.18];

type Piece = {
  fx: number; // spawn offset along the top edge, as a fraction of host width
  y0: number; // spawn offset off the edge, pt
  k: number; // drag rate, 1/s
  vt: number; // terminal fall speed, pt/s (= gravity/k)
  ax: number; // x(t) = fx·W + ax·(1 − e^(−kt))
  ay: number; // y(t) = y0 + vt·t + ay·(1 − e^(−kt))
  w: number;
  h: number;
  tilt: number; // starting orientation, rad
  spin: number; // rad/s
  life: number; // s
  alpha: number;
  shade: number;
  round: boolean;
};

type Envelope = { rise: number; fall: number; side: number; jitter: number };

export type Box = {
  /** Canvas top-leading, in host coordinates (pt). */
  offset: { x: number; y: number };
  size: { width: number; height: number };
  /** Emission point, in canvas coordinates (pt). */
  origin: { x: number; y: number };
  glowRadius: number;
};

export type Burst = {
  /** Total seconds before the overlay retires itself. */
  life: number;
  glow: boolean;
  pieces: Piece[];
  envelope: Envelope;
};

export function createBurst(count: number, duration: number, glow: boolean): Burst {
  if (glow) {
    return {
      life: BURST.glowSeconds,
      glow: true,
      pieces: [],
      envelope: { rise: 0, fall: 0, side: 0, jitter: 0 },
    };
  }

  const total = Math.min(Math.max(duration, BURST.duration[0]), BURST.duration[1]);
  const n = Math.min(Math.max(count, BURST.count[0]), BURST.count[1]);
  const pieces: Piece[] = [];
  const envelope: Envelope = { rise: 0, fall: 0, side: 0, jitter: 0 };

  for (let i = 0; i < n; i += 1) {
    const mass = rand(BURST.mass[0], BURST.mass[1]);
    const k = rand(BURST.drag[0], BURST.drag[1]) / mass;
    const vt = BURST.gravity / k;
    const speed = rand(BURST.impulse[0], BURST.impulse[1]) / mass;
    const angle = (rand(BURST.cone[0], BURST.cone[1]) * Math.PI) / 180;
    const vx = Math.cos(angle) * speed + rand(BURST.lateral[0], BURST.lateral[1]);
    const vy = Math.sin(angle) * speed; // negative: screen y grows downward
    const ax = vx / k;
    const ay = (vy - vt) / k;
    const fx = rand(-BURST.jitter, BURST.jitter);
    const y0 = rand(-BURST.seam, BURST.seam);
    const life = rand(BURST.span[0], BURST.span[1]) * total;
    const edge = rand(BURST.edge[0], BURST.edge[1]);
    const round = i % 2 === 0; // an exact half of each, never clumped

    // Envelope, closed form. y is a valley: its minimum is the apex, where v_y = 0, i.e.
    // t* = ln(1 − v_y/v_t)/k; its maximum is at one of the two ends. |ax| is the horizontal
    // asymptote and so bounds x(t) for every t. Nothing here is a guess or a safety factor.
    const apex = Math.min(Math.max(Math.log(1 - vy / vt) / k, 0), life);
    const yUp = y0 + vt * apex + ay * (1 - Math.exp(-k * apex));
    const yDown = Math.max(y0, y0 + vt * life + ay * (1 - Math.exp(-k * life)));
    const half = edge * 0.6 + 1; // half-diagonal of the piece, plus antialiasing

    envelope.rise = Math.max(envelope.rise, half - yUp);
    envelope.fall = Math.max(envelope.fall, half + yDown);
    envelope.side = Math.max(envelope.side, half + Math.abs(ax));
    envelope.jitter = Math.max(envelope.jitter, Math.abs(fx));

    pieces.push({
      fx,
      y0,
      k,
      vt,
      ax,
      ay,
      w: round ? edge * 0.8 : edge,
      h: round ? edge * 0.8 : edge * 0.62,
      tilt: rand(0, 2 * Math.PI),
      spin: rand(BURST.spin[0], BURST.spin[1]),
      life,
      alpha: rand(BURST.alpha[0], BURST.alpha[1]),
      shade: Math.floor(Math.random() * SHADES.length),
      round,
    });
  }

  return { life: total, glow: false, pieces, envelope };
}

/** The smallest canvas this burst provably fits in, in host coordinates. */
export function burstBox(burst: Burst, hostW: number, hostH: number): Box {
  if (burst.glow) {
    const radius = 0.5 * Math.hypot(hostW, hostH);
    const reach = radius * BURST.glowScale;
    return {
      offset: { x: hostW * 0.5 - reach, y: hostH * 0.5 - reach },
      size: { width: 2 * reach, height: 2 * reach },
      origin: { x: reach, y: reach },
      glowRadius: radius,
    };
  }
  const reach = burst.envelope.side + burst.envelope.jitter * hostW;
  return {
    offset: { x: hostW * 0.5 - reach, y: -burst.envelope.rise },
    size: { width: 2 * reach, height: burst.envelope.rise + burst.envelope.fall },
    origin: { x: reach, y: burst.envelope.rise }, // the host's top edge
    glowRadius: 0,
  };
}

// MARK: - Colour

/** `wowBurstPalette`: five steps off one tint, in HSB, brighter steps giving up saturation. */
export function burstPalette(css: string): string[] {
  const match = css.match(/(\d+(?:\.\d+)?)/g);
  if (!match || match.length < 3) return SHADES.map(() => css);
  const [r, g, b] = match.slice(0, 3).map((n) => Number(n) / 255);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue /= 6;
    if (hue < 0) hue += 1;
  }
  const saturation = max === 0 ? 0 : delta / max;

  return SHADES.map((step) => {
    const s = Math.min(saturation * (step > 1 ? 2 - step : 1), 1);
    const v = Math.min(max * step, 1);
    return hsvToCss(hue, s, v);
  });
}

function hsvToCss(h: number, s: number, v: number): string {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const set = [
    [v, t, p],
    [q, v, p],
    [p, v, t],
    [p, q, v],
    [t, p, v],
    [v, p, q],
  ][i % 6];
  const to255 = (n: number) => Math.round(Math.min(Math.max(n, 0), 1) * 255);
  return `rgb(${to255(set[0])}, ${to255(set[1])}, ${to255(set[2])})`;
}

// MARK: - Drawing

/** One exp, one cosine and one fill per piece. No allocation, no shadow, no blur. */
export function drawPieces(
  ctx: CanvasRenderingContext2D,
  t: number,
  box: Box,
  hostW: number,
  pieces: Piece[],
  palette: string[],
) {
  for (const piece of pieces) {
    if (t >= piece.life) continue;
    const decay = 1 - Math.exp(-piece.k * t);
    const x = box.origin.x + piece.fx * hostW + piece.ax * decay;
    const y = box.origin.y + piece.y0 + piece.vt * t + piece.ay * decay;
    const age = t / piece.life;
    const fade = age < BURST.fadeFrom ? 1 : (1 - age) / (1 - BURST.fadeFrom);
    const turn = piece.spin * t;

    ctx.save();
    ctx.globalAlpha = piece.alpha * fade;
    ctx.translate(x, y);
    ctx.rotate(piece.tilt + turn * BURST.driftShare);
    ctx.scale(
      piece.w * Math.max(Math.abs(Math.cos(piece.tilt + turn)), BURST.tumbleFloor),
      piece.h,
    );
    ctx.fillStyle = palette[piece.shade];
    if (piece.round) {
      ctx.beginPath();
      ctx.arc(0, 0, 0.5, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      ctx.fillRect(-0.5, -0.5, 1, 1);
    }
    ctx.restore();
  }
}

/** Reduce Motion: nothing travels. One soft pulse out of the button, 0.4 s. */
export function drawGlow(
  ctx: CanvasRenderingContext2D,
  t: number,
  box: Box,
  tint: string,
) {
  const p = Math.min(t / BURST.glowSeconds, 1);
  const r = box.glowRadius * (1 + (BURST.glowScale - 1) * p);
  if (r <= 0) return;

  const ramp = ctx.createRadialGradient(
    box.origin.x,
    box.origin.y,
    0,
    box.origin.x,
    box.origin.y,
    r,
  );
  ramp.addColorStop(0, withAlpha(tint, 1));
  ramp.addColorStop(0.45, withAlpha(tint, 0.45));
  ramp.addColorStop(1, withAlpha(tint, 0));

  ctx.save();
  ctx.globalAlpha = BURST.glowOpacity * (1 - p);
  ctx.fillStyle = ramp;
  ctx.beginPath();
  ctx.arc(box.origin.x, box.origin.y, r, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}

function withAlpha(css: string, alpha: number): string {
  const match = css.match(/(\d+(?:\.\d+)?)/g);
  if (!match || match.length < 3) return css;
  const [r, g, b] = match.slice(0, 3);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
