// WowPress.swift — Wow Unit "press". Requires WowCore.swift in the same target.
//
// Touch-down acknowledgement for buttons, with the states of a system button made explicit.
//   pressing    : finger down inside. scale 0.96 + slight darkening, spring(response 0.18 /
//                 damping 0.7). .tap haptic once per touch, fired before any visual work
//   cancelled   : dragged out past the Button's touch slop (~70 pt beyond the frame, as in UIKit),
//                 held or lifted there. Back to 1.0 with easeOut 0.16 s, no overshoot, no haptic.
//                 Dragging back resumes pressing silently: one .tap per touch
//   released    : lifted while still pressed. The Button's action fires as normal. Back with the
//                 spring (overshoot allowed), no haptic: the next unit owns the result
//   interrupted : the system took the touch (scroll, call, gesture conflict). Snap back with
//                 easeOut 0.12 s, no haptic
//   idle        : reported when the touch is over. `onPhaseChange` hears every transition
//   timing      : haptic within 50 ms, first frame within 85 ms of touch
//   reduce motion : no scale; opacity dip only, easeOut 0.12 s. Phases and haptic unchanged
//   haptics off   : WowSettings.hapticsDisabled = true, or haptic: false
//
// Reading the phase
//   `isPressed` stays the source of truth for the visual: SwiftUI drops it past the touch slop and
//   raises it again when the finger comes back. What it cannot say is why it dropped. A touch
//   watcher says that: one UIGestureRecognizer per window follows the touch that began on the unit,
//   and since it never recognizes, it never prevents, delays or cancels anything.
//     finger still down, outside the bounds    → cancelled
//     finger still down, inside the bounds     → interrupted (the Button lost it, e.g. to a scroll)
//     lifted while the Button was still pressed → released (isPressed judges the lift, because the
//                                                Button's own region decides whether its action fires)
//     touch cancelled, or reset without ending  → interrupted
//   The haptic is keyed to `isPressed`, not to the touch: a scroll that starts on the button never
//   buzzes, and the haptic is spent once per touch, so re-entry is silent.
//   Why not a SwiftUI gesture: on iOS 26 a DragGesture(minimumDistance: 0) inside the label, even
//   through simultaneousGesture, takes the touch from the Button (its action never fires) and from
//   an enclosing ScrollView. A ButtonStyle cannot attach anything above the Button, so the unit
//   listens at the window instead. Checked on the iOS 18.6 and 26.0 simulators.
//   ScrollView note: on iOS 18 SwiftUI never raises isPressed for a tap shorter than ~0.2 s inside a
//   ScrollView (a bare ButtonStyle sees the same; iOS 26 raises it). Such a tap fires the action
//   with no phases and no haptic.
//
// Usage
//   Button("Continue") { … }.wowPress()                          // on a plain label
//   Button("Continue") { … }.wowPress(over: MyButtonStyle())     // on top of your own ButtonStyle
//   Button("Continue") { … }.wowPress { phase in log(phase) }    // observe the phases
//
// Composition note: SwiftUI applies exactly one ButtonStyle per Button. `wowPress(over:)` keeps
// your look by rendering your style's body and layering press on it. System styles such as
// `.bordered` / `.borderedProminent` are PrimitiveButtonStyles and cannot be composed by SwiftUI;
// use the Primary CTA recipe for that look.

import SwiftUI
import UIKit

/// Press on a plain label (the label is rendered as-is).
struct WowPressStyle: ButtonStyle {
    static let spec = WowSpec(id: "press", minIOS: 16,
                              hapticBudgetMs: 50, visualBudgetMs: 85, hapticMaxDurationMs: 60)

    /// Scale while pressed. 1.0 disables scaling.
    var scale: CGFloat = 0.96
    /// Darkening while pressed, 0…1. Works on any label shape.
    var dim: Double = 0.06
    /// Plays the .tap haptic on touch-down.
    var haptic: Bool = true
    /// Called on every phase transition, on the main actor.
    var onPhaseChange: ((WowPressPhase) -> Void)? = nil

    func makeBody(configuration: Configuration) -> some View {
        WowPressBody(pressed: configuration.isPressed, scale: scale, dim: dim, haptic: haptic,
                     onPhaseChange: onPhaseChange) {
            configuration.label
        }
    }
}

/// Press layered over another ButtonStyle: your style draws the button, press adds motion + haptic.
struct WowPressOver<Base: ButtonStyle>: ButtonStyle {
    var base: Base
    var scale: CGFloat = 0.96
    var dim: Double = 0.06
    var haptic: Bool = true
    var onPhaseChange: ((WowPressPhase) -> Void)? = nil

    func makeBody(configuration: Configuration) -> some View {
        WowPressBody(pressed: configuration.isPressed, scale: scale, dim: dim, haptic: haptic,
                     onPhaseChange: onPhaseChange) {
            base.makeBody(configuration: configuration)
        }
    }
}

private struct WowPressBody<Content: View>: View {
    let pressed: Bool
    let scale: CGFloat
    let dim: Double
    let haptic: Bool
    let onPhaseChange: ((WowPressPhase) -> Void)?
    @ViewBuilder let content: () -> Content

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    /// Where the finger is while it is down; nil once it lifts or the system cancels it.
    @State private var finger: WowPressFinger? = nil
    /// The current touch, from finger down until the unit is idle again.
    @State private var touch = WowPressTouch()
    /// The last phase reported.
    @State private var phase: WowPressPhase = .idle

    var body: some View {
        // Resolved here too, so the return curve is chosen in the same update in which
        // `isPressed` drops. `advance` reports the same answer right after.
        let next = WowPressLogic.resolve(phase, pressed: pressed, finger: finger, touch: touch)

        content()
            .brightness(pressed ? -dim : 0)
            .scaleEffect(reduceMotion ? 1 : (pressed ? scale : 1))
            .opacity(reduceMotion && pressed ? 0.75 : 1)
            .animation(curve(into: next), value: pressed)
            .background(GeometryReader { proxy in
                WowPressTouchAnchor(size: proxy.size) { track($0) }
                    .frame(width: 0, height: 0)   // draws nothing; only anchors the unit's origin
            })
            .wowOnChange(of: WowPressSignal(pressed: pressed, finger: finger)) { advance($0) }
            .onAppear { if haptic { WowHaptics.shared.prepare() } }
    }

    /// Touch events from the window's watcher, for the touch that began on this unit.
    private func track(_ event: WowPressTouchEvent) {
        switch event {
        case .down:
            touch.fingerSeen = true
            touch.lifted = false
            finger = .inside
        case .moved(let inside):
            let now: WowPressFinger = inside ? .inside : .outside
            if finger != now { finger = now }
        case .lifted:
            touch.lifted = true
            finger = nil
        case .cancelled:
            finger = nil
        }
    }

    /// One step of the state machine, run once per update in which either signal changed.
    /// Takes the signal as a parameter: on iOS 16 the change closure may capture older view values.
    private func advance(_ signal: WowPressSignal) {
        let next = WowPressLogic.resolve(phase, pressed: signal.pressed, finger: signal.finger, touch: touch)
        if next == .pressing && !touch.acknowledged {     // once per touch, so re-entry is silent
            touch.acknowledged = true
            if haptic { WowHaptics.shared.play(.tap) }   // haptic first
            WowProbe.onVisual?("press", WowProbe.now())
        }
        report(next)
        if signal.finger == nil && !signal.pressed {      // the touch is over
            touch = WowPressTouch()
            report(.idle)
        }
    }

    private func report(_ next: WowPressPhase) {
        guard next != phase else { return }
        phase = next
        onPhaseChange?(next)
    }

    /// The curve for the change of `pressed` that leads into `next`.
    private func curve(into next: WowPressPhase) -> Animation {
        if reduceMotion { return .easeOut(duration: 0.12) }
        switch next {
        case .cancelled:   return .easeOut(duration: 0.16)                        // no overshoot
        case .interrupted: return .easeOut(duration: 0.12)                        // snap to idle
        default:           return .spring(response: 0.18, dampingFraction: 0.7)   // press, release
        }
    }
}

// MARK: - Phase logic

private enum WowPressFinger { case inside, outside }

/// The two signals the phase is read from. Observed together so each update is seen once.
private struct WowPressSignal: Equatable {
    let pressed: Bool
    let finger: WowPressFinger?
}

private struct WowPressTouch {
    /// A finger came down on the unit. False for presses that come without one (keyboard, accessibility).
    var fingerSeen = false
    /// The finger lifted. A touch the system cancelled leaves it false.
    var lifted = false
    /// The .tap haptic and the probe mark are spent for this touch.
    var acknowledged = false
}

private enum WowPressLogic {
    /// Pure: the same snapshot gives the same phase in `body` (curve) and in `advance` (report).
    static func resolve(_ last: WowPressPhase, pressed: Bool, finger: WowPressFinger?,
                        touch: WowPressTouch) -> WowPressPhase {
        if pressed { return .pressing }
        if let finger {
            // Down but no longer pressed. Outside: dragged out. Inside: the system took the touch.
            // Only a press decides this; cancelled and interrupted hold until the finger lifts.
            guard last == .pressing else { return last }
            return finger == .inside ? .interrupted : .cancelled
        }
        // Finger up. Still pressed at the lift: the Button fired its action. Lifted outside after a
        // drag-out: stays cancelled. No lift at all: the system took the touch.
        switch last {
        case .pressing:  return touch.lifted || !touch.fingerSeen ? .released : .interrupted
        case .cancelled: return touch.lifted ? .cancelled : .interrupted
        default:         return last
        }
    }
}

// MARK: - Touch watching

private enum WowPressTouchEvent { case down, moved(inside: Bool), lifted, cancelled }

/// Zero-size UIView at the unit's top-left corner: gives the watcher a window to live in and an
/// origin for the unit's bounds. Draws nothing (safe under drawingGroup), never hit-tested.
private struct WowPressTouchAnchor: UIViewRepresentable {
    let size: CGSize
    let onEvent: (WowPressTouchEvent) -> Void

    func makeUIView(context: Context) -> WowPressAnchorView {
        let view = WowPressAnchorView()
        view.isUserInteractionEnabled = false
        return view
    }

    func updateUIView(_ view: WowPressAnchorView, context: Context) {
        view.size = size
        view.onEvent = onEvent
    }
}

private final class WowPressAnchorView: UIView {
    var size: CGSize = .zero
    var onEvent: ((WowPressTouchEvent) -> Void)?
    private weak var tracked: UITouch?

    override func didMoveToWindow() {
        super.didMoveToWindow()
        if let window { WowPressTouchWatcher.watch(self, in: window) }
    }

    private func isInside(_ touch: UITouch) -> Bool {
        CGRect(origin: .zero, size: size).contains(touch.location(in: self))
    }

    func began(_ touches: Set<UITouch>) {
        guard tracked == nil, let window,
              let touch = touches.first(where: { $0.window === window && isInside($0) }) else { return }
        tracked = touch
        onEvent?(.down)
    }

    func moved(_ touches: Set<UITouch>) {
        guard let touch = tracked, touches.contains(touch) else { return }
        onEvent?(.moved(inside: isInside(touch)))
    }

    func ended(_ touches: Set<UITouch>, cancelled: Bool) {
        guard let touch = tracked, touches.contains(touch) else { return }
        tracked = nil
        onEvent?(cancelled ? .cancelled : .lifted)
    }

    /// The watcher was reset while this touch was still tracked: it never ended, so it was taken.
    func lost() {
        guard tracked != nil else { return }
        tracked = nil
        onEvent?(.cancelled)
    }
}

/// One per window. Sees every touch in it but never recognizes, so it never prevents, delays or
/// cancels anything: the Button's gesture and a ScrollView's pan run exactly as they would without it.
private final class WowPressTouchWatcher: UIGestureRecognizer {
    private let anchors = NSHashTable<WowPressAnchorView>.weakObjects()
    private var active = Set<UITouch>()

    static func watch(_ anchor: WowPressAnchorView, in window: UIWindow) {
        let watcher = window.gestureRecognizers?.lazy.compactMap { $0 as? WowPressTouchWatcher }.first
            ?? WowPressTouchWatcher(installedIn: window)
        watcher.anchors.add(anchor)
    }

    private convenience init(installedIn window: UIWindow) {
        self.init(target: nil, action: nil)
        cancelsTouchesInView = false
        delaysTouchesBegan = false
        delaysTouchesEnded = false
        window.addGestureRecognizer(self)
    }

    override func canPrevent(_ preventedGestureRecognizer: UIGestureRecognizer) -> Bool { false }
    override func canBePrevented(by preventingGestureRecognizer: UIGestureRecognizer) -> Bool { false }
    override func shouldBeRequiredToFail(by otherGestureRecognizer: UIGestureRecognizer) -> Bool { false }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent) {
        active.formUnion(touches)
        for anchor in anchors.allObjects { anchor.began(touches) }
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent) {
        for anchor in anchors.allObjects { anchor.moved(touches) }
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent) {
        finish(touches, cancelled: false)
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent) {
        finish(touches, cancelled: true)
    }

    override func reset() {
        super.reset()
        active.removeAll()
        for anchor in anchors.allObjects { anchor.lost() }
    }

    private func finish(_ touches: Set<UITouch>, cancelled: Bool) {
        for anchor in anchors.allObjects { anchor.ended(touches, cancelled: cancelled) }
        active.subtract(touches)
        if active.isEmpty { state = .failed }   // done with this sequence; UIKit resets us
    }
}

extension View {
    /// Applies the press unit to a Button with a plain label.
    func wowPress(scale: CGFloat = 0.96, dim: Double = 0.06, haptic: Bool = true,
                  onPhaseChange: ((WowPressPhase) -> Void)? = nil) -> some View {
        buttonStyle(WowPressStyle(scale: scale, dim: dim, haptic: haptic, onPhaseChange: onPhaseChange))
    }

    /// Applies the press unit on top of your own ButtonStyle.
    func wowPress<S: ButtonStyle>(over base: S, scale: CGFloat = 0.96, dim: Double = 0.06,
                                  haptic: Bool = true,
                                  onPhaseChange: ((WowPressPhase) -> Void)? = nil) -> some View {
        buttonStyle(WowPressOver(base: base, scale: scale, dim: dim, haptic: haptic,
                                 onPhaseChange: onPhaseChange))
    }
}
