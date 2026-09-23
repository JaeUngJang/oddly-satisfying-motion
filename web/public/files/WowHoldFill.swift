// WowHoldFill.swift — Wow Unit "hold-fill". Requires WowCore.swift in the same target.
//
// Hold to confirm, for actions that must not happen by accident. The label fills while the finger
// stays down, and the action fires on the frame the fill completes. Committing is slow, giving up
// is fast.
//   pressing      : .tap haptic once; scale 0.97, easeOut 0.16 s; the fill sweeps leading → trailing,
//                   linear over `duration` (an even countdown, never eased)
//   cancelled     : lifted early, or the finger left the label: the fill retracts, easeOut 0.20 s;
//                   scale back, easeOut 0.16 s; no haptic. Unlike a plain press, re-entering does NOT
//                   resume. A hold must be continuous, so the next touch-down starts over
//   released      : confirmed, while the finger is still down. .success and onConfirm on the frame the
//                   fill completes; the fill holds full 0.12 s, then fades 0.20 s; scale springs back
//                   (response 0.28 / damping 0.72)
//   interrupted   : the system took the touch: snap to idle, no animation, no haptic
//   idle          : reported once each sequence has settled
//   timing        : haptic within 50 ms, first frame within 85 ms of touch
//   reduce motion : no scale. The fill still runs: it is the countdown itself, not decoration
//   haptics off   : WowSettings.hapticsDisabled = true, or haptic: false
//   voiceover     : the action "Confirm" runs onConfirm without holding; a timed hold is not reliable
//
// Usage: on the label itself, not on a Button. The hold replaces the tap as the trigger.
//   Text("Hold to delete")
//       .padding(.vertical, 15).frame(maxWidth: .infinity)
//       .background(.red.opacity(0.12), in: Capsule())
//       .wowHoldFill(tint: .red) { deleteAccount() }
//
//   The fill is `tint` at 22 % over the label, so the label stays legible under it. On a filled
//   button whose background is the tint itself the sweep would not show: pass a contrasting tint.
//
// Decisions
//  1. The long press is the clock. Its timer ends `duration` after touch-down, so .success and
//     onConfirm ride its onEnded, and the linear sweep started by the same touch reaches 100 % within
//     a frame of it. There is no second timer to drift from the first.
//  2. One fill layer per hold, keyed by an attempt counter. SwiftUI runs a new timing-curve animation
//     together with one still in flight and combines the two, so on a shared value a retract or a
//     quick re-press would inherit the rest of the old 2 s sweep and start below zero. A fresh layer
//     has nothing in flight, and the sweep shape clamps to 0…1 besides.
//  3. The finger is tested against the label's layout bounds, outside the scale effect. Measured
//     inside it, the 0.97 press would pull the edges in under a still finger and cancel holds that
//     began near them.
//  4. A cancel is sticky for the rest of that touch. Only a new touch-down starts a hold.
//  5. Inside a ScrollView the hold owns a touch that starts on the label: a swipe from there does not
//     scroll, and the hold cancels as the finger leaves. Letting the scroll run alongside (attaching
//     it all as a simultaneous gesture) keeps the label under a slowly scrolling finger, and that
//     confirmed mid-scroll when measured on iOS 18.6. For a confirm control, not scrolling is the
//     safe failure; fixed chrome (a bottom bar, a sheet footer) avoids the question.

import SwiftUI

/// Choreography, after Emil Kowalski's hold-to-delete: slow linear commit, fast ease-out release.
private enum WowHoldFillTiming {
    static let pressedScale: CGFloat = 0.97
    static let pressIn: TimeInterval = 0.16     // scale in, and on cancel back out
    static let retract: TimeInterval = 0.20     // fill back to empty
    static let holdFull: TimeInterval = 0.12    // a confirmed fill stays full…
    static let fadeOut: TimeInterval = 0.20     // …then fades
    static let fillOpacity: Double = 0.22       // over the label, which stays legible under it
}

/// Hold to confirm. Apply to a label; `onConfirm` runs on the frame the fill completes.
struct WowHoldFill: ViewModifier {
    static let spec = WowSpec(id: "hold-fill", minIOS: 16,
                              hapticBudgetMs: 50, visualBudgetMs: 85, hapticMaxDurationMs: 120)

    /// Seconds the finger must stay down. The fill runs linearly over exactly this long.
    var duration: Double = 2.0
    /// Fill colour, drawn at 22 % over the label. Injected, never assumed.
    var tint: Color = .accentColor
    /// Corner radius of the fill. Match the label's own shape; 26 makes a capsule of a 52 pt label.
    var cornerRadius: CGFloat = 26
    /// Plays .tap on touch-down and .success on confirm.
    var haptic: Bool = true
    /// Every phase, on the main actor: pressing, then cancelled | released | interrupted, then idle.
    var onPhaseChange: ((WowPressPhase) -> Void)? = nil
    /// The action. Runs once per completed hold, or from the VoiceOver action "Confirm".
    var onConfirm: () -> Void

    @State private var phase: WowPressPhase = .idle
    @State private var pressed = false
    /// Bumped on every new hold: keys the fill layer and invalidates steps scheduled for the last one.
    @State private var attempt = 0
    /// The label's layout bounds, in the gesture's coordinate space.
    @State private var bounds: CGRect = .zero
    /// True while the long press is in flight. Resets on its own when the touch ends for any reason,
    /// including the system taking it, which no onEnded reports.
    @GestureState private var holding = false

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        content
            .overlay {
                if phase != .idle {
                    WowHoldFillLayer(phase: phase, duration: duration, tint: tint,
                                     cornerRadius: cornerRadius)
                        .id(attempt)                                // decision 2
                        .transition(.identity)
                }
            }
            .contentShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .scaleEffect(reduceMotion ? 1 : (pressed ? WowHoldFillTiming.pressedScale : 1))
            .background {                                           // decision 3: outside the scale
                GeometryReader { proxy in
                    Color.clear
                        .onAppear { bounds = CGRect(origin: .zero, size: proxy.size) }
                        .wowOnChange(of: proxy.size) { bounds = CGRect(origin: .zero, size: $0) }
                }
            }
            .gesture(hold.simultaneously(with: track))
            .wowOnChange(of: holding) { down in
                if !down { holdEnded() }
            }
            .accessibilityElement(children: .combine)
            .accessibilityAction(named: "Confirm") { confirmWithoutHolding() }
            .onAppear { if haptic { WowHaptics.shared.prepare() } }
    }

    // MARK: - Gestures

    /// The hold and its clock (decision 1). Distance is unbounded: the label's bounds, not a radius
    /// around the first touch, decide when a finger has left.
    private var hold: some Gesture {
        LongPressGesture(minimumDuration: duration, maximumDistance: .infinity)
            .updating($holding) { down, state, _ in state = down }
            .onChanged { _ in begin() }                             // once per touch, on touch-down
            .onEnded { _ in complete() }                            // `duration` later, finger still down
    }

    /// Where the finger is: the one thing the long press cannot tell.
    private var track: some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { value in
                if !bounds.contains(value.location) { cancel() }    // left the label
            }
            .onEnded { _ in cancel() }                              // lifted; a no-op once confirmed
    }

    // MARK: - Phases

    private func begin() {
        if haptic { WowHaptics.shared.play(.tap) }                  // 1 — haptic, before any view work
        WowProbe.onVisual?("hold-fill", WowProbe.now())             // 2 — probe
        attempt &+= 1                                               // 3 — a fresh fill layer
        enter(.pressing)                                            //     starts its linear sweep
        withAnimation(.easeOut(duration: WowHoldFillTiming.pressIn)) { pressed = true }
    }

    private func cancel() {
        guard phase == .pressing else { return }                    // decision 4
        enter(.cancelled)                                           // the layer retracts itself
        withAnimation(.easeOut(duration: WowHoldFillTiming.pressIn)) { pressed = false }
        settle(after: WowHoldFillTiming.retract)
    }

    private func complete() {
        guard phase == .pressing else { return }                    // left earlier: nothing to confirm
        confirm()
    }

    private func confirm() {
        if haptic { WowHaptics.shared.play(.success) }              // haptic first, on the full frame
        onConfirm()
        enter(.released)                                            // the layer holds, then fades
        withAnimation(.spring(response: 0.28, dampingFraction: 0.72)) { pressed = false }
        settle(after: WowHoldFillTiming.holdFull + WowHoldFillTiming.fadeOut)
    }

    /// VoiceOver cannot time a hold. Same haptic, action and fade, from a layer that starts full.
    private func confirmWithoutHolding() {
        attempt &+= 1
        confirm()
    }

    /// The long press ended. A lift or a completed hold moves the phase on from its own onEnded,
    /// delivered with this reset; one run-loop turn covers either delivery order. A hold still
    /// pressing after that turn lost its touch to the system (scroll, call, gesture conflict).
    private func holdEnded() {
        guard phase == .pressing else { return }
        let token = attempt
        DispatchQueue.main.async {
            guard token == self.attempt, self.phase == .pressing else { return }
            self.enter(.interrupted)
            var snap = Transaction()
            snap.disablesAnimations = true
            withTransaction(snap) {
                self.pressed = false
                self.phase = .idle                                  // removes the layer, no animation
            }
            self.onPhaseChange?(.idle)
        }
    }

    /// Returns to idle once the current sequence's motion is over, unless a newer hold began.
    private func settle(after delay: TimeInterval) {
        let token = attempt
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            guard token == self.attempt else { return }
            self.enter(.idle)
        }
    }

    private func enter(_ next: WowPressPhase) {
        phase = next
        onPhaseChange?(next)
    }
}

/// The fill for one hold. Owns its progress so that nothing animates across holds (decision 2).
private struct WowHoldFillLayer: View {
    let phase: WowPressPhase
    let duration: TimeInterval
    let tint: Color
    let cornerRadius: CGFloat

    @State private var progress: CGFloat
    @State private var shown = true

    init(phase: WowPressPhase, duration: TimeInterval, tint: Color, cornerRadius: CGFloat) {
        self.phase = phase
        self.duration = duration
        self.tint = tint
        self.cornerRadius = cornerRadius
        _progress = State(initialValue: phase == .released ? 1 : 0)   // confirmed without a hold
    }

    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(tint)
            .opacity(shown ? WowHoldFillTiming.fillOpacity : 0)
            .mask {
                WowHoldFillSweep(progress: progress)
                    .flipsForRightToLeftLayoutDirection(true)       // fills from the leading edge
            }
            .allowsHitTesting(false)
            .accessibilityHidden(true)
            .onAppear { run(phase) }
            .wowOnChange(of: phase) { run($0) }
    }

    private func run(_ phase: WowPressPhase) {
        switch phase {
        case .pressing:
            withAnimation(.linear(duration: duration)) { progress = 1 }
        case .cancelled:
            withAnimation(.easeOut(duration: WowHoldFillTiming.retract)) { progress = 0 }
        case .released:
            withAnimation(.easeOut(duration: WowHoldFillTiming.fadeOut).delay(WowHoldFillTiming.holdFull)) {
                shown = false
            }
        case .idle, .interrupted:
            break
        }
    }
}

/// The swept part of the fill: a rect from the left edge, `progress` of the width, clamped to 0…1.
private struct WowHoldFillSweep: Shape {
    var progress: CGFloat

    var animatableData: CGFloat {
        get { progress }
        set { progress = newValue }
    }

    func path(in rect: CGRect) -> Path {
        var swept = rect
        swept.size.width = rect.width * min(max(progress, 0), 1)
        return Path(swept)
    }

    /// Direction comes from flipsForRightToLeftLayoutDirection at the call site, the same on every
    /// deployment target. Without this, iOS 17+ targets would mirror the path a second time.
    @available(iOS 17.0, *)
    var layoutDirectionBehavior: LayoutDirectionBehavior { .fixed }
}

extension View {
    /// Hold to confirm on this label. `onConfirm` runs once per completed hold, on the frame the fill
    /// completes. Apply to the label, not to a Button: the hold replaces the tap.
    func wowHoldFill(duration: Double = 2.0, tint: Color = .accentColor, cornerRadius: CGFloat = 26,
                     haptic: Bool = true, onPhaseChange: ((WowPressPhase) -> Void)? = nil,
                     onConfirm: @escaping () -> Void) -> some View {
        modifier(WowHoldFill(duration: duration, tint: tint, cornerRadius: cornerRadius,
                             haptic: haptic, onPhaseChange: onPhaseChange, onConfirm: onConfirm))
    }
}
