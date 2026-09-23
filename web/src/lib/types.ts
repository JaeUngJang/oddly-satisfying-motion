// Shapes of units/index.json and units/<id>/unit.json.
// Kept in their own module so client components can import the types
// without pulling the fs loader into the browser bundle.

export type UnitSpec = {
  hapticBudgetMs: number;
  visualBudgetMs: number;
  hapticMaxDurationMs: number;
};

export type UnitTags = {
  surface: string[];
  trigger: string[];
  intent: string[];
};

export type UnitPlatform = {
  file: string;
  minIOS: number;
  entry: string;
};

/**
 * One row of unit.json `states` (CONTRIBUTING.md rule 9): which motion and which haptic
 * belong to a phase. Pressable units list `WowPressPhase`; sequence units list their own.
 */
export type UnitState = {
  state: string;
  motion: string;
  haptic: string;
};

export type UnitManifest = {
  id: string;
  name: string;
  layer: string;
  summary: string;
  tags: UnitTags;
  core: string;
  platforms: { swiftui: UnitPlatform } & Record<string, UnitPlatform>;
  spec: UnitSpec;
  accessibility: { reduceMotion: string; hapticsOptional: boolean };
  sound: string | null;
  builtWith: string[];
  sources: string[];
  /** Optional until every unit declares it; the site omits what a unit does not list. */
  states?: UnitState[];
};

/** A manifest plus everything the site needs to render it. */
export type Unit = UnitManifest & {
  /** Contents of units/<id>/<file>.swift, read at build time. */
  source: string;
  /** Lines of the README usage block that mention this unit's entry points. */
  usage: string;
  /** Path the preview recording is expected at, e.g. /media/press.mp4 */
  mediaSrc: string;
};

export type Core = {
  /** Relative path from units/, e.g. _core/WowCore.swift */
  path: string;
  /** Just the file name, e.g. WowCore.swift */
  fileName: string;
  source: string;
};

export type Catalog = {
  version: number;
  core: Core;
  units: Unit[];
  /** The whole swift block from README.md. */
  usageBlock: string;
};

export type TimelineMark = {
  id: string;
  label: string;
  /** Point marker, ms. */
  t?: number;
  /** Span, ms. */
  from?: number;
  to?: number;
  /** Drawn as a ring: an event placed when it happened, not at a budget (a cancel). */
  hollow?: boolean;
  /**
   * `release`: the times count from the release (the Button's action), not touch-down.
   * The live lane draws the mark from wherever the release actually happened.
   */
  anchor?: "release";
};

export type TimelineRow = {
  id: "visual" | "haptic";
  label: string;
  marks: TimelineMark[];
  /** Shown when the row is deliberately empty. */
  emptyCaption?: string;
};

export type TimelineLane = {
  label: string;
  rows: TimelineRow[];
};

/** Per-unit measurement lanes (src/data/lanes.json). */
export type UnitLanes = {
  axisMs: number;
  tickMs: number;
  units: Record<string, TimelineLane>;
};

/** Portability run results (src/data/portability.json). */
export type Portability = {
  caption: string;
  columns: string[];
  rows: { host: string; target: string; result: string; warnings: string }[];
};

/** What a catalog tile needs. Keeps Swift sources out of the client bundle. */
export type UnitTile = {
  id: string;
  name: string;
  summary: string;
  tags: UnitTags;
  builtWith: string[];
  hapticBudgetMs: number;
  minIOS: number;
  mediaSrc: string;
};
