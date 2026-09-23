// WowCore.swift — Oddly Satisfying Motion core. Copy this ONE file into your app target, once.
// Every unit depends only on this file. No package, no framework, nothing to configure.
// Minimum iOS 16. Safe on simulator and on devices without Core Haptics (falls back, never crashes).
//
// Contents
//   WowHaptics  — Core Haptics engine lifecycle + UIFeedbackGenerator fallback
//   WowSettings — app-level opt-outs (haptics optional, per Apple HIG)
//   WowMotion   — Reduce Motion read for non-View code
//   WowSpec     — per-unit declared budgets (units keep these in sync with unit.json)
//   WowPressPhase — the interaction states every pressable unit documents and implements
//   WowProbe    — zero-cost measurement hooks (nil by default; demo app installs handlers)
//   wowOnChange — onChange that compiles warning-free from iOS 16 to current
//
// Concurrency: everything here is main-actor isolated. Units call it from view code, which is
// main-actor in SwiftUI, so this compiles under Swift 6 strict concurrency without annotations.

import SwiftUI
import CoreHaptics
import UIKit
import QuartzCore

// MARK: - Settings

enum WowSettings {
    /// Turn off all unit haptics app-wide. Off by default. Units remain fully usable without haptics.
    @MainActor static var hapticsDisabled = false
}

// MARK: - Motion policy

enum WowMotion {
    /// System Reduce Motion, for non-View code. Views should read `@Environment(\.accessibilityReduceMotion)`.
    @MainActor static var reduceMotion: Bool { UIAccessibility.isReduceMotionEnabled }
}

// MARK: - Spec

/// Budgets a unit commits to. Windows come from Kaaresoja, Brewster & Lantz, ACM TAP 11(2), 2014:
/// tactile feedback within 5–50 ms and visual within 30–85 ms of touch is perceived as simultaneous.
struct WowSpec: Equatable {
    let id: String
    let minIOS: Int
    /// touch → haptic call, ms
    let hapticBudgetMs: Int
    /// touch → first animated frame, ms
    let visualBudgetMs: Int
    /// longest haptic pattern this unit plays, ms (short by design; long vibration tests worse than none)
    let hapticMaxDurationMs: Int
}

// MARK: - Interaction phases

/// The states a pressable unit moves through. Every unit that reacts to a press documents,
/// in its unit.json `states`, which motion and which haptic belong to each phase.
///
///   idle        nothing is happening
///   pressing    finger down inside the control (haptic fires once, on entry)
///   cancelled   finger dragged outside, released outside, or the press was retracted:
///               return without overshoot, no haptic; re-entering resumes `pressing` silently
///   released    finger lifted inside: the action fires; return with the spring's overshoot
///   interrupted the system took the touch (scroll, call, gesture conflict): snap to idle, no haptic
enum WowPressPhase: Equatable {
    case idle, pressing, cancelled, released, interrupted
}

// MARK: - Probe hooks

/// Measurement hooks. All nil by default: one load + branch per event, no allocation.
/// The demo app installs handlers to produce the spec sheet. Shipping apps never touch this.
enum WowProbe {
    @MainActor static var onHaptic: ((WowHapticEvent, TimeInterval) -> Void)?
    @MainActor static var onVisual: ((String, TimeInterval) -> Void)?
    @inline(__always) static func now() -> TimeInterval { CACurrentMediaTime() }
}

// MARK: - onChange compatibility

extension View {
    /// `onChange` that is warning-free on every deployment target from iOS 16 up.
    /// Units use this instead of `onChange(of:perform:)` (deprecated on iOS 17 targets).
    @ViewBuilder
    func wowOnChange<V: Equatable>(of value: V, perform action: @escaping (V) -> Void) -> some View {
        if #available(iOS 17, *) {
            onChange(of: value) { _, newValue in action(newValue) }
        } else {
            modifier(WowLegacyChange(value: value, action: action))
        }
    }
}

/// Deprecated-from-17 on purpose: inside a declaration deprecated for iOS 17 the compiler allows
/// the iOS 16 `onChange` overload without emitting its deprecation warning.
@available(iOS, introduced: 16.0, deprecated: 17.0)
private struct WowLegacyChange<V: Equatable>: ViewModifier {
    let value: V
    let action: (V) -> Void
    func body(content: Content) -> some View {
        content.onChange(of: value, perform: action)
    }
}

// MARK: - Haptics

enum WowHapticEvent: String {
    case tap      // touch-down acknowledgement
    case success  // completion confirmed
    case error    // failure / rejection
    case burst    // reward
}

@MainActor
final class WowHaptics {
    static let shared = WowHaptics()

    private let supportsCoreHaptics: Bool
    private var engine: CHHapticEngine?
    private var engineNeedsStart = true
    private var patterns: [WowHapticEvent: CHHapticPattern] = [:]
    private let impact = UIImpactFeedbackGenerator(style: .light)
    private let notify = UINotificationFeedbackGenerator()

    private init() {
        supportsCoreHaptics = CHHapticEngine.capabilitiesForHardware().supportsHaptics
        let nc = NotificationCenter.default
        nc.addObserver(self, selector: #selector(didEnterBackground),
                       name: UIApplication.didEnterBackgroundNotification, object: nil)
        nc.addObserver(self, selector: #selector(willEnterForeground),
                       name: UIApplication.willEnterForegroundNotification, object: nil)
    }

    /// Warms generators and the engine so the first haptic has no start-up latency.
    /// Units call this on appear; cheap to call repeatedly.
    func prepare() {
        impact.prepare()
        notify.prepare()
        _ = readyEngine()
    }

    /// Plays an event. Order matters for latency: units call this BEFORE starting any visual work.
    func play(_ event: WowHapticEvent) {
        WowProbe.onHaptic?(event, WowProbe.now())
        if WowSettings.hapticsDisabled { return }
        if let engine = readyEngine(), let pattern = pattern(for: event) {
            do {
                let player = try engine.makePlayer(with: pattern)
                try player.start(atTime: CHHapticTimeImmediate)
                return
            } catch {
                // fall through to generators
            }
        }
        fallback(event)
    }

    // MARK: engine lifecycle

    private func readyEngine() -> CHHapticEngine? {
        guard supportsCoreHaptics else { return nil }
        if engine == nil {
            do {
                let e = try CHHapticEngine()
                e.playsHapticsOnly = true          // never touches the app's audio session
                e.isAutoShutdownEnabled = true     // idle → stops itself; we restart on demand
                e.resetHandler = { [weak self] in self?.engineNeedsStart = true }
                e.stoppedHandler = { [weak self] _ in self?.engineNeedsStart = true }
                engine = e
            } catch {
                return nil
            }
        }
        if engineNeedsStart {
            do {
                try engine?.start()
                engineNeedsStart = false
            } catch {
                return nil
            }
        }
        return engine
    }

    @objc private func didEnterBackground() {
        engine?.stop(completionHandler: nil)
        engineNeedsStart = true
    }

    @objc private func willEnterForeground() {
        _ = readyEngine()
    }

    // MARK: patterns

    private func fallback(_ event: WowHapticEvent) {
        switch event {
        case .tap:     impact.impactOccurred()
        case .success: notify.notificationOccurred(.success)
        case .error:   notify.notificationOccurred(.error)
        case .burst:   impact.impactOccurred(intensity: 1.0)
        }
    }

    /// Patterns are short on purpose (≤150 ms). Evidence: ~400 ms reward vibration helped,
    /// 3,200 ms tested worse than none (Hampton & Hildebrand, J. Consumer Research, 2026).
    private func pattern(for event: WowHapticEvent) -> CHHapticPattern? {
        if let cached = patterns[event] { return cached }
        func transient(_ t: TimeInterval, _ intensity: Float, _ sharpness: Float) -> CHHapticEvent {
            CHHapticEvent(eventType: .hapticTransient, parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness),
            ], relativeTime: t)
        }
        let events: [CHHapticEvent]
        switch event {
        case .tap:
            events = [transient(0, 0.5, 0.7)]
        case .success:
            events = [transient(0, 0.45, 0.4), transient(0.08, 0.85, 0.6)]
        case .error:
            events = [transient(0, 0.8, 0.9), transient(0.06, 0.8, 0.9), transient(0.12, 0.8, 0.9)]
        case .burst:
            let tail = CHHapticEvent(eventType: .hapticContinuous, parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.5),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.3),
            ], relativeTime: 0.01, duration: 0.12)
            events = [transient(0, 1.0, 0.9), tail]
        }
        let decay = CHHapticParameterCurve(parameterID: .hapticIntensityControl, controlPoints: [
            CHHapticParameterCurve.ControlPoint(relativeTime: 0, value: 1.0),
            CHHapticParameterCurve.ControlPoint(relativeTime: 0.13, value: 0.0),
        ], relativeTime: 0)
        let p = try? CHHapticPattern(events: events, parameterCurves: event == .burst ? [decay] : [])
        patterns[event] = p
        return p
    }
}
