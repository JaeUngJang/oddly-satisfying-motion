"use client";

// StagePanel.tsx — the control column for the units declared in stage.ts.
//
// Same contract as ParamPanel: it renders what stage.ts declares and nothing else, and the usage
// line under it is generated from the values the stage is running. What it adds is the kinds
// ParamPanel has no control for (a String field, an Optional's nil switch, a short list of
// literals) and a separate "Stage" group for cues. A cue runs the stage (the action's outcome,
// a change the other way) and is not part of the call, so it never reaches the usage line.

import { CopyButton } from "../CopyButton";
import type { NumberParam } from "./params";
import {
  stageBool,
  stageNumber,
  stageOptional,
  stageText,
  stageUnit,
  stageUsage,
  type ChoiceParam,
  type OptionalParam,
  type StageValue,
  type StageValues,
  type TextParam,
} from "./stage";
import type { WowEvent } from "@/lib/track";

// Same cast ParamPanel makes: `lib/track.ts` owns the event union.
const COPY_USAGE = "copy_usage" as unknown as WowEvent;

type Props = {
  unitId: string;
  values: StageValues;
  onChange: (key: string, value: StageValue) => void;
  /** An `action` cue was pressed. */
  onCue: (key: string) => void;
};

export function StagePanel({ unitId, values, onChange, onCue }: Props) {
  const unit = stageUnit(unitId);
  if (!unit) return null;
  const usage = stageUsage(unitId, values);

  return (
    <div className="border-b border-line p-4 sm:border-b-0 sm:border-r">
      <p className="eyebrow text-muted">Parameters</p>

      <div className="mt-3 space-y-3">
        {unit.params.map((param) => {
          switch (param.kind) {
            case "number":
              return (
                <Slider
                  key={param.key}
                  param={param}
                  value={stageNumber(values, param.key, param.value)}
                  onChange={(next) => onChange(param.key, next)}
                />
              );
            case "bool":
              return (
                <Toggle
                  key={param.key}
                  name={param.key}
                  value={stageBool(values, param.key, param.value)}
                  onChange={(next) => onChange(param.key, next)}
                />
              );
            case "text":
              return (
                <TextField
                  key={param.key}
                  param={param}
                  value={stageText(values, param.key, param.value)}
                  onChange={(next) => onChange(param.key, next)}
                />
              );
            case "optional":
              return (
                <Optional
                  key={param.key}
                  param={param}
                  value={stageOptional(values, param.key)}
                  onChange={(next) => onChange(param.key, next)}
                />
              );
            case "choice":
              return (
                <Choice
                  key={param.key}
                  param={param}
                  value={stageText(values, param.key, param.value)}
                  onChange={(next) => onChange(param.key, next)}
                />
              );
          }
        })}
      </div>

      {unit.cues.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="eyebrow text-muted">Stage</p>
          <div className="mt-2 space-y-2">
            {unit.cues.map((cue) => (
              <div key={cue.key}>
                {cue.kind === "toggle" ? (
                  <Toggle
                    name={cue.key}
                    value={stageBool(values, cue.key, false)}
                    onChange={(next) => onChange(cue.key, next)}
                  />
                ) : (
                  <div className="mono flex items-center justify-between text-[11px]">
                    <span className="text-muted">{cue.key}</span>
                    <button
                      type="button"
                      onClick={() => onCue(cue.key)}
                      className="mono rounded-[6px] border border-line px-2 py-0.5 text-[11px] text-ink hover:border-ink"
                    >
                      {cue.label}
                    </button>
                  </div>
                )}
                <p className="mono mt-1 text-[11px] leading-snug text-muted">{cue.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-line pt-3">
        <code className="mono block text-[11px] leading-relaxed break-words text-ink">{usage}</code>
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
          {value.toFixed(param.decimals)}
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
        aria-label={name}
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

function TextField({
  param,
  value,
  onChange,
}: {
  param: TextParam;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mono text-[11px] text-muted">{param.key}</span>
      <input
        type="text"
        value={value}
        maxLength={param.maxLength}
        placeholder={param.empty}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        className="mono mt-1 block w-full rounded-[6px] border border-line bg-bg px-2 py-1 text-[11px] text-ink placeholder:text-faint focus:border-ink"
      />
    </label>
  );
}

/** `Double?`: the switch is nil ↔ a value; the slider sets the value while it is on. */
function Optional({
  param,
  value,
  onChange,
}: {
  param: OptionalParam;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const on = value !== null;
  return (
    <div>
      <div className="mono flex items-center justify-between text-[11px]">
        <span className="text-muted">{param.key}</span>
        <button
          type="button"
          aria-pressed={on}
          aria-label={`${param.key}, ${on ? "set" : "nil"}`}
          onClick={() => onChange(on ? null : param.on)}
          className={`mono rounded-[6px] px-2 py-0.5 text-[11px] ${
            on ? "bg-ink text-bg" : "border border-line text-muted hover:border-ink hover:text-ink"
          }`}
        >
          {on ? value.toFixed(param.decimals) : "nil"}
        </button>
      </div>
      {on && (
        <input
          type="range"
          aria-label={param.key}
          min={param.min}
          max={param.max}
          step={param.step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="mt-1.5 w-full accent-ink"
        />
      )}
    </div>
  );
}

function Choice({
  param,
  value,
  onChange,
}: {
  param: ChoiceParam;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mono flex items-center justify-between text-[11px]">
      <span className="text-muted">{param.key}</span>
      <span className="flex gap-1">
        {param.options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            aria-label={`${param.key} ${option}`}
            onClick={() => onChange(option)}
            className={`mono rounded-[6px] px-2 py-0.5 text-[11px] ${
              value === option
                ? "bg-ink text-bg"
                : "border border-line text-muted hover:border-ink hover:text-ink"
            }`}
          >
            {option}
          </button>
        ))}
      </span>
    </div>
  );
}
