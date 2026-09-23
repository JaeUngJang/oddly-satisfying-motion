// Build-time loader. The Swift files under ../units are the source of truth;
// nothing here is copied into web/, so the site cannot drift from what people copy.
// Server-only: imported by server components and generateStaticParams.

import fs from "node:fs";
import path from "node:path";
import type { Catalog, Core, Unit, UnitManifest, UnitTile } from "./types";

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

function read(file: string): string {
  return fs.readFileSync(file, "utf8");
}

type Index = { version: number; core: string; units: string[] };

function readIndex(): Index {
  return JSON.parse(read(path.join(UNITS_DIR, "index.json"))) as Index;
}

function readManifest(id: string): UnitManifest {
  return JSON.parse(read(path.join(UNITS_DIR, id, "unit.json"))) as UnitManifest;
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

  const units: Unit[] = index.units.map((id) => {
    const manifest = readManifest(id);
    return {
      ...manifest,
      source: read(path.join(UNITS_DIR, id, manifest.platforms.swiftui.file)),
      usage: usageFor(manifest, usageBlock),
      mediaSrc: `/media/${manifest.id}.mp4`,
    };
  });

  return { version: index.version, core: getCore(), units, usageBlock };
}

export function getUnitIds(): string[] {
  return readIndex().units;
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
