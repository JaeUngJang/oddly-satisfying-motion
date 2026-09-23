# Contributing a unit

A unit is one folder under `units/`. Copy an existing one (`units/press/` is the smallest) and change three things.

```
units/<id>/
  Wow<Name>.swift   the unit. One file, depends only on units/_core/WowCore.swift
  unit.json         id, name, summary, tags, spec budgets, builtWith, sources
  (preview clips are recorded by the maintainer with demo/record.sh)
```

## The contract (tests enforce it)

1. One self-contained Swift file. Imports limited to SwiftUI, UIKit, CoreHaptics, QuartzCore, Foundation. No other unit, no helper file, no package.
2. Nothing required from the app: no `@EnvironmentObject`, no singleton to configure, no AppDelegate edits, no bundled assets.
3. Style is injected (`tint:` and friends). No hard-coded colors.
4. Minimum iOS 16. Newer APIs go behind `if #available` with a fallback.
5. Haptics through `WowHaptics.shared.play(_:)` only, fired before visual work, patterns at most 150 ms. Every unit works with haptics off.
6. Reduce Motion is honored inside the file with a meaning-preserving fallback (cross-fade, glow), never by simply removing the motion.
7. Responds to a user action only. Nothing auto-plays, loops, or seeks attention.
8. `static let spec = WowSpec(...)` matches `unit.json` `spec`: haptic within 50 ms of touch, first frame within 85 ms.

## Before opening the pull request

```
xcodebuild test -scheme WowUnits -destination 'platform=iOS Simulator,name=iPhone 17' \
  -derivedDataPath "$HOME/Library/Developer/Xcode/DerivedData/WowUnits"
sh portability/run.sh
```

Both must pass: the contract tests, and the four host apps building from a plain file copy with zero warnings. Add the unit id to `units/index.json`.

## Requesting a unit instead

Open an issue with the `unit request` template: what you press, what should happen, which kind of app. Units are added in the open, roughly weekly, from what people ask for.

## License

By contributing you agree that your contribution is licensed under the MIT license in `LICENSE`.
