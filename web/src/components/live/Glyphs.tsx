// Glyphs.tsx — the three SF Symbols the new ports draw, as inline SVG.
//
// The web has no SF Symbols, so these are traced from the iOS recordings in web/public/media,
// not drawn by eye: each viewBox is the glyph's box in recording pixels, where the 52 pt
// capsule measures 75.5 px (0.689 pt per px), and the strokes run down the centre of the
// traced strokes. At a 17 pt font (the units' body size and icon-swap's default `size`),
// semibold:
//   checkmark    22 × 21 px → 15.2 × 14.5 pt   (icon-swap-full.mp4, loading-morph-full.mp4)
//   xmark        19 × 20 px → 13.1 × 13.8 pt   (loading-morph-fail-full.mp4)
//   doc.on.doc   26 × 31 px → 17.9 × 21.4 pt   (icon-swap-full.mp4)
// A symbol scales with its font size, so every glyph takes the point size and scales from 17.
// They draw in `currentColor`: the host sets the tint, as `.foregroundStyle` does.

const PT_PER_PX = 52 / 75.5;
const BASE = 17;

type GlyphProps = { size: number };

function box(size: number, w: number, h: number) {
  const k = (size / BASE) * PT_PER_PX;
  return { width: w * k, height: h * k, viewBox: `0 0 ${w} ${h}` };
}

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** `checkmark`, semibold. */
export function Checkmark({ size }: GlyphProps) {
  return (
    <svg {...box(size, 24, 23)} aria-hidden focusable="false" style={{ display: "block" }}>
      <path d="M2.6 12.6 L9.3 19.6 L21.2 2.4" strokeWidth={2.9} {...STROKE} />
    </svg>
  );
}

/** `xmark`, semibold. */
export function Xmark({ size }: GlyphProps) {
  return (
    <svg {...box(size, 21, 22)} aria-hidden focusable="false" style={{ display: "block" }}>
      <path d="M2.4 2.4 L18.6 19.6 M18.6 2.4 L2.4 19.6" strokeWidth={2.9} {...STROKE} />
    </svg>
  );
}

/** `doc.on.doc`, semibold: a page with a folded corner, on a second one behind it. */
export function DocOnDoc({ size }: GlyphProps) {
  return (
    <svg {...box(size, 28, 33)} aria-hidden focusable="false" style={{ display: "block" }}>
      {/* The page behind: top and right edges, its fold, the corner under the front page. */}
      <path
        d="M9 9.4 V4.6 Q9 2.1 11.5 2.1 H17.8 L25.9 10.2 V22.6 Q25.9 25.1 23.4 25.1 H19.6"
        strokeWidth={2.5}
        {...STROKE}
      />
      <path d="M17.6 2.8 V8.3 Q17.6 10.4 19.7 10.4 H25.2" strokeWidth={2.5} {...STROKE} />
      {/* The page in front, with its own fold. */}
      <path
        d="M11.4 9.6 H5 Q2.5 9.6 2.5 12.1 V28.6 Q2.5 31.1 5 31.1 H17.1 Q19.6 31.1 19.6 28.6 V17.8 Z"
        strokeWidth={2.5}
        {...STROKE}
      />
      <path d="M10.6 10.3 V15.8 Q10.6 17.9 12.7 17.9 H18.9" strokeWidth={2.5} {...STROKE} />
    </svg>
  );
}
