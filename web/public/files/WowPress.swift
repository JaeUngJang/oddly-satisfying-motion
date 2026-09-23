// WowPress.swift — Wow Unit "press". Requires WowCore.swift in the same target.
//
// Touch-down acknowledgement for buttons.
//   motion  : scale 0.96 + slight darkening while pressed, spring back on release
//   haptic  : .tap on touch-down (fires before any visual work)
//   timing  : haptic within 50 ms, first frame within 85 ms of touch
//   reduce motion : no scale; opacity dip only (meaning preserved)
//   haptics off   : WowSettings.hapticsDisabled = true, or haptic: false
//
// Usage
//   Button("Continue") { … }.wowPress()                          // on a plain label
//   Button("Continue") { … }.wowPress(over: MyButtonStyle())     // on top of your own ButtonStyle
//
// Composition note: SwiftUI applies exactly one ButtonStyle per Button. `wowPress(over:)` keeps
// your look by rendering your style's body and layering press on it. System styles such as
// `.bordered` / `.borderedProminent` are PrimitiveButtonStyles and cannot be composed by SwiftUI;
// use the Primary CTA recipe for that look.

import SwiftUI

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

    func makeBody(configuration: Configuration) -> some View {
        WowPressBody(pressed: configuration.isPressed, scale: scale, dim: dim, haptic: haptic) {
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

    func makeBody(configuration: Configuration) -> some View {
        WowPressBody(pressed: configuration.isPressed, scale: scale, dim: dim, haptic: haptic) {
            base.makeBody(configuration: configuration)
        }
    }
}

private struct WowPressBody<Content: View>: View {
    let pressed: Bool
    let scale: CGFloat
    let dim: Double
    let haptic: Bool
    @ViewBuilder let content: () -> Content
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        content()
            .brightness(pressed ? -dim : 0)
            .scaleEffect(reduceMotion ? 1 : (pressed ? scale : 1))
            .opacity(reduceMotion && pressed ? 0.75 : 1)
            .animation(reduceMotion ? .easeOut(duration: 0.12)
                                    : .spring(response: 0.18, dampingFraction: 0.7),
                       value: pressed)
            .wowOnChange(of: pressed) { isDown in
                guard isDown else { return }
                if haptic { WowHaptics.shared.play(.tap) }   // haptic first
                WowProbe.onVisual?("press", WowProbe.now())
            }
            .onAppear { if haptic { WowHaptics.shared.prepare() } }
    }
}

extension View {
    /// Applies the press unit to a Button with a plain label.
    func wowPress(scale: CGFloat = 0.96, dim: Double = 0.06, haptic: Bool = true) -> some View {
        buttonStyle(WowPressStyle(scale: scale, dim: dim, haptic: haptic))
    }

    /// Applies the press unit on top of your own ButtonStyle.
    func wowPress<S: ButtonStyle>(over base: S, scale: CGFloat = 0.96, dim: Double = 0.06,
                                  haptic: Bool = true) -> some View {
        buttonStyle(WowPressOver(base: base, scale: scale, dim: dim, haptic: haptic))
    }
}
