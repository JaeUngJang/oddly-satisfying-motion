"use client";

// LivePress.tsx — units/press/WowPress.swift, in the browser.
//
// The whole unit is the press mechanic, and the press mechanic lives in `IOSButton`
// because all three ports are pressed the same way (the demo's column B is `.wowPress()`
// first, then whatever the unit adds). This file is only the wiring: press → haptic
// marker → visual marker, in that order, because the Swift plays the haptic BEFORE it
// touches the view.
//
// This is the one port that exposes press as a parameter, so `scale` and `dim` come from
// the panel and go straight into `IOSButton`.

import { memo, useCallback } from "react";
import { IOSButton, type PressPhase } from "./IOSButton";
import { boolValue, numberValue, type ParamValues } from "./params";
import type { LiveRow } from "./useLiveTimeline";

export type LivePortProps = {
  reduced: boolean;
  /** 1, or 4 under `slow ×4`. */
  timeScale: number;
  /** Touch-down (idle → pressing): starts the lane, t = 0. */
  onPress: () => void;
  /** Every `WowPressPhase` the button enters, for the page's readout and the lane. */
  onPhaseChange: (phase: PressPhase) => void;
  /** Lights a marker in `src/data/lanes.json`. */
  emit: (row: LiveRow, id: string) => void;
  /** Bumped by Reset; ports drop whatever is in flight. */
  resetKey: number;
  /** The unit's own Swift parameters, as the panel currently has them. */
  params: ParamValues;
};

export const LivePress = memo(function LivePress({
  reduced,
  timeScale,
  onPress,
  onPhaseChange,
  emit,
  params,
}: LivePortProps) {
  const scale = numberValue(params, "scale", 0.96);
  const dim = numberValue(params, "dim", 0.06);
  const haptic = boolValue(params, "haptic", true);

  const press = useCallback(() => {
    onPress();
    // `haptic: false` means the Taptic Engine is never asked, so there is nothing to draw
    // on the haptic row either.
    if (haptic) emit("haptic", "press-tap"); // WowHaptics.play(.tap) — before any visual work
    emit("visual", "press-visual"); // WowProbe.onVisual?("press", …)
  }, [emit, haptic, onPress]);

  return (
    <IOSButton
      label="Subscribe"
      ariaLabel="Subscribe, press to run the press unit"
      reduced={reduced}
      timeScale={timeScale}
      pressScale={scale}
      pressDim={dim}
      onPressStart={press}
      onPhaseChange={onPhaseChange}
    />
  );
});
