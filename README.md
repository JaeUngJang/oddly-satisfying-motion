# Oddly Satisfying Motion (prototype)

Animated SwiftUI button components with haptics and timing, delivered as **files you copy**, not a package you depend on.

Oddly Satisfying Motion is free. There is no paid tier and none is planned. Units are added in the open; requests and contributions go through GitHub: <https://github.com/JaeUngJang/oddly-satisfying-motion>.

License: MIT

## Use in your app (no package, no config)

1. Copy `units/_core/WowCore.swift` into your target once.
2. Copy the unit file you want (e.g. `units/press/WowPress.swift`).
3. Use it:

```swift
Button("Subscribe") { … }.wowPress()                        // plain label
Button("Subscribe") { … }.wowPress(over: MyButtonStyle())   // on top of your own ButtonStyle
WowSuccessCheck(trigger: done)
Button("Claim") { … }.wowRewardBurst(trigger: claimed)
```

`wowPress(over:)` renders your `ButtonStyle` and layers press on it. System styles (`.bordered`, `.borderedProminent`) are `PrimitiveButtonStyle`s and cannot be composed by SwiftUI; the Primary CTA recipe covers that look.

Minimum iOS 16. Works on simulator and on devices without Core Haptics (falls back, never crashes).
Reduce Motion is honored inside each unit. Haptics can be turned off app-wide with `WowSettings.hapticsDisabled = true`.

## Layout

```
units/            source of truth = what users copy
  _core/WowCore.swift
  <unit>/Wow<Unit>.swift + unit.json
  index.json
Package.swift     dev container only (build + tests on iOS Simulator)
Tests/            contract tests: spec ↔ unit.json sync, self-containment scan, index integrity
demo/             XcodeGen demo app + DEBUG latency/frame probe (produces the spec sheet numbers)
portability/      4 host apps (iOS16 UIKit-mixed / iOS17 SwiftUI / own design system / Swift 6 strict) + run.sh
```

## Portability contract (what every unit promises)

Principle: units sit on the system's own components and add only a response layer (motion, haptic, timing). Texture, accessibility and Liquid Glass stay Apple's; the response is ours. Nothing here replaces a system control.

1. One self-contained file; depends only on `WowCore.swift`.
2. Requires nothing from the app: no environment objects, no singletons to configure, no AppDelegate edits, no bundled assets.
3. Style is injected (`tint`, sizes); defaults are system values.
4. iOS 16 minimum; newer APIs are availability-guarded with fallbacks.
5. Haptics: Core Haptics → UIFeedbackGenerator → nothing. Optional per call and app-wide.
6. Reduce Motion: meaning preserved with replaced motion, never just removed.
7. Never blocks input; nothing loops; nothing plays without a user action.

## Budgets (declared per unit, checked by tests)

Touch → haptic ≤ 50 ms, touch → first frame ≤ 85 ms (Kaaresoja, Brewster & Lantz, ACM TAP 11(2), 2014).
Haptic patterns ≤ 150 ms (long vibration tests worse than none: Hampton & Hildebrand, JCR 52(5), 2026).
Frame budget on 120 Hz: 8 ms; the demo probe records it.

## Build

```
xcodebuild -scheme WowUnits -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$HOME/Library/Developer/Xcode/DerivedData/WowUnits" build
xcodebuild test -scheme WowUnits -destination 'platform=iOS Simulator,name=iPhone 16' \
  -derivedDataPath "$HOME/Library/Developer/Xcode/DerivedData/WowUnits"
sh demo/run.sh          # demo on iPhone 16 simulator
sh portability/run.sh   # 4 host apps, copy-only, must end with 0 warnings in Sources/Wow/
```

DerivedData stays outside the repo on purpose (the repo path is iCloud-synced; in-repo build products break codesign).

## Design rules for the site

The site follows Taste Skill (MIT) in "redesign - preserve" mode with dials VARIANCE 5 / MOTION 3 / DENSITY 3, plus two house rules that override it: no accent color in the chrome (the product is the only color) and no motion on the chrome (the units are the motion). Install the skills locally (they are gitignored):

```
npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend --skill redesign-existing-projects --skill minimalist-ui -a claude-code -y --copy
```

