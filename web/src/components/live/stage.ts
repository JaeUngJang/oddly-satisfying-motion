// stage.ts — the control column and the lane budgets for the units whose Swift signatures
// carry more than numbers and switches.
//
// params.ts holds sliders and toggles (`ParamValues` is number | boolean), which was all press,
// success-check and reward-burst take. The next five take Strings (`label`, `loadingLabel`,
// `prefix`, `suffix`) and Optionals (`hapticThreshold: Double?`, `tint: Color?`), and two of
// them are driven by something that is not a parameter at all: what the action reported
// (loading-morph's failure) and a change in the other direction (label-roll's decrement).
// Same rule as params.ts: every PARAMETER below was read off the unit's own initializer, and
// only parameters reach the usage line. The stage cues are declared apart and never do.
//
//   units/loading-morph/WowLoadingMorph.swift
//     WowLoadingMorph(phase:, label: String, loadingLabel: String? = nil, tint: Color = .white,
//                     haptic: Bool = true, onPhaseChange: = nil)
//   units/hold-fill/WowHoldFill.swift
//     func wowHoldFill(duration: Double = 2.0, tint: Color = .accentColor,
//                      cornerRadius: CGFloat = 26, haptic: Bool = true, onPhaseChange: = nil,
//                      onConfirm:)
//   units/icon-swap/WowIconSwap.swift
//     WowIconSwap(trigger:, from: = "doc.on.doc", to: = "checkmark", size: CGFloat = 17,
//                 weight: = .semibold, tint: = .primary, revertAfter: Double = 1.5,
//                 haptic: Bool = true, label: = "Copy", swappedLabel: = "Copied", onPhaseChange:)
//   units/label-roll/WowLabelRoll.swift
//     WowLabelRoll(value:, format: = "%.0f", prefix: String = "", suffix: String = "",
//                  font: = .body, tint: = .primary, hapticThreshold: Double? = nil,
//                  haptic: Bool = true)
//   units/failure-shake/WowFailureShake.swift
//     func wowFailureShake(trigger:, amplitude: CGFloat = 8, duration: Double = 0.40,
//                          tint: Color? = nil, haptic: Bool = true, onPhaseChange: = nil)
//
// Not offered, as in params.ts: a Color where it is a colour well the stage could not honestly
// show, SF Symbol names the web cannot draw (`from`, `to`), `weight`, `font`, `format`, and the
// VoiceOver strings. Where the stage's own look pins one of those away from its default (white
// glyphs on a filled button), the usage line prints it as a fixed argument, so the line you copy
// draws what the stage draws. failure-shake's `tint: Color?` IS offered, as nil ↔ .red: both are
// values the stage can show.
//
// Swift passes arguments in declaration order, so the usage line is built from an ordered list
// in which fixed arguments sit where the signature puts them.

import type { RefObject } from "react";
import type { LivePortProps } from "./LivePress";
import type { BoolParam, NumberParam, ParamValues } from "./params";
import type { TimelineLane, TimelineMark } from "@/lib/types";

/** A Swift `String`. Empty prints nothing unless the argument has no default (`required`). */
export type TextParam = {
  kind: "text";
  key: string;
  value: string;
  maxLength: number;
  /** No Swift default: the argument is always in the call. */
  required?: boolean;
  /** Shown in the empty field: what leaving it empty means in Swift. */
  empty: string;
};

/** A Swift `Double?`: a switch between nil and a value, and the value's slider. */
export type OptionalParam = {
  kind: "optional";
  key: string;
  min: number;
  max: number;
  step: number;
  decimals: number;
  /** Where the slider starts when the switch turns the value on. */
  on: number;
};

/** A Swift value the stage offers as a short list of literals, e.g. `tint: Color?` nil / .red. */
export type ChoiceParam = { kind: "choice"; key: string; value: string; options: string[] };

export type StageParam = NumberParam | BoolParam | TextParam | OptionalParam | ChoiceParam;

/**
 * Stage cues run the stage and are not part of the call: a switch the port reads (`toggle`,
 * stored in the values under its key) or a one-off the port performs (`action`).
 */
export type StageCue =
  | { kind: "toggle"; key: string; note: string }
  | { kind: "action"; key: string; label: string; note: string };

export type StageValue = number | boolean | string | null;
export type StageValues = Record<string, StageValue>;

/** How a port takes a panel `action` cue. */
export type StageCueHandler = { cue: (key: string) => void };

/**
 * The props every port receives. The first three ports take `LivePortProps` alone and ignore
 * the rest; that is why a map of them still type-checks against this.
 */
export type StagePortProps = LivePortProps & {
  /** Every value the panel holds: the Strings and Optionals `params` cannot carry, and the cues. */
  values: StageValues;
  /** The unit's own state (unit.json `states`), the moment it enters it. */
  onStateChange: (state: string) => void;
  /** Where the panel's action cues are delivered. */
  cues: RefObject<StageCueHandler | null>;
};

/** A parameter key, or an argument the stage fixes, e.g. `trigger: copied`. */
type Arg = string | { fixed: string };

type StageUnit = {
  params: StageParam[];
  cues: StageCue[];
  call: { head: string; args: Arg[]; tail?: (values: StageValues) => string };
  /**
   * `state`: the readout shows the unit's own states. `phase`: the unit's states ARE
   * `WowPressPhase` (hold-fill), reported through `onPhaseChange` like the press unit's.
   */
  readout: "state" | "phase";
  /** What the empty lane asks for. */
  verb: "press" | "hold";
  /** Parameter-dependent budgets: the lane mark as the call with these values declares it. */
  budget?: (mark: TimelineMark, values: StageValues) => TimelineMark;
};

// MARK: - Values

export function stageNumber(values: StageValues, key: string, fallback: number): number {
  const value = values[key];
  return typeof value === "number" ? value : fallback;
}

export function stageBool(values: StageValues, key: string, fallback: boolean): boolean {
  const value = values[key];
  return typeof value === "boolean" ? value : fallback;
}

export function stageText(values: StageValues, key: string, fallback: string): string {
  const value = values[key];
  return typeof value === "string" ? value : fallback;
}

/** An Optional: the number, or null for nil. */
export function stageOptional(values: StageValues, key: string): number | null {
  const value = values[key];
  return typeof value === "number" ? value : null;
}

/** The number and switch values, for the ports and the panel that only know `ParamValues`. */
export function paramView(values: StageValues): ParamValues {
  const view: ParamValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "number" || typeof value === "boolean") view[key] = value;
  }
  return view;
}

// MARK: - Lane budgets

/** Moves a span so it starts at `from`, keeping the length lanes.json declares for it. */
function startAt(mark: TimelineMark, from: number): TimelineMark {
  const length = (mark.to ?? 0) - (mark.from ?? 0);
  return { ...mark, from, to: from + length };
}

/** `duration` clamped the way WowFailureShake clamps it, in ms. */
function shakeMs(values: StageValues): number {
  return Math.round(Math.min(Math.max(stageNumber(values, "duration", 0.4), 0.2), 1) * 1000);
}

// MARK: - Units

export const STAGE_UNITS: Record<string, StageUnit> = {
  "loading-morph": {
    params: [
      {
        kind: "text",
        key: "label",
        value: "Checkout",
        maxLength: 18,
        required: true,
        empty: "required",
      },
      { kind: "text", key: "loadingLabel", value: "", maxLength: 18, empty: "nil" },
      { kind: "bool", key: "haptic", value: true },
    ],
    cues: [{ kind: "toggle", key: "fail", note: "what the action reports: .failure" }],
    call: {
      head: "WowLoadingMorph",
      args: [{ fixed: "phase: phase" }, "label", "loadingLabel", "haptic"],
    },
    readout: "state",
    verb: "press",
  },
  "hold-fill": {
    params: [
      {
        kind: "number",
        key: "duration",
        min: 1,
        max: 3,
        step: 0.1,
        value: 2,
        decimals: 1,
        unit: "s",
      },
      { kind: "number", key: "cornerRadius", min: 0, max: 26, step: 1, value: 26, decimals: 0 },
      { kind: "bool", key: "haptic", value: true },
    ],
    cues: [],
    // The stage's label is a filled red capsule, so the fill is white (the demo's recipe):
    // the default accent fill would not show on it.
    call: {
      head: 'Text("Delete").wowHoldFill',
      args: ["duration", { fixed: "tint: .white" }, "cornerRadius", "haptic"],
      tail: () => " { … }",
    },
    readout: "phase",
    verb: "hold",
    // The sweep is linear over exactly `duration`: the long press is the clock.
    budget: (mark, values) =>
      mark.id === "hold-sweep"
        ? { ...mark, to: Math.round(stageNumber(values, "duration", 2) * 1000) }
        : mark,
  },
  "icon-swap": {
    params: [
      { kind: "number", key: "size", min: 12, max: 28, step: 1, value: 17, decimals: 0 },
      {
        kind: "number",
        key: "revertAfter",
        min: 0,
        max: 3,
        step: 0.1,
        value: 1.5,
        decimals: 1,
        unit: "s",
      },
      { kind: "bool", key: "haptic", value: true },
    ],
    cues: [],
    // With auto-revert the caller re-arms on `.reverted`, or the next tap finds the trigger
    // already true and nothing runs (the Swift's own usage); with revertAfter 0 it never
    // reverts on its own, so there is nothing to re-arm on.
    call: {
      head: "WowIconSwap",
      args: [{ fixed: "trigger: copied" }, "size", { fixed: "tint: .white" }, "revertAfter", "haptic"],
      tail: (values) =>
        stageNumber(values, "revertAfter", 1.5) > 0
          ? " { if $0 == .reverted { copied = false } }"
          : "",
    },
    readout: "state",
    verb: "press",
    // The revert starts `revertAfter` after the swap; at 0 it is the release that sets the
    // trigger back to false, so it starts at the release.
    budget: (mark, values) =>
      mark.id === "swap-revert"
        ? startAt(mark, Math.round(stageNumber(values, "revertAfter", 1.5) * 1000))
        : mark,
  },
  "label-roll": {
    params: [
      { kind: "text", key: "prefix", value: "", maxLength: 6, empty: '""' },
      { kind: "text", key: "suffix", value: "", maxLength: 10, empty: '""' },
      {
        kind: "optional",
        key: "hapticThreshold",
        min: 1194,
        max: 1214,
        step: 1,
        decimals: 0,
        on: 1206,
      },
      { kind: "bool", key: "haptic", value: true },
    ],
    cues: [{ kind: "action", key: "decrement", label: "−1", note: "value − 1: rolls down" }],
    call: {
      head: "WowLabelRoll",
      args: [
        { fixed: "value: likes" },
        "prefix",
        "suffix",
        { fixed: "tint: .white" },
        "hapticThreshold",
        "haptic",
      ],
    },
    readout: "state",
    verb: "press",
  },
  "failure-shake": {
    params: [
      { kind: "number", key: "amplitude", min: 4, max: 12, step: 1, value: 8, decimals: 0 },
      {
        kind: "number",
        key: "duration",
        min: 0.25,
        max: 0.6,
        step: 0.05,
        value: 0.4,
        decimals: 2,
        unit: "s",
      },
      { kind: "choice", key: "tint", value: "nil", options: ["nil", ".red"] },
      { kind: "bool", key: "haptic", value: true },
    ],
    cues: [],
    call: {
      head: 'Button("Pay $12.00") { … }.wowFailureShake',
      args: [{ fixed: "trigger: rejected" }, "amplitude", "duration", "tint", "haptic"],
    },
    readout: "state",
    verb: "press",
    // The shake runs `duration` (clamped 0.2…1.0); the tint eases back once it has landed.
    budget: (mark, values) => {
      if (mark.id === "shake-motion") return { ...mark, to: shakeMs(values) };
      if (mark.id === "shake-tint") return startAt(mark, shakeMs(values));
      return mark;
    },
  },
};

export function stageUnit(unitId: string): StageUnit | undefined {
  return STAGE_UNITS[unitId];
}

export function stageDefaults(unitId: string): StageValues {
  const values: StageValues = {};
  const unit = STAGE_UNITS[unitId];
  if (!unit) return values;
  for (const param of unit.params) {
    values[param.key] = param.kind === "optional" ? null : param.value;
  }
  for (const cue of unit.cues) if (cue.kind === "toggle") values[cue.key] = false;
  return values;
}

// MARK: - Usage line

/** A Swift string literal. */
function swiftString(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** One argument as the call needs it, or null when it sits on its Swift default. */
function argument(param: StageParam, values: StageValues): string | null {
  switch (param.kind) {
    case "number": {
      const value = stageNumber(values, param.key, param.value);
      if (Math.abs(value - param.value) < param.step / 2) return null;
      return `${param.key}: ${value.toFixed(param.decimals)}`;
    }
    case "bool": {
      const value = stageBool(values, param.key, param.value);
      return value === param.value ? null : `${param.key}: ${value}`;
    }
    case "text": {
      const value = stageText(values, param.key, param.value);
      if (value === "" && !param.required) return null;
      return `${param.key}: ${swiftString(value)}`;
    }
    case "optional": {
      const value = stageOptional(values, param.key);
      return value === null ? null : `${param.key}: ${value.toFixed(param.decimals)}`;
    }
    case "choice": {
      const value = stageText(values, param.key, param.value);
      return value === param.value ? null : `${param.key}: ${value}`;
    }
  }
}

/**
 * The Swift call these values produce. Arguments on their Swift default are left out, which
 * is what the defaults are for; a required argument and the stage's fixed ones always print.
 */
export function stageUsage(unitId: string, values: StageValues): string {
  const unit = STAGE_UNITS[unitId];
  if (!unit) return "";
  const args: string[] = [];
  for (const arg of unit.call.args) {
    if (typeof arg !== "string") {
      args.push(arg.fixed);
      continue;
    }
    const param = unit.params.find((item) => item.key === arg);
    const printed = param ? argument(param, values) : null;
    if (printed) args.push(printed);
  }
  const tail = unit.call.tail?.(values) ?? "";
  if (args.length === 0) return tail ? `${unit.call.head}${tail}` : `${unit.call.head}()`;
  return `${unit.call.head}(${args.join(", ")})${tail}`;
}

// MARK: - Lane

/** The lane with each mark's budget as the call with these values declares it. */
export function stageLane(unitId: string, lane: TimelineLane, values: StageValues): TimelineLane {
  const budget = STAGE_UNITS[unitId]?.budget;
  if (!budget) return lane;
  return {
    ...lane,
    rows: lane.rows.map((row) => ({ ...row, marks: row.marks.map((mark) => budget(mark, values)) })),
  };
}

/**
 * The axis a run starts on: the page's, or longer when a mark counted from touch-down ends
 * past it (a 2 s hold), in whole ticks. Marks counted from the release grow the axis when the
 * release happens, as before.
 */
export function laneAxis(lane: TimelineLane, axisMs: number, tickMs: number): number {
  const end = Math.max(
    0,
    ...lane.rows.flatMap((row) =>
      row.marks.filter((mark) => mark.anchor !== "release").map((mark) => mark.to ?? mark.t ?? 0),
    ),
  );
  return Math.max(axisMs, Math.ceil(end / tickMs) * tickMs);
}
