// WowLoadingMorph.swift — Wow Unit "loading-morph". Requires WowCore.swift in the same target.
//
// The button owns the wait. Its label morphs into the system spinner and then into the result, in
// place, as Apple's HIG asks of a button whose action doesn't finish at once ("Checkout" →
// "Checking out…"). The label leaves through a short blur, a bridge that makes the two states
// read as one object changing rather than two objects swapping.
//   idle → loading : label out, opacity 1 → 0 and blur 0 → 4 pt, 0.12 s easeOut; spinner in,
//                    0.12 s easeOut from +0.04 s. No haptic: the user just pressed and knows.
//   → success      : outgoing content out, 0.10 s easeOut; checkmark scales 0.6 → 1.0 on
//                    spring(response 0.28 / damping 0.72) while fading in over 0.12 s.
//                    .success at +0.18 s, derived from the spring: it first reaches full size at
//                    0.15 s and crests (+1.5 %) at 0.20 s, so the pulse lands as the glyph settles.
//                    A phase change before then cancels it.
//   → failure      : .error at +0 s, before any visual work: failure never waits. Then as success,
//                    with an xmark.
//   → idle         : 0.16 s cross-fade, no haptic. idle → success / failure directly runs as above.
//   timing         : first frame within 85 ms of the phase change. Nothing loops except the system
//                    spinner, which exists only while loading.
//   frame          : fixed from the first frame at the widest and tallest state. All four states are
//                    laid out at all times, the inactive ones invisible, so the button never resizes
//                    and rows never reflow.
//   spinner        : ProgressView pinned to .small (14 pt); inside a .large button it would otherwise
//                    take the 37 pt spinner and grow the button. Its slot is held by a .hidden() copy,
//                    which SwiftUI lays out without creating the UIKit spinner.
//   reduce motion  : cross-fades only (no blur, no scale), same timings, haptics at the same moments
//   haptics off    : WowSettings.hapticsDisabled = true, or haptic: false
//   voiceover      : the label names the action and never changes; loadingLabel is the value while
//                    loading. No hard-coded strings: announce the outcome from the control you own.
//   not for        : a wait a system sheet already shows (Apple Pay). Two indicators confuse (HIG).
//
// Usage
//   @State private var phase: WowLoadPhase = .idle
//   Button {
//       guard phase != .loading else { return }
//       phase = .loading
//       Task { phase = await checkout() ? .success : .failure }
//   } label: {
//       WowLoadingMorph(phase: phase, label: "Checkout", loadingLabel: "Checking out…")
//   }
//   .buttonStyle(.borderedProminent)

import SwiftUI

/// What the button is doing. The app owns it; the unit animates every change.
enum WowLoadPhase: Equatable {
    case idle, loading, success, failure
}

/// A button label that shows its own activity. Goes inside a Button's label and keeps one frame
/// for every phase.
struct WowLoadingMorph: View {
    static let spec = WowSpec(id: "loading-morph", minIOS: 16,
                              hapticBudgetMs: 50, visualBudgetMs: 85, hapticMaxDurationMs: 120)

    /// Drive it from your action. Each change animates; the value the unit appears with shows as-is.
    var phase: WowLoadPhase
    /// Idle text, e.g. "Checkout".
    var label: String
    /// Text beside the spinner, e.g. "Checking out…". nil shows the spinner alone.
    var loadingLabel: String? = nil
    /// Colour of text, spinner and glyphs. Injected, never assumed; white suits a prominent button.
    var tint: Color = .white
    /// Plays .success / .error as the result lands. Never on entering loading.
    var haptic: Bool = true
    /// Called when the unit starts showing a new phase, once its animations (and a failure's haptic)
    /// have started. Not called for the phase the unit appears with.
    var onPhaseChange: ((WowLoadPhase) -> Void)? = nil

    // Choreography, in seconds. The success haptic is derived from the spring, not guessed at.
    private static let labelOut: TimeInterval = 0.12        // idle → loading, with the blur
    private static let blurRadius: CGFloat = 4
    private static let spinnerIn: TimeInterval = 0.12
    private static let spinnerDelay: TimeInterval = 0.04
    private static let resultOut: TimeInterval = 0.10       // whatever was showing, before a result
    private static let glyphIn: TimeInterval = 0.12
    private static let glyphStartScale: CGFloat = 0.6
    private static let successHapticAt: TimeInterval = 0.18
    private static let crossFade: TimeInterval = 0.16       // back to idle
    /// Hidden layers are reset once every exit has finished: the longest exit plus a few frames.
    private static let parkAt: TimeInterval = crossFade + 0.05
    private static let spinnerSpacing: CGFloat = 8

    @State private var shown: WowLoadPhase = .idle
    @State private var labelVisible = true
    @State private var labelBlurred = false
    @State private var loadingVisible = false
    @State private var spinnerMounted = false
    @State private var checkmarkVisible = false
    @State private var checkmarkScaledIn = false
    @State private var xmarkVisible = false
    @State private var xmarkScaledIn = false
    /// Bumped on every phase change. Delayed work whose run no longer matches is dropped.
    @State private var run = 0

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            Text(verbatim: label)
                .blur(radius: labelBlurred && !reduceMotion ? Self.blurRadius : 0)
                .opacity(labelVisible ? 1 : 0)
            loadingContent
                .opacity(loadingVisible ? 1 : 0)
            glyph("checkmark", visible: checkmarkVisible, scaledIn: checkmarkScaledIn)
            glyph("xmark", visible: xmarkVisible, scaledIn: xmarkScaledIn)
        }
        .foregroundStyle(tint)
        .tint(tint)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(verbatim: label))
        .accessibilityValue(Text(verbatim: phase == .loading ? (loadingLabel ?? "") : ""))
        .wowOnChange(of: phase) { morph(to: $0) }
        .onAppear {
            if haptic { WowHaptics.shared.prepare() }
            // Mounted mid-flow (a recycled row, a restored screen): show the phase as settled, with
            // no motion and no haptic. This is not the event, only its result.
            if phase != shown { settle(phase) }
        }
    }

    // MARK: - Layers

    private var loadingContent: some View {
        HStack(spacing: Self.spinnerSpacing) {
            ZStack {
                ProgressView().hidden()                     // holds the slot, never spins
                if spinnerMounted { ProgressView() }
            }
            .controlSize(.small)
            if let loadingLabel { Text(verbatim: loadingLabel) }
        }
    }

    private func glyph(_ name: String, visible: Bool, scaledIn: Bool) -> some View {
        Image(systemName: name)
            .fontWeight(.semibold)
            .scaleEffect(scaledIn || reduceMotion ? 1 : Self.glyphStartScale)
            .opacity(visible ? 1 : 0)
    }

    // MARK: - Morph

    private func morph(to next: WowLoadPhase) {
        let token = nextRun()                                       // drops a success pulse still pending
        shown = next
        if next == .failure && haptic { WowHaptics.shared.play(.error) }   // before any visual work
        WowProbe.onVisual?("loading-morph", WowProbe.now())

        switch next {
        case .loading:
            instantly { spinnerMounted = true }                     // its layer is still at opacity 0
            withAnimation(.easeOut(duration: Self.labelOut)) {
                if labelVisible {
                    labelVisible = false
                    labelBlurred = true
                }
                // A retry: the result leaves on the same curve, without the blur.
                checkmarkVisible = false
                xmarkVisible = false
            }
            withAnimation(.easeOut(duration: Self.spinnerIn).delay(Self.spinnerDelay)) {
                loadingVisible = true
            }
        case .success, .failure:
            let success = next == .success
            withAnimation(.easeOut(duration: Self.resultOut)) {
                labelVisible = false
                loadingVisible = false
                if success { xmarkVisible = false } else { checkmarkVisible = false }
            }
            withAnimation(.spring(response: 0.28, dampingFraction: 0.72)) {
                if success { checkmarkScaledIn = true } else { xmarkScaledIn = true }
            }
            withAnimation(.easeOut(duration: Self.glyphIn)) {
                if success { checkmarkVisible = true } else { xmarkVisible = true }
            }
            if success { scheduleSuccessHaptic(token) }
        case .idle:
            withAnimation(.easeOut(duration: Self.crossFade)) {
                loadingVisible = false
                checkmarkVisible = false
                xmarkVisible = false
                labelVisible = true
                labelBlurred = false                                // already false unless cut short
            }
        }
        schedulePark(token, warmHaptics: next == .loading)
        onPhaseChange?(next)
    }

    /// Shows `target` as already settled: no motion, no haptic, nothing pending.
    private func settle(_ target: WowLoadPhase) {
        _ = nextRun()
        shown = target
        instantly {
            labelVisible = target == .idle
            labelBlurred = false
            loadingVisible = target == .loading
            spinnerMounted = target == .loading
            checkmarkVisible = target == .success
            checkmarkScaledIn = target == .success
            xmarkVisible = target == .failure
            xmarkScaledIn = target == .failure
        }
    }

    // MARK: - Delayed work

    /// Invalidates whatever was scheduled before and returns the token for the new run.
    private func nextRun() -> Int {
        run &+= 1
        return run
    }

    private func scheduleSuccessHaptic(_ token: Int) {
        guard haptic else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + Self.successHapticAt) {
            // `self` carries the @State box by reference, so this reads the live counter:
            // a phase change before the glyph landed has already moved it on.
            guard token == self.run else { return }
            WowHaptics.shared.play(.success)
        }
    }

    /// Once every exit has finished, puts the hidden layers back at their start values so the next
    /// entrance runs from them: label unblurred, glyphs at 0.6, spinner unmounted. Resetting at the
    /// next entrance instead would coalesce with it and animate nothing. Only the latest change
    /// cleans up, at a time when every earlier exit is over, so nothing visible is ever snapped.
    private func schedulePark(_ token: Int, warmHaptics: Bool) {
        DispatchQueue.main.asyncAfter(deadline: .now() + Self.parkAt) {
            guard token == self.run else { return }
            self.instantly {
                if !self.labelVisible { self.labelBlurred = false }
                if !self.loadingVisible { self.spinnerMounted = false }
                if !self.checkmarkVisible { self.checkmarkScaledIn = false }
                if !self.xmarkVisible { self.xmarkScaledIn = false }
            }
            // Only the spinner runs now: warm the engine so the result's haptic skips start-up.
            if warmHaptics && self.haptic { WowHaptics.shared.prepare() }
        }
    }

    private func instantly(_ changes: () -> Void) {
        var transaction = Transaction()
        transaction.disablesAnimations = true
        withTransaction(transaction, changes)
    }
}
