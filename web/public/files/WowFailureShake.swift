// WowFailureShake.swift — Wow Unit "failure-shake". Requires WowCore.swift in the same target.
//
// Validation failed: the control shakes once, side to side, and the .error haptic lands on the first
// frame. This is a validation-failure signal, not an attention device. Drive it only from a real
// rejection (wrong password, invalid code, declined card), never to draw the eye to a control.
//   motion        : horizontal damped sine x = amplitude · sin(4πp) · (9/8 − p), p = ease-out of time.
//                   Swings +8, −6, +4, −2 pt at the default amplitude, lands at 0 with no velocity, 0.40 s
//   haptic        : .error at t = 0, before any visual work. A failure is reported at once, never
//                   deferred to the end of the motion
//   timing        : haptic within 50 ms, first frame within 85 ms of the trigger; runs once, never loops
//   tint          : optional. Foreground and tint take the colour for the length of the shake, then the
//                   host's own styling comes back untouched (see WowShakeTint)
//   restart       : false → true again mid-shake starts over from the first swing; the old run's end
//                   is dropped by a generation token
//   reduce motion : no translation. Opacity dips 1 → 0.6 → 1 over 0.2 s; same haptic, same tint
//   haptics off   : WowSettings.hapticsDisabled = true, or haptic: false
//   voiceover     : no hard-coded strings. Announce the error from the control you own.
//
// Usage
//   @State private var rejected = false
//   Button("Sign in") { rejected = !isValid(password) }
//       .wowFailureShake(trigger: rejected, tint: .red)
//   // Re-arm silently before the next attempt (e.g. when the input changes): rejected = false
//
// Why a timeline and not an animated value: a restarted shake must begin at its first swing. An
// animatableData driven 0 → 1 cannot do that. Resetting it to 0 and animating it to 1 in the same
// update collapses into no change at all, and an animation interrupted mid-flight continues from
// wherever the old one was. So the pose is a pure function of (now − start), sampled by a
// TimelineView that is paused whenever nothing is shaking. A restart is simply a new start time.

import SwiftUI

// MARK: - Phases

/// What the unit is doing, reported through `onPhaseChange`.
///
///   idle     armed and at rest: `trigger` is false and nothing is on screen
///   shaking  from the false → true edge until the motion lands; the haptic fires once, on entry.
///            Another false → true while shaking reports `shaking` again and starts over
///   settled  the motion landed with `trigger` still true: at rest, the failure still standing
///
/// A shake whose `trigger` went back to false while it was running lands in `idle`, not `settled`.
enum WowFailureShakePhase: Equatable {
    case idle, shaking, settled
}

// MARK: - Unit

/// Shakes the content once when `trigger` goes from false to true. Only for a real validation failure.
struct WowFailureShake: ViewModifier {
    static let spec = WowSpec(id: "failure-shake", minIOS: 16,
                              hapticBudgetMs: 50, visualBudgetMs: 85, hapticMaxDurationMs: 120)

    /// false → true shakes once. Set it back to false before the next failure; that edge is silent.
    var trigger: Bool
    /// First swing, in points. Each later swing is smaller: +8, −6, +4, −2 at the default.
    var amplitude: CGFloat = 8
    /// Length of the shake, in seconds. Clamped to 0.2…1.0: shorter reads as a glitch, longer as a nag.
    var duration: Double = 0.40
    /// Destructive colour for the length of the shake, applied as foreground style and tint.
    /// nil changes no colour. Colours set inside the content itself stay as they are.
    var tint: Color? = nil
    /// Plays the .error haptic on the first frame.
    var haptic: Bool = true
    /// Receives idle / shaking / settled. See WowFailureShakePhase.
    var onPhaseChange: ((WowFailureShakePhase) -> Void)? = nil

    private static let durationRange: ClosedRange<Double> = 0.2...1.0
    private static let dipLength: Double = 0.2          // Reduce Motion: opacity 1 → 0.6 → 1
    private static let tintReturn: Double = 0.15        // colour eases back once the motion has landed

    /// The shake on screen. Replaced whole on every false → true, so a restart never inherits a clock.
    @State private var run = WowShakeRun()

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        TimelineView(.animation(minimumInterval: nil, paused: run.start == nil)) { timeline in
            let pose = run.pose(at: timeline.date, amplitude: amplitude)
            content
                .offset(x: pose.x)
                .opacity(pose.opacity)
        }
        .modifier(WowShakeTint(tint: tint, on: run.start != nil))
        .wowOnChange(of: trigger) { on in
            if on {
                start()
            } else if run.start != nil {
                run.rearmed = true              // silent: the shake lands first, then reports idle
            } else {
                onPhaseChange?(.idle)
            }
        }
        .onAppear { if haptic { WowHaptics.shared.prepare() } }
    }

    // MARK: - Run

    private func start() {
        if haptic { WowHaptics.shared.play(.error) }             // 1 — haptic, before any view work
        WowProbe.onVisual?("failure-shake", WowProbe.now())      // 2 — probe

        let next = WowShakeRun(generation: run.generation &+ 1,
                               start: Date(),
                               length: reduceMotion ? Self.dipLength
                                                    : min(max(duration, Self.durationRange.lowerBound),
                                                          Self.durationRange.upperBound),
                               reduced: reduceMotion)
        // 3 — shake and tint from the next frame. Never animated in: if the caller flipped `trigger`
        // inside withAnimation, the failure must still show at once, not fade in.
        var instant = Transaction()
        instant.disablesAnimations = true
        withTransaction(instant) { run = next }
        onPhaseChange?(.shaking)

        let generation = next.generation
        DispatchQueue.main.asyncAfter(deadline: .now() + next.length) {
            // `self` carries the @State box by reference, so this reads the live run: a restart
            // before this one landed has already moved the generation on, and this end is dropped.
            guard generation == self.run.generation, self.run.start != nil else { return }
            let landed: WowFailureShakePhase = self.run.rearmed ? .idle : .settled
            withAnimation(.easeOut(duration: Self.tintReturn)) { self.run.start = nil }  // pauses the timeline
            self.onPhaseChange?(landed)
        }
    }
}

extension View {
    /// Shakes this view once when `trigger` goes from false to true, with the .error haptic on the
    /// first frame. Only for a real validation failure. Set `trigger` back to false before the next one.
    ///
    /// `amplitude` is the first swing in points; `duration` is clamped to 0.2…1.0 s. `tint` recolours
    /// the view's foreground and tint for the length of the shake; nil leaves every colour alone.
    func wowFailureShake(trigger: Bool, amplitude: CGFloat = 8, duration: Double = 0.40,
                         tint: Color? = nil, haptic: Bool = true,
                         onPhaseChange: ((WowFailureShakePhase) -> Void)? = nil) -> some View {
        modifier(WowFailureShake(trigger: trigger, amplitude: amplitude, duration: duration,
                                 tint: tint, haptic: haptic, onPhaseChange: onPhaseChange))
    }
}

// MARK: - Motion

/// One shake: when it started, how long it runs, and how it was asked to end.
private struct WowShakeRun {
    var generation = 0      // bumped per shake; a scheduled end only lands if it still matches
    var start: Date?        // nil at rest: the timeline is paused and the pose is exactly (0, 1)
    var length: Double = 0  // s
    var reduced = false     // Reduce Motion as it was when this shake began
    var rearmed = false     // trigger went back to false mid-shake: land in idle, not settled

    /// Offset and opacity at `date`. Outside the run the pose is exactly (0, 1), not a rounding residue
    /// (sin(4π) is −4.9e−16, not 0): at rest the content keeps an identity transform and full opacity.
    func pose(at date: Date, amplitude: CGFloat) -> (x: CGFloat, opacity: Double) {
        guard let start else { return (0, 1) }
        let t = date.timeIntervalSince(start) / length          // linear time, 0 … 1
        guard t > 0, t < 1 else { return (0, 1) }
        if reduced {
            return (0, 1 - 0.4 * sin(.pi * t))                  // 1 → 0.6 → 1, nothing moves
        }
        // Ease-out, then four half-swings whose peaks sit on a straight decay line. The envelope is
        // 9/8 − p, not 1 − p: the extra eighth puts the first peak at exactly `amplitude` (1 − p would
        // stop at 0.88 of it), and sin(4π) = 0 still brings it home at p = 1.
        let p = CGFloat(1 - (1 - t) * (1 - t))
        return (amplitude * sin(4 * .pi * p) * (1.125 - p), 1)
    }
}

// MARK: - Tint

/// Recolours the content for the length of a shake, then gives the host's own styling back exactly.
///
/// SwiftUI has no "inherit" value to switch back to. Pixel-sampled with ImageRenderer on iOS 26:
///   .tint(nil)                    writes nil: a tint the host set on an ancestor falls back to accent
///   .foregroundStyle(.primary)    turns an accent-coloured borderless or bordered Button label black
///   .foregroundStyle(.foreground) resets to black instead of inheriting
///   .tint(.tint)                  never finished rendering (the style refers to itself)
/// And `if on { … } else { … }` gives the content a new structural identity, which resets its focus,
/// @State and onAppear. So the content always receives a whole environment. At rest that is the one
/// captured above this modifier, the host's own, unmodified; during the shake it is the same one plus
/// the tint. Sampled the same way: at rest accent labels, ancestor tints, ancestor foreground styles
/// and prominent buttons all match the host exactly; during the shake borderless, bordered and
/// prominent buttons and plain content all take the tint. The chain's shape depends only on whether a
/// tint is given, never on the shake, so the content keeps its identity, its focus and its state.
private struct WowShakeTint: ViewModifier {
    let tint: Color?
    let on: Bool
    @Environment(\.self) private var rest

    func body(content: Content) -> some View {
        if let tint {
            content
                .modifier(WowShakeTintSwap(on: on, rest: rest))
                .foregroundStyle(tint)
                .tint(tint)
        } else {
            content
        }
    }
}

private struct WowShakeTintSwap: ViewModifier {
    let on: Bool
    let rest: EnvironmentValues
    @Environment(\.self) private var tinted     // `rest` plus the foreground style and tint above

    func body(content: Content) -> some View {
        content.environment(\.self, on ? tinted : rest)
    }
}
