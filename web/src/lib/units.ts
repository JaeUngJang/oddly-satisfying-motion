// Build-time loader. The Swift files under ../units are the source of truth;
// nothing here is copied into web/, so the site cannot drift from what people copy.
// Server-only: imported by server components and generateStaticParams.

import fs from "node:fs";
import path from "node:path";
import type { Catalog, Core, Unit, UnitManifest, UnitState, UnitTile } from "./types";

/** Works whether the build runs in web/ or in the prototype root. */
function resolveRepoRoot(): string {
  const candidates = [path.join(process.cwd(), ".."), process.cwd()];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "units", "index.json"))) return dir;
  }
  throw new Error(
    `units/index.json not found from ${process.cwd()}; run the build inside web/`,
  );
}

const REPO_ROOT = resolveRepoRoot();
const UNITS_DIR = path.join(REPO_ROOT, "units");
const README = path.join(REPO_ROOT, "README.md");
const MEDIA_DIR = path.join(REPO_ROOT, "web", "public", "media");

function read(file: string): string {
  return fs.readFileSync(file, "utf8");
}

type Index = { version: number; core: string; units: string[] };

function readIndex(): Index {
  return JSON.parse(read(path.join(UNITS_DIR, "index.json"))) as Index;
}

/** Warnings already printed: every page reads the catalog, so each prints once (per worker). */
const warned = new Set<string>();

function warnOnce(key: string, message: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
}

function skip(id: string, why: string): null {
  warnOnce(id, `units: skipping "${id}" (listed in units/index.json): ${why}`);
  return null;
}

/**
 * unit.json `states` in the shape Tests/ContractTests decodes: [{ state, motion, haptic }].
 * Any other shape is dropped with a warning, so the page omits the table instead of a
 * renderer failing on it; the contract test is what rejects the unit.
 */
function checkStates(id: string, raw: unknown): UnitState[] | undefined {
  if (raw === undefined) return undefined;
  const ok =
    Array.isArray(raw) &&
    raw.every(
      (row) =>
        typeof row?.state === "string" &&
        typeof row?.motion === "string" &&
        typeof row?.haptic === "string",
    );
  if (ok) return raw as UnitState[];
  warnOnce(
    `${id}:states`,
    `units: "${id}" unit.json \`states\` is not [{ state, motion, haptic }]; left out until it is`,
  );
  return undefined;
}

/**
 * A unit listed in index.json whose folder is not complete yet is skipped with a warning
 * instead of failing the build: the index is updated first and the files land after it,
 * so a unit that has no unit.json or no Swift file yet is simply not on the site yet.
 * A unit.json that exists but does not parse still fails: that is a broken unit.
 */
function loadUnit(id: string, usageBlock: string): Unit | null {
  const manifestFile = path.join(UNITS_DIR, id, "unit.json");
  if (!fs.existsSync(manifestFile)) return skip(id, "no unit.json yet");
  const manifest = JSON.parse(read(manifestFile)) as UnitManifest;

  const swiftFile = path.join(UNITS_DIR, id, manifest.platforms.swiftui.file);
  if (!fs.existsSync(swiftFile)) {
    return skip(id, `no ${manifest.platforms.swiftui.file} yet`);
  }

  return {
    ...manifest,
    states: checkStates(id, manifest.states),
    source: read(swiftFile),
    usage: usageFor(manifest, usageBlock),
    mediaSrc: `/media/${manifest.id}.mp4`,
  };
}

/** The first ```swift fence in README.md — the canonical usage lines. */
function readUsageBlock(): string {
  const match = read(README).match(/```swift\n([\s\S]*?)```/);
  return match ? match[1].trimEnd() : "";
}

/**
 * Entry is written as "WowPressStyle / .wowPress()". Reduce each symbol to its
 * identifier so a usage line can be matched to the unit that owns it.
 */
function entrySymbols(entry: string): string[] {
  return entry
    .split("/")
    .map((s) => s.trim().replace(/^\./, "").split("(")[0].trim())
    .filter(Boolean);
}

function usageFor(manifest: UnitManifest, usageBlock: string): string {
  const symbols = entrySymbols(manifest.platforms.swiftui.entry).map((s) =>
    s.toLowerCase(),
  );
  const lines = usageBlock
    .split("\n")
    .filter((line) => symbols.some((s) => line.toLowerCase().includes(s)));
  return lines.length > 0 ? lines.join("\n") : manifest.platforms.swiftui.entry;
}

export function getCore(): Core {
  const index = readIndex();
  return {
    path: index.core,
    fileName: path.basename(index.core),
    source: read(path.join(UNITS_DIR, index.core)),
  };
}

export function getCatalog(): Catalog {
  const index = readIndex();
  const usageBlock = readUsageBlock();

  const units = index.units
    .map((id) => loadUnit(id, usageBlock))
    .filter((unit): unit is Unit => unit !== null);

  return { version: index.version, core: getCore(), units, usageBlock };
}

/** Ids that have a page: the listed units that loaded, not every id in index.json. */
export function getUnitIds(): string[] {
  return getCatalog().units.map((unit) => unit.id);
}

/** Whether web/public/media/<file> exists, checked at build time. */
export function hasMedia(file: string): boolean {
  return fs.existsSync(path.join(MEDIA_DIR, file));
}

export function getUnit(id: string): Unit | undefined {
  return getCatalog().units.find((u) => u.id === id);
}

/** Tile projection: no Swift source, so the client filter stays small. */
export function getUnitTiles(): UnitTile[] {
  return getCatalog().units.map((unit) => ({
    id: unit.id,
    name: unit.name,
    summary: unit.summary,
    tags: unit.tags,
    builtWith: unit.builtWith,
    hapticBudgetMs: unit.spec.hapticBudgetMs,
    minIOS: unit.platforms.swiftui.minIOS,
    mediaSrc: unit.mediaSrc,
  }));
}
