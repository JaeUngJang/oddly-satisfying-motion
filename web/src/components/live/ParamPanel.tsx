"use client";

// ParamPanel.tsx — the Swift parameters, as controls.
//
// The panel renders whatever `params.ts` declares for the unit and nothing else, so the
// only way to add a control here is to add a parameter to the Swift. The usage line under
// it is generated from the same values the stage is running, which is the whole point: the
// thing you just pressed and the line you copy are the same call.

import { CopyButton } from "../CopyButton";
import {
  boolValue,
  formatNumber,
  numberValue,
  paramsFor,
  usageLine,
  type NumberParam,
  type ParamValues,
} from "./params";
import type { WowEvent } from "@/lib/track";

// `lib/track.ts` owns the event union and is not this change's to edit; one cast here
// rather than a second copy of the tracker (same shape as `live_press`).
const COPY_USAGE = "copy_usage" as unknown as WowEvent;

type Props = {
  unitId: string;
  values: ParamValues;
  onChange: (key: string, value: number | boolean) => void;
};

export function ParamPanel({ unitId, values, onChange }: Props) {
  const params = paramsFor(unitId);
  const usage = usageLine(unitId, values);

  if (params.length === 0) return null;

  return (
    <div className="border-b border-line p-4 sm:border-b-0 sm:border-r">
      <p className="eyebrow text-muted">Parameters</p>

      <div className="mt-3 space-y-3">
        {params.map((param) =>
          param.kind === "number" ? (
            <Slider
              key={param.key}
              param={param}
              value={numberValue(values, param.key, param.value)}
              onChange={(next) => onChange(param.key, next)}
            />
          ) : (
            <Toggle
              key={param.key}
              name={param.key}
              value={boolValue(values, param.key, param.value)}
              onChange={(next) => onChange(param.key, next)}
            />
          ),
        )}
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <code className="mono block text-[11px] leading-relaxed break-words text-ink">
          {usage}
        </code>
        <div className="mt-2">
          <CopyButton
            text={usage}
            label="Copy usage"
            event={COPY_USAGE}
            eventProps={{ unit: unitId }}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}

function Slider({
  param,
  value,
  onChange,
}: {
  param: NumberParam;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mono flex items-baseline justify-between text-[11px]">
        <span className="text-muted">{param.key}</span>
        <span className="text-ink">
          {formatNumber(param, value)}
          {param.unit ? ` ${param.unit}` : ""}
        </span>
      </span>
      <input
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 w-full accent-ink"
      />
    </label>
  );
}

function Toggle({
  name,
  value,
  onChange,
}: {
  name: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="mono flex items-center justify-between text-[11px]">
      <span className="text-muted">{name}</span>
      <button
        type="button"
        aria-pressed={value}
        onClick={() => onChange(!value)}
        className={`mono rounded-[6px] px-2 py-0.5 text-[11px] ${
          value
            ? "bg-ink text-bg"
            : "border border-line text-muted hover:border-ink hover:text-ink"
        }`}
      >
        {String(value)}
      </button>
    </div>
  );
}
