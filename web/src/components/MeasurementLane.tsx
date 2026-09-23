import type { TimelineLane, TimelineMark } from "@/lib/types";

// Instrument geometry, in viewBox units.
const VB_W = 360;
const VB_H = 104;
const PLOT_X0 = 46;
const PLOT_X1 = 352;
const ROW_Y = { visual: 28, haptic: 72 } as const;
const LABEL_LANES = { visual: [19, 10], haptic: [63, 54] } as const;
const AXIS_Y = 88;
const CHAR_W = 4.2; // 7px monospace, approx advance width

/**
 * Marker ink per row. The visual row and the playhead take the accent (the product's blue,
 * the thing you watch); the haptic row stays ink, because what it marks is felt, not seen.
 */
const MARK = {
  visual: { stroke: "text-accent", fill: "fill-accent" },
  haptic: { stroke: "text-ink", fill: "fill-ink" },
} as const;

type Props = {
  lane: TimelineLane;
  axisMs: number;
  tickMs: number;
  /** Current video position in real milliseconds, or null when not playing. */
  playheadMs: number | null;
};

function isSpan(mark: TimelineMark): mark is TimelineMark & { from: number; to: number } {
  return typeof mark.from === "number" && typeof mark.to === "number";
}

/** Greedy two-line label stacking so close markers stay readable. */
function assignLabelLanes(marks: TimelineMark[], x: (ms: number) => number) {
  const placed: { mark: TimelineMark; lane: number; x: number }[] = [];
  const lastEnd = [-Infinity, -Infinity];

  for (const mark of [...marks].sort((a, b) => start(a) - start(b))) {
    const left = x(start(mark));
    const right = left + mark.label.length * CHAR_W;
    const lane = left >= lastEnd[0] + 4 ? 0 : 1;
    lastEnd[lane] = right;
    placed.push({ mark, lane, x: left });
  }
  return placed;
}

function start(mark: TimelineMark): number {
  return isSpan(mark) ? mark.from : (mark.t ?? 0);
}

export function MeasurementLane({ lane, axisMs, tickMs, playheadMs }: Props) {
  const x = (ms: number) =>
    PLOT_X0 + (Math.max(0, Math.min(ms, axisMs)) / axisMs) * (PLOT_X1 - PLOT_X0);

  const ticks: number[] = [];
  for (let ms = 0; ms <= axisMs; ms += tickMs) ticks.push(ms);

  const headX = playheadMs === null ? null : x(playheadMs);

  return (
    <figure className="mt-3">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full font-mono"
        role="img"
        aria-label={`${lane.label} timing lane, 0 to ${axisMs} milliseconds`}
      >
        {/* rows */}
        {lane.rows.map((row) => {
          const y = ROW_Y[row.id];
          const lanes = LABEL_LANES[row.id];
          const placed = assignLabelLanes(row.marks, x);
          const tone = MARK[row.id];

          return (
            <g key={row.id}>
              <text
                x={0}
                y={y}
                dominantBaseline="middle"
                fontSize={7}
                letterSpacing={0.3}
                className="fill-muted"
              >
                {row.label}
              </text>

              <line
                x1={PLOT_X0}
                y1={y}
                x2={PLOT_X1}
                y2={y}
                stroke="currentColor"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                className="text-line"
              />

              {row.marks.length === 0 && row.emptyCaption && (
                <text
                  x={PLOT_X0 + 4}
                  y={y - 5}
                  fontSize={7}
                  className="fill-muted"
                >
                  {row.emptyCaption}
                </text>
              )}

              {row.marks.map((mark) => {
                const clipped = isSpan(mark) && mark.to > axisMs;
                if (isSpan(mark)) {
                  const x0 = x(mark.from);
                  const x1 = x(mark.to);
                  return (
                    <g key={mark.id}>
                      <rect
                        x={x0}
                        y={y - 3}
                        width={Math.max(1, x1 - x0)}
                        height={6}
                        rx={1}
                        className={tone.fill}
                        opacity={0.18}
                      />
                      <line
                        x1={x0}
                        y1={y - 6}
                        x2={x0}
                        y2={y + 6}
                        stroke="currentColor"
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                        className={tone.stroke}
                      />
                      {clipped ? (
                        // span runs past the axis; mark the overflow instead of lying
                        <polygon
                          points={`${x1 - 4},${y - 4} ${x1},${y} ${x1 - 4},${y + 4}`}
                          className={tone.fill}
                        />
                      ) : (
                        <line
                          x1={x1}
                          y1={y - 6}
                          x2={x1}
                          y2={y + 6}
                          stroke="currentColor"
                          strokeWidth={1}
                          vectorEffect="non-scaling-stroke"
                          className={tone.stroke}
                        />
                      )}
                    </g>
                  );
                }
                const px = x(mark.t ?? 0);
                return (
                  <g key={mark.id}>
                    <line
                      x1={px}
                      y1={y - 7}
                      x2={px}
                      y2={y + 7}
                      stroke="currentColor"
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                      className={tone.stroke}
                    />
                    <circle cx={px} cy={y} r={2.2} className={tone.fill} />
                  </g>
                );
              })}

              {placed.map(({ mark, lane: labelLane, x: px }) => (
                <text
                  key={`${mark.id}-label`}
                  x={Math.min(px, PLOT_X1 - mark.label.length * CHAR_W)}
                  y={lanes[labelLane]}
                  fontSize={7}
                  className="fill-muted"
                >
                  {mark.label}
                  <tspan className="fill-muted">
                    {isSpan(mark)
                      ? `  ${mark.from}-${mark.to}`
                      : `  ${mark.t}`}
                  </tspan>
                </text>
              ))}
            </g>
          );
        })}

        {/* axis */}
        <line
          x1={PLOT_X0}
          y1={AXIS_Y}
          x2={PLOT_X1}
          y2={AXIS_Y}
          stroke="currentColor"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          className="text-line"
        />
        {ticks.map((ms) => (
          <g key={ms}>
            <line
              x1={x(ms)}
              y1={AXIS_Y}
              x2={x(ms)}
              y2={AXIS_Y + 4}
              stroke="currentColor"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              className="text-line"
            />
            <text
              x={x(ms)}
              y={AXIS_Y + 13}
              fontSize={7}
              textAnchor={ms === 0 ? "start" : ms === axisMs ? "end" : "middle"}
              className="fill-muted"
            >
              {ms}
            </text>
          </g>
        ))}
        <text x={0} y={AXIS_Y + 13} fontSize={7} className="fill-muted">
          ms
        </text>

        {/* playhead */}
        {headX !== null && (
          <g>
            <line
              x1={headX}
              y1={4}
              x2={headX}
              y2={AXIS_Y}
              stroke="currentColor"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              className="text-accent"
            />
            <text
              x={PLOT_X1}
              y={6}
              fontSize={7}
              textAnchor="end"
              className="fill-muted"
            >
              {`t ${Math.round(playheadMs ?? 0)} ms`}
            </text>
          </g>
        )}
      </svg>
    </figure>
  );
}
