// WowIconSwap.swift — Wow Unit "icon-swap". Requires WowCore.swift in the same target.
//
// Copy → Copied. The glyph swaps to a checkmark, the .success haptic lands as the checkmark
// appears, and a moment later the glyph swaps back on its own, silently.
//   motion  : iOS 17+  one Image(systemName:) with .contentTransition(.symbolEffect(.replace.downUp)),
//                      driven by spring(response 0.3 / damping 0.8). Down-up is the Replace
//                      direction Apple gives for a change of state. Magic Replace (iOS 18,
//                      .replace.magic(fallback:)) morphs related symbols such as bell → bell.slash
//                      and falls back to a plain Replace otherwise; a document and a checkmark are
//                      unrelated, so the unit names down-up directly.
//             iOS 16   the same spring cross-fades two glyphs: incoming scales 0.6 → 1,
//                      outgoing 1 → 0.6
//   haptic  : .success at +0.10 s, when the new glyph is on screen rather than when the swap
//             starts. Dropped if the swap is reverted before it lands.
//   revert  : after `revertAfter` (1.5 s; 0 = never) the same transition runs back with no
//             haptic: a timer did it, not the user. trigger → false reverts at once, also silent.
//   timing  : first frame within 85 ms of the trigger; nothing loops
//   layout  : the glyph sits in a fixed size × size box, so the button around it never reflows
//   reduce motion : no scale, no replace effect; 0.15 s cross-fade; haptic unchanged, at +0.10 s
//   haptics off   : WowSettings.hapticsDisabled = true, or haptic: false
//   voiceover     : the label names the action ("Copy") and never changes; the state ("Copied")
//                   is the accessibility value while swapped, so VoiceOver speaks it on the
//                   element just activated. Both strings are parameters, localized by the app.
//   re-arm        : the swap runs on a false → true edge. With auto-revert, set trigger back to
//                   false on .reverted, or the next tap finds it already true and nothing runs.
//
// Usage
//   @State private var copied = false
//   Button { UIPasteboard.general.string = code; copied = true } label: {
//       WowIconSwap(trigger: copied) { if $0 == .reverted { copied = false } }
//   }
//   WowIconSwap(trigger: saved, from: "heart", to: "heart.fill", tint: .pink,
//               revertAfter: 0, label: "Save", swappedLabel: "Saved")

import SwiftUI

/// Where the swap is. Every change is reported through `onPhaseChange`.
///   idle      `from` at rest; nothing has run yet
///   swapped   `to` is showing; the .success haptic belongs to entering this phase
///   reverted  back on `from`, by the timer or by trigger → false; no haptic
enum WowIconSwapPhase: Equatable {
    case idle, swapped, reverted
}

/// Swaps one SF Symbol for another when `trigger` becomes true, and back after `revertAfter`.
struct WowIconSwap: View {
    static let spec = WowSpec(id: "icon-swap", minIOS: 16,
                              hapticBudgetMs: 50, visualBudgetMs: 85, hapticMaxDurationMs: 120)

    /// false → true swaps `from` for `to`. true → false swaps back at once.
    var trigger: Bool
    /// SF Symbol shown at rest.
    var from: String = "doc.on.doc"
    /// SF Symbol shown once swapped.
    var to: String = "checkmark"
    /// Symbol point size, and the side of the fixed square both glyphs sit in.
    var size: CGFloat = 17
    var weight: Font.Weight = .semibold
    /// Colour of both glyphs. Injected, never assumed.
    var tint: Color = .primary
    /// Seconds before swapping back on its own. 0 = never; swap back by setting trigger to false.
    var revertAfter: Double = 1.5
    /// Plays the .success haptic as the `to` glyph appears.
    var haptic: Bool = true
    /// VoiceOver label: the action. The same in every phase.
    var label: LocalizedStringKey = "Copy"
    /// VoiceOver value while swapped: the state the action produced.
    var swappedLabel: LocalizedStringKey = "Copied"
    /// Called on the main thread on every phase change.
    var onPhaseChange: ((WowIconSwapPhase) -> Void)? = nil

    // Choreography. The haptic waits for the glyph it confirms.
    private static let response: Double = 0.30              // spring, both directions
    private static let damping: Double = 0.80
    private static let hapticAt: TimeInterval = 0.10        // the `to` glyph is on screen by now
    private static let shrunk: CGFloat = 0.6                // iOS 16: in 0.6 → 1, out 1 → 0.6
    private static let reducedFade: TimeInterval = 0.15

    @State private var phase: WowIconSwapPhase = .idle
    /// Bumped on every swap and revert. A pending haptic or timer whose run no longer matches is dropped.
    @State private var run = 0

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        glyphs
            .frame(width: size, height: size)
            .contentShape(Rectangle())
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(Text(label))
            .accessibilityValue(phase == .swapped ? Text(swappedLabel) : Text(verbatim: ""))
            .wowOnChange(of: trigger) { on in
                if on { start() } else { revert() }
            }
            .onAppear {
                if haptic { WowHaptics.shared.prepare() }
                // Mounted with the trigger already up (a recycled row, a restored screen): show the
                // result with no motion and no haptic, and still revert on schedule, so a caller
                // that re-arms on .reverted is never left stuck.
                if trigger && phase == .idle { showSwapped() }
            }
    }

    // MARK: - Glyphs

    @ViewBuilder private var glyphs: some View {
        if reduceMotion {
            crossFade(scaled: false)
        } else if #available(iOS 17, *) {
            glyph(phase == .swapped ? to : from)
                .contentTransition(.symbolEffect(.replace.downUp))
        } else {
            crossFade(scaled: true)
        }
    }

    /// Both glyphs stay mounted, so a swap reversed mid-flight retargets from where it is.
    private func crossFade(scaled: Bool) -> some View {
        let swapped = phase == .swapped
        return ZStack {
            glyph(from)
                .opacity(swapped ? 0 : 1)
                .scaleEffect(scaled && swapped ? Self.shrunk : 1)
            glyph(to)
                .opacity(swapped ? 1 : 0)
                .scaleEffect(scaled && !swapped ? Self.shrunk : 1)
        }
    }

    private func glyph(_ name: String) -> some View {
        Image(systemName: name)
            .font(.system(size: size, weight: weight))
            .foregroundStyle(tint)
    }

    private var swapAnimation: Animation {
        reduceMotion ? .easeOut(duration: Self.reducedFade)
                     : .spring(response: Self.response, dampingFraction: Self.damping)
    }

    // MARK: - Run

    private func start() {
        WowProbe.onVisual?("icon-swap", WowProbe.now())
        let token = nextRun()
        withAnimation(swapAnimation) { phase = .swapped }
        scheduleHaptic(token)
        scheduleRevert(token)
        onPhaseChange?(.swapped)
    }

    /// The timer and trigger → false both land here. Never plays a haptic.
    private func revert() {
        _ = nextRun()                                           // drops a pending haptic and timer
        guard phase == .swapped else { return }                 // already back: nothing to show
        withAnimation(swapAnimation) { phase = .reverted }
        onPhaseChange?(.reverted)
    }

    private func showSwapped() {
        let token = nextRun()
        phase = .swapped
        scheduleRevert(token)
        onPhaseChange?(.swapped)
    }

    // MARK: - Scheduling

    /// Invalidates whatever was scheduled before and returns the token for the new run.
    private func nextRun() -> Int {
        run &+= 1
        return run
    }

    private func scheduleHaptic(_ token: Int) {
        guard haptic else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + Self.hapticAt) {
            // `self` carries the @State box by reference, so this reads the live counter:
            // a revert or a new swap before the glyph landed has already moved it on.
            guard token == self.run else { return }
            WowHaptics.shared.play(.success)
        }
    }

    private func scheduleRevert(_ token: Int) {
        guard revertAfter > 0 else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + revertAfter) {
            guard token == self.run else { return }
            self.revert()
        }
    }
}
