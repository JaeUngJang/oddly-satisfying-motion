// WowSuccessCheck.swift — Wow Unit "success-check". Requires WowCore.swift in the same target.
//
// Completion confirmed: a ring scales in and a checkmark draws itself, with the .success
// haptic landing on the last frame of the stroke rather than at the start of the animation.
//   motion  : ring 0.6 → 1.0, spring(response 0.28 / damping 0.72), fading in over 0.12 s
//             check trims 0 → 1, easeOut 0.30 s, starting 0.06 s after the trigger
//   haptic  : .success at +0.34 s. The stroke ends at 0.06 + 0.30 = 0.36 s and the pulse is
//             fired one 20 ms lead earlier so the two are perceived as a single event
//             (simultaneity window, Kaaresoja, Brewster & Lantz, ACM TAP 11(2), 2014)
//   timing  : first frame within 85 ms of the trigger; all motion settles inside 0.5 s; nothing loops
//   reduce motion : no scale, no draw — ring + check cross-fade in over 0.15 s, haptic at +0.10 s
//   haptics off   : WowSettings.hapticsDisabled = true, or haptic: false
//   reset         : trigger → false fades out over 0.12 s and returns scale and trim to their
//                   start values in the same window, so the next run starts clean
//   input         : hit testing is off. The unit is decoration and never takes a touch.
//   voiceover     : no hard-coded strings. Announce completion from the control you own.
//
// Usage
//   @State private var saved = false
//   WowSuccessCheck(trigger: saved)
//   WowSuccessCheck(trigger: saved, size: 44, lineWidth: 4, tint: .green, haptic: false)

import SwiftUI

/// Completion confirmed. Starts when `trigger` becomes true; resets when it becomes false.
struct WowSuccessCheck: View {
    static let spec = WowSpec(id: "success-check", minIOS: 16,
                              hapticBudgetMs: 50, visualBudgetMs: 85, hapticMaxDurationMs: 120)

    /// Flip to true to run the confirmation once. Flip back to false to reset it.
    var trigger: Bool
    /// Outer width and height of the ring, in points.
    var size: CGFloat = 28
    /// Stroke width of both the ring and the checkmark.
    var lineWidth: CGFloat = 3
    /// Colour of ring and checkmark. Injected, never assumed.
    var tint: Color = .accentColor
    /// Plays the .success haptic as the stroke completes.
    var haptic: Bool = true

    // Choreography. The haptic offset is derived from the draw, not guessed at.
    private static let drawDelay: TimeInterval = 0.06
    private static let drawDuration: TimeInterval = 0.30
    private static let hapticLead: TimeInterval = 0.02
    private static let hapticAt = drawDelay + drawDuration - hapticLead   // 0.34 s
    private static let ringFade: TimeInterval = 0.12
    private static let reducedFade: TimeInterval = 0.15
    private static let reducedHapticAt: TimeInterval = 0.10
    private static let resetFade: TimeInterval = 0.12

    @State private var scaledIn = false
    @State private var visible = false
    @State private var progress: CGFloat = 0
    /// Bumped on every trigger change. A pending haptic whose run no longer matches is dropped.
    @State private var run = 0

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            Circle()
                .strokeBorder(tint, lineWidth: lineWidth)
            WowSuccessCheckMark()
                .trim(from: 0, to: progress)
                .stroke(tint, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round, lineJoin: .round))
        }
        .frame(width: size, height: size)
        .scaleEffect(reduceMotion ? 1 : (scaledIn ? 1 : 0.6))
        .opacity(visible ? 1 : 0)
        .allowsHitTesting(false)
        .wowOnChange(of: trigger) { on in
            if on { start() } else { reset() }
        }
        .onAppear {
            if haptic { WowHaptics.shared.prepare() }
            // Mounted already complete (a recycled row, a restored screen): show the finished
            // state with no motion and no haptic. This is not the event, only its result.
            if trigger && !visible { showCompleted() }
        }
    }

    // MARK: - Run

    private func start() {
        WowProbe.onVisual?("success-check", WowProbe.now())
        let token = nextRun()

        if reduceMotion {
            progress = 1                                            // no draw, meaning kept
            withAnimation(.easeOut(duration: Self.reducedFade)) { visible = true }
            scheduleHaptic(token, at: Self.reducedHapticAt)
        } else {
            withAnimation(.spring(response: 0.28, dampingFraction: 0.72)) { scaledIn = true }
            withAnimation(.easeOut(duration: Self.ringFade)) { visible = true }
            withAnimation(.easeOut(duration: Self.drawDuration).delay(Self.drawDelay)) { progress = 1 }
            scheduleHaptic(token, at: Self.hapticAt)
        }
    }

    private func reset() {
        _ = nextRun()                                               // drops any haptic still pending
        withAnimation(.easeOut(duration: Self.resetFade)) {
            visible = false
            progress = 0
            scaledIn = false
        }
    }

    private func showCompleted() {
        _ = nextRun()
        visible = true
        progress = 1
        scaledIn = true
    }

    // MARK: - Haptic scheduling

    /// Invalidates whatever was scheduled before and returns the token for the new run.
    private func nextRun() -> Int {
        run &+= 1
        return run
    }

    private func scheduleHaptic(_ token: Int, at delay: TimeInterval) {
        guard haptic else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            // `self` carries the @State box by reference, so this reads the live counter:
            // a reset or a re-run before the stroke finished has already moved it on.
            guard token == self.run else { return }
            WowHaptics.shared.play(.success)
        }
    }
}

/// The checkmark, in unit space, so its proportions hold at any size.
private struct WowSuccessCheckMark: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: point(0.28, 0.53, in: rect))
        path.addLine(to: point(0.44, 0.69, in: rect))
        path.addLine(to: point(0.72, 0.36, in: rect))
        return path
    }

    private func point(_ x: CGFloat, _ y: CGFloat, in rect: CGRect) -> CGPoint {
        CGPoint(x: rect.minX + x * rect.width, y: rect.minY + y * rect.height)
    }
}
