// WowLabelRoll.swift — Wow Unit "label-roll". Requires WowCore.swift in the same target.
//
// Numbers and labels that roll in the direction of change. A value that rises rolls up, one that
// falls rolls down, so the sign of the change reads before the digits do.
//   motion  : spring(response 0.30 / damping 0.85). Digits are monospaced so the width holds.
//             iOS 17+: contentTransition(.numericText(value:)) rolls the changed digits and infers
//             the direction from the delta.
//             iOS 16: numericText exists but only cross-fades in app views before iOS 17, and
//             numericText(value:) (the direction inference) is iOS 17. So on 16 the label slides
//             in one line, from below when the value rose and from above when it fell.
//   haptic  : none on ordinary changes. Continuous updates stay silent. With hapticThreshold set,
//             .tap fires once on the change that crosses it, either direction, before the roll.
//             Apple's own increase/decrease feedback is defined as "an important value increased
//             above a significant threshold" (SensoryFeedback.increase).
//   timing  : haptic within 50 ms, first frame within 85 ms of the change; nothing loops
//   reduce motion : no roll. The label cross-fades over 0.15 s. The threshold haptic is unchanged.
//   haptics off   : WowSettings.hapticsDisabled = true, or haptic: false
//   voiceover     : the formatted number is the accessibilityValue. Name it from your control,
//                   e.g. .accessibilityLabel("Likes"), so it reads "Likes, 128 likes".
//
// Usage
//   WowLabelRoll(value: likes, suffix: " likes")
//   WowLabelRoll(value: balance, format: "%.2f", prefix: "$", font: .title.bold(), hapticThreshold: 0)
//   WowLabelRollText(text: following ? "Following" : "Follow")

import SwiftUI

/// A number that rolls in the direction of its change.
struct WowLabelRoll: View {
    static let spec = WowSpec(id: "label-roll", minIOS: 16,
                              hapticBudgetMs: 50, visualBudgetMs: 85, hapticMaxDurationMs: 60)

    /// The number shown. The roll's direction follows the sign of each change.
    var value: Double
    /// `String(format:)` pattern with one floating-point conversion, rendered in the environment
    /// locale: "%.0f" shows 12,345 in en_US and 12.345 in de_DE.
    var format: String = "%.0f"
    /// Text before the number, e.g. "$".
    var prefix: String = ""
    /// Text after the number, e.g. " likes".
    var suffix: String = ""
    var font: Font = .body
    /// Text colour. Injected, never assumed.
    var tint: Color = .primary
    /// Haptic only when a threshold is crossed (Apple: increase/decrease of a value the user cares about).
    /// .tap fires once when the value moves from one side of this line to the other. nil = silent.
    var hapticThreshold: Double? = nil
    /// Allows the threshold haptic. Ordinary changes never play one.
    var haptic: Bool = true

    /// The value before the change being drawn. onChange catches it up one update later.
    @State private var lastValue: Double?
    /// Direction of the latest change, held once `lastValue` has caught up.
    @State private var wentDown = false

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.locale) private var locale

    var body: some View {
        roll
            .foregroundStyle(tint)
            .animation(reduceMotion ? WowLabelRollMotion.fade : WowLabelRollMotion.roll, value: value)
            .accessibilityElement(children: .ignore)
            .accessibilityValue(Text(verbatim: display))
            .wowOnChange(of: value) { changed(to: $0) }
            .onAppear {
                lastValue = value
                if haptic && hapticThreshold != nil { WowHaptics.shared.prepare() }
            }
    }

    private var display: String {
        prefix + String(format: format, locale: locale, value) + suffix
    }

    @ViewBuilder private var roll: some View {
        let label = Text(verbatim: display).font(font).monospacedDigit()
        if reduceMotion {
            label.contentTransition(.opacity)
        } else if #available(iOS 17, *) {
            label.contentTransition(.numericText(value: value))
        } else {
            WowLabelRollSlide(label: label, id: display, down: rollsDown)
        }
    }

    /// Direction of the change on screen: read live while `lastValue` still holds the old value,
    /// then held, so the slide keeps its direction through the update that follows.
    private var rollsDown: Bool {
        guard let lastValue, lastValue != value else { return wentDown }
        return value < lastValue
    }

    private func changed(to new: Double) {
        if haptic, let old = lastValue, let line = hapticThreshold, (old >= line) != (new >= line) {
            WowHaptics.shared.play(.tap)                                   // haptic first
        }
        WowProbe.onVisual?("label-roll", WowProbe.now())
        if let old = lastValue { wentDown = new < old }
        lastValue = new
    }
}

/// A label that rolls to its next text ("Follow" → "Following"). Labels have no delta, so it
/// always rolls up.
struct WowLabelRollText: View {
    var text: String
    var font: Font = .body
    /// Text colour. Injected, never assumed.
    var tint: Color = .primary

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        roll
            .foregroundStyle(tint)
            .animation(reduceMotion ? WowLabelRollMotion.fade : WowLabelRollMotion.roll, value: text)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(Text(verbatim: text))
            .wowOnChange(of: text) { _ in WowProbe.onVisual?("label-roll", WowProbe.now()) }
    }

    @ViewBuilder private var roll: some View {
        let label = Text(verbatim: text).font(font)
        if reduceMotion {
            label.contentTransition(.opacity)
        } else if #available(iOS 17, *) {
            label.contentTransition(.numericText())
        } else {
            WowLabelRollSlide(label: label, id: text, down: false)
        }
    }
}

private enum WowLabelRollMotion {
    static var roll: Animation { .spring(response: 0.30, dampingFraction: 0.85) }
    static var fade: Animation { .easeOut(duration: 0.15) }
}

/// iOS 16 roll. The new label slides in one line and fades in; the old one fades where it stood.
/// The old one does not travel: SwiftUI removes a view with the transition it had when last
/// drawn, so right after a change of direction it would leave the wrong way.
private struct WowLabelRollSlide: View {
    let label: Text
    let id: String
    let down: Bool

    var body: some View {
        ZStack {
            label
                .id(id)
                .transition(.asymmetric(insertion: .move(edge: down ? .top : .bottom).combined(with: .opacity),
                                        removal: .opacity))
        }
        // Clip top and bottom only: a label that grows keeps its sides while the frame widens.
        .mask { Rectangle().padding(.horizontal, -1_000) }
    }
}
