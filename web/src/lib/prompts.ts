// The prompt documents served at /llms.txt and /units/<id>/prompt.md.
//
// Pure: no value imports, no fs. The catalog arrives as an argument, so
// scripts/gen-ai.mjs can import this module straight from Node (type
// stripping, Node >= 22.6) and there is exactly one copy of each template.

import type { Catalog, Core, Unit } from "./types";

const TAG_AXES = ["surface", "trigger", "intent"] as const;

export function buildLibraryPrompt(catalog: Catalog): string {
  return [
    "# Oddly Satisfying Motion, for AI coding agents",
    "You are adding Oddly Satisfying Motion to a SwiftUI iOS app (minimum iOS 16). Rules:",
    "- Copy files verbatim. Do not modify them, do not add a package.",
    `- ${catalog.core.fileName} is required once per app target. Units depend only on it.`,
    "- Style is injected via parameters; never hard-code colors in the unit files.",
    "- Respect Reduce Motion and keep haptics optional (already handled inside the files).",
    "Available units (id, one line, entry point):",
    ...catalog.units.map(
      (unit) =>
        `- ${unit.id} - ${unit.summary} - ${unit.platforms.swiftui.entry}`,
    ),
    "Fetch a unit's full prompt at /units/<id>/prompt.md and the raw Swift at /files/<FileName>.swift, relative to the site you copied this from (the host is not known at build time).",
    "Full description of the library, in prose: /ai (HTML page), /ai.md (Markdown), /ai.txt (plain text), /ai.json (machine-readable).",
    "",
  ].join("\n");
}

export function buildUnitPrompt(unit: Unit, core: Core): string {
  const platform = unit.platforms.swiftui;
  const tags = TAG_AXES.map(
    (axis) => `${axis}=${unit.tags[axis].join("+")}`,
  ).join(", ");
  // unit.json `states`, when the unit declares them: the phases the file already
  // implements, listed so an agent does not re-implement or strip one.
  const states = unit.states?.length
    ? [
        "## States",
        ...unit.states.map(
          (row) => `- ${row.state} · motion: ${row.motion} · haptic: ${row.haptic}`,
        ),
        "",
      ]
    : [];

  return [
    `# Wow Unit: ${unit.name} (${unit.id})`,
    unit.summary,
    `Tags: ${tags}  · SwiftUI · minimum iOS ${platform.minIOS}`,
    `Budgets: touch→haptic ≤ ${unit.spec.hapticBudgetMs} ms · touch→first frame ≤ ${unit.spec.visualBudgetMs} ms · haptic ≤ ${unit.spec.hapticMaxDurationMs} ms`,
    `Raw files (same bytes as sections A and B below): /files/${core.fileName} · /files/${platform.file}`,
    "",
    "## Steps",
    `1. If \`${core.fileName}\` is not in the app target yet, create it with the content in section A. Never edit it.`,
    `2. Create \`${platform.file}\` with the content in section B. Never edit it.`,
    `3. Use it: ${unit.usage.split("\n").join("\n   ")}`,
    "4. Do not add a Swift package, do not change the deployment target below iOS 16, do not hard-code colors; pass `tint:`/style parameters instead.",
    "",
    ...states,
    `## A. ${core.fileName}`,
    "```swift",
    core.source.trimEnd(),
    "```",
    `## B. ${platform.file}`,
    "```swift",
    unit.source.trimEnd(),
    "```",
    "",
  ].join("\n");
}
