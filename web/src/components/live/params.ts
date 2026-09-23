// params.ts — the sliders on the unit page, and the usage line they write.
//
// ONE RULE: a control exists here only if it is a real parameter of the Swift API. Every
// entry below was read off the unit's own source, so the panel on the page and the code
// the visitor copies can never disagree:
//
//   units/press/WowPress.swift
//     func wowPress(scale: CGFloat = 0.96, dim: Double = 0.06, haptic: Bool = true)
//   units/success-check/WowSuccessCheck.swift
//     WowSuccessCheck(trigger:, size: CGFloat = 28, lineWidth: CGFloat = 3,
//                     tint: Color = .accentColor, haptic: Bool = true)
//   units/reward-burst/WowRewardBurst.swift
//     func wowRewardBurst(trigger: Bool, count: Int = 24, tint: Color = .accentColor,
//                         duration: Double = 1.0, haptic: Bool = true)
//
// `tint` is a real parameter of two of them and is deliberately NOT a slider: the site's
// chrome is monochrome and the button's fill is the measured iOS 26 systemBlue, so a
// colour well here would be a control whose value the stage could not honestly show.
// Ranges follow the Swift where the Swift states one (`count` 12…40 and `duration`
// 0.3…3.0 are clamped inside WowRewardBurst; the panel offers the useful middle of the
// duration range rather than its clamp).

export type NumberParam = {
  kind: "number";
  /** Swift argument label; also the key in `ParamValues`. */
  key: string;
  min: number;
  max: number;
  step: number;
  /** The Swift default. A value equal to this one is left out of the usage line. */
  value: number;
  decimals: number;
  /** Printed after the value in the panel, never in the Swift. */
  unit?: string;
};

export type BoolParam = { kind: "bool"; key: string; value: boolean };

export type Param = NumberParam | BoolParam;

export type ParamValues = Record<string, number | boolean>;

export const UNIT_PARAMS: Record<string, Param[]> = {
  press: [
    { kind: "number", key: "scale", min: 0.9, max: 1, step: 0.01, value: 0.96, decimals: 2 },
    { kind: "number", key: "dim", min: 0, max: 0.15, step: 0.01, value: 0.06, decimals: 2 },
    { kind: "bool", key: "haptic", value: true },
  ],
  "success-check": [
    { kind: "number", key: "size", min: 16, max: 48, step: 1, value: 28, decimals: 0 },
    { kind: "number", key: "lineWidth", min: 2, max: 5, step: 1, value: 3, decimals: 0 },
    { kind: "bool", key: "haptic", value: true },
  ],
  "reward-burst": [
    { kind: "number", key: "count", min: 12, max: 40, step: 1, value: 24, decimals: 0 },
    {
      kind: "number",
      key: "duration",
      min: 0.6,
      max: 1.4,
      step: 0.1,
      value: 1,
      decimals: 1,
      unit: "s",
    },
    { kind: "bool", key: "haptic", value: true },
  ],
};

/** The call the usage line is built around. `fixed` arguments have no default to fall back to. */
const CALL: Record<string, { head: string; fixed?: string }> = {
  press: { head: 'Button("Continue") { … }.wowPress' },
  "success-check": { head: "WowSuccessCheck", fixed: "trigger: done" },
  "reward-burst": {
    head: 'Button("Claim") { … }.wowRewardBurst',
    fixed: "trigger: claimed",
  },
};

export function paramsFor(unitId: string): Param[] {
  return UNIT_PARAMS[unitId] ?? [];
}

export function defaultValues(unitId: string): ParamValues {
  const values: ParamValues = {};
  for (const param of paramsFor(unitId)) values[param.key] = param.value;
  return values;
}

export function numberValue(values: ParamValues, key: string, fallback: number): number {
  const value = values[key];
  return typeof value === "number" ? value : fallback;
}

export function boolValue(values: ParamValues, key: string, fallback: boolean): boolean {
  const value = values[key];
  return typeof value === "boolean" ? value : fallback;
}

export function formatNumber(param: NumberParam, value: number): string {
  return value.toFixed(param.decimals);
}

/**
 * The Swift call these values produce.
 *
 * Arguments still sitting on their Swift default are left out, because leaving them out is
 * what the Swift signature is for: at defaults the line is the plain call, which is the
 * line the visitor should actually paste.
 */
export function usageLine(unitId: string, values: ParamValues): string {
  const call = CALL[unitId];
  if (!call) return "";

  const args: string[] = [];
  if (call.fixed) args.push(call.fixed);

  for (const param of paramsFor(unitId)) {
    if (param.kind === "number") {
      const value = numberValue(values, param.key, param.value);
      if (Math.abs(value - param.value) < param.step / 2) continue;
      args.push(`${param.key}: ${formatNumber(param, value)}`);
    } else {
      const value = boolValue(values, param.key, param.value);
      if (value === param.value) continue;
      args.push(`${param.key}: ${value}`);
    }
  }

  return args.length === 0 ? `${call.head}()` : `${call.head}(${args.join(", ")})`;
}
