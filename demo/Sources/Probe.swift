// Probe.swift — DEBUG-only latency + frame-time probe for the Wow Units demo.
//
// Ground rule: measurement code must not distort what it measures.
//   1. The hot path only appends a (name, timestamp) pair to an array that already owns its
//      storage. No print, no file I/O, no String formatting, no @Published mutation inside
//      WowProbe.onHaptic / WowProbe.onVisual or the CADisplayLink callback. Anything that
//      allocates or invalidates SwiftUI would land inside the number we are trying to measure.
//   2. Everything expensive (pairing marks, building JSON) runs after the run is over.
//   3. The JSON file is written only when the button is pressed. Never automatically.
//
// Simulator caveats, both of which matter when reading the numbers:
//   • CHHapticEngine.capabilitiesForHardware().supportsHaptics is FALSE on the simulator, so
//     haptic *playback* is a no-op there. WowHaptics.play() calls WowProbe.onHaptic on its first
//     line — before the capability check and before any engine work — so touch → haptic-call
//     latency is still a valid measurement on the simulator: it is the app-side cost of getting
//     from the touch to the moment the haptic is requested. What the simulator cannot show you is
//     actuator latency (Taptic Engine spin-up), which only a device can.
//   • Frame times on the simulator are indicative only: it renders through the Mac's GPU and
//     scheduler, with no thermal or display-pipeline pressure. Real numbers come from a device.

#if DEBUG

import SwiftUI
import QuartzCore
import UIKit

// MARK: - Recorder (hot path)

/// Raw marks. Deliberately dumb: append, nothing else.
final class ProbeRecorder {
    static let shared = ProbeRecorder()

    struct Mark {
        let name: String
        let t: TimeInterval
    }

    // Preallocated. Capacity is never exceeded in a demo session; append stays O(1), no realloc.
    private(set) var haptics: [Mark] = []
    private(set) var visuals: [Mark] = []
    private(set) var touches: [TimeInterval] = []
    /// CADisplayLink targetTimestamp − timestamp: the interval the system *expects* to serve.
    private(set) var expectedFrameIntervals: [Double] = []
    /// timestamp − previous timestamp: the interval actually observed. Dropped frames show here.
    private(set) var actualFrameIntervals: [Double] = []

    private var touchIsDown = false
    private var link: CADisplayLink?
    private var stopItem: DispatchWorkItem?
    private var lastTimestamp: TimeInterval = 0

    /// Called when frame capture ends, on the main queue, after the recording is over.
    var onFrameCaptureFinished: (() -> Void)?

    private init() {
        haptics.reserveCapacity(4096)
        visuals.reserveCapacity(4096)
        touches.reserveCapacity(1024)
        expectedFrameIntervals.reserveCapacity(4096)
        actualFrameIntervals.reserveCapacity(4096)
    }

    // --- hot path: three one-line appends -------------------------------------------------

    @inline(__always) func recordHaptic(_ name: String, _ t: TimeInterval) {
        haptics.append(Mark(name: name, t: t))
    }

    @inline(__always) func recordVisual(_ name: String, _ t: TimeInterval) {
        visuals.append(Mark(name: name, t: t))
    }

    /// One mark per press: DragGesture.onChanged fires repeatedly, we keep the first.
    @inline(__always) func recordTouchDown(_ t: TimeInterval) {
        guard !touchIsDown else { return }
        touchIsDown = true
        touches.append(t)
    }

    @inline(__always) func touchEnded() { touchIsDown = false }

    // --- frame capture ---------------------------------------------------------------------

    /// Runs only while a burst is on screen: a display link that is alive for 1.2 s and then dies.
    func startFrameCapture(seconds: Double = 1.2) {
        stopFrameCapture(notify: false)
        expectedFrameIntervals.removeAll(keepingCapacity: true)
        actualFrameIntervals.removeAll(keepingCapacity: true)
        lastTimestamp = 0

        let l = CADisplayLink(target: self, selector: #selector(tick(_:)))
        l.add(to: .main, forMode: .common)
        link = l

        let item = DispatchWorkItem { [weak self] in self?.stopFrameCapture(notify: true) }
        stopItem = item
        DispatchQueue.main.asyncAfter(deadline: .now() + seconds, execute: item)
    }

    @objc private func tick(_ l: CADisplayLink) {
        expectedFrameIntervals.append(l.targetTimestamp - l.timestamp)
        if lastTimestamp != 0 { actualFrameIntervals.append(l.timestamp - lastTimestamp) }
        lastTimestamp = l.timestamp
    }

    private func stopFrameCapture(notify: Bool) {
        stopItem?.cancel()
        stopItem = nil
        link?.invalidate()
        link = nil
        if notify { onFrameCaptureFinished?() }
    }
}

// MARK: - Report

struct ProbePress: Codable {
    let index: Int
    let touchToHapticMs: Double?
    let hapticEvent: String?
    let touchToVisualMs: Double?
    let visualUnit: String?
}

struct ProbeFrames: Codable {
    let sampleCount: Int
    let expectedMaxMs: Double
    let expectedP95Ms: Double
    let actualMaxMs: Double
    let actualP95Ms: Double
    /// As specified. Only meaningful on a 120 Hz display: on a 60 Hz one EVERY interval is
    /// ~16.67 ms, so this counts all of them. Read `droppedFrames` instead on 60 Hz.
    let actualFramesOver8_33Ms: Int
    /// What the display actually promises, taken from the display link itself rather than assumed.
    let nominalIntervalMs: Double
    /// Intervals longer than 1.5 × nominal: a frame the display asked for and did not get.
    let droppedFrames: Int
}

struct ProbeReport: Codable {
    let generatedAt: String
    let host: String
    let systemVersion: String
    let isSimulator: Bool
    let hapticPlaybackAvailable: Bool
    let hapticsDisabled: Bool
    let note: String
    let presses: [ProbePress]
    let frames: ProbeFrames?
}

enum ProbeMath {
    static func p95(_ xs: [Double]) -> Double {
        guard !xs.isEmpty else { return 0 }
        let sorted = xs.sorted()
        let idx = min(sorted.count - 1, max(0, Int((0.95 * Double(sorted.count)).rounded(.up)) - 1))
        return sorted[idx]
    }
}

// MARK: - Panel model (cold path)

/// Everything here runs *after* a run, never during one.
@MainActor
final class ProbeModel: ObservableObject {
    @Published private(set) var report: ProbeReport?
    @Published private(set) var lastWrittenPath: String?

    private static let isSimulator: Bool = {
        #if targetEnvironment(simulator)
        return true
        #else
        return false
        #endif
    }()

    init() {
        ProbeRecorder.shared.onFrameCaptureFinished = { [weak self] in self?.refresh() }
    }

    func refresh() {
        report = Self.build()
    }

    private static func build() -> ProbeReport {
        let rec = ProbeRecorder.shared
        let touches = rec.touches
        var presses: [ProbePress] = []
        presses.reserveCapacity(touches.count)

        for (i, t0) in touches.enumerated() {
            // The window for this press ends where the next press begins, and starts ONE FRAME
            // BEFORE t0. That lookback is not slack, it is the measurement's own error bar:
            // the Button's press handling (which is where WowPressStyle fires the haptic) and our
            // simultaneous DragGesture are delivered from the same touch event, and SwiftUI does
            // not promise an order between them. Without the lookback, a unit that is *faster*
            // than the probe gets its mark thrown away and the press is paired with the next
            // haptic a second later. A small negative number here is the honest reading:
            // the haptic call beat the probe's own callback.
            let lower = t0 - 0.0167
            let upper = i + 1 < touches.count ? touches[i + 1] - 0.0167 : Double.greatestFiniteMagnitude
            let h = rec.haptics.first { $0.t >= lower && $0.t < upper }
            let v = rec.visuals.first { $0.t >= lower && $0.t < upper }
            presses.append(ProbePress(
                index: i,
                touchToHapticMs: h.map { ($0.t - t0) * 1000 },
                hapticEvent: h?.name,
                touchToVisualMs: v.map { ($0.t - t0) * 1000 },
                visualUnit: v?.name
            ))
        }

        var frames: ProbeFrames?
        let expected = rec.expectedFrameIntervals
        let actual = rec.actualFrameIntervals
        if !expected.isEmpty {
            // The display's own promise: the most common expected interval, not an assumed 1/60.
            let nominal = expected.sorted()[expected.count / 2]
            frames = ProbeFrames(
                sampleCount: expected.count,
                expectedMaxMs: (expected.max() ?? 0) * 1000,
                expectedP95Ms: ProbeMath.p95(expected) * 1000,
                actualMaxMs: (actual.max() ?? 0) * 1000,
                actualP95Ms: ProbeMath.p95(actual) * 1000,
                actualFramesOver8_33Ms: actual.filter { $0 > 0.00833 }.count,
                nominalIntervalMs: nominal * 1000,
                droppedFrames: actual.filter { $0 > nominal * 1.5 }.count
            )
        }

        let fmt = ISO8601DateFormatter()
        return ProbeReport(
            generatedAt: fmt.string(from: Date()),
            host: UIDevice.current.model + " / " + UIDevice.current.name,
            systemVersion: UIDevice.current.systemVersion,
            isSimulator: isSimulator,
            hapticPlaybackAvailable: !isSimulator,
            hapticsDisabled: WowSettings.hapticsDisabled,
            note: isSimulator
                ? "Simulator: haptic playback is a no-op, but WowProbe.onHaptic still fires at the call site, so touch→haptic is a valid app-side latency. Frame times are indicative only."
                : "Device run.",
            presses: presses,
            frames: frames
        )
    }

    func json() -> String {
        if report == nil { refresh() }
        guard let report else { return "{}" }
        let enc = JSONEncoder()
        enc.outputFormatting = [.prettyPrinted, .sortedKeys]
        guard let data = try? enc.encode(report), let s = String(data: data, encoding: .utf8) else { return "{}" }
        return s
    }

    func copyJSON() {
        refresh()
        UIPasteboard.general.string = json()
    }

    /// Only ever called from the button. Never automatic.
    func writeJSON() {
        refresh()
        let path = NSTemporaryDirectory() + "wow-probe.json"
        try? json().write(toFile: path, atomically: true, encoding: .utf8)
        lastWrittenPath = path
    }
}

// MARK: - Hooks

enum ProbeHooks {
    @MainActor static func install() {
        // These two closures are the entire hot path. One array append each.
        WowProbe.onHaptic = { event, t in ProbeRecorder.shared.recordHaptic(event.rawValue, t) }
        WowProbe.onVisual = { name, t in ProbeRecorder.shared.recordVisual(name, t) }
    }

    /// Called by the demo when the reward burst is triggered.
    static func burstStarted() {
        ProbeRecorder.shared.startFrameCapture(seconds: 1.2)
    }
}

// MARK: - Touch-down capture

extension View {
    /// Records the touch-down instant for the button this is attached to.
    /// `simultaneousGesture` so the Button's own gesture (and therefore WowPressStyle) is untouched.
    func probeTouchDown() -> some View {
        simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in ProbeRecorder.shared.recordTouchDown(CACurrentMediaTime()) }
                .onEnded { _ in ProbeRecorder.shared.touchEnded() }
        )
    }
}

// MARK: - Panel

struct ProbePanel: View {
    @StateObject private var model = ProbeModel()

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("PROBE").font(.caption.weight(.bold)).foregroundStyle(.secondary)
                Spacer()
                Button("Refresh") { model.refresh() }.font(.caption)
            }

            Text(summary)
                .font(.system(.caption2, design: .monospaced))
                .frame(maxWidth: .infinity, alignment: .leading)
                .textSelection(.enabled)

            HStack(spacing: 8) {
                Button("Copy JSON") { model.copyJSON() }
                Button("Write JSON file") { model.writeJSON() }
            }
            .font(.caption)
            .buttonStyle(.bordered)

            if let path = model.lastWrittenPath {
                Text("wrote: \(path)")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(.secondary)
                    .textSelection(.enabled)
            }
        }
        .padding(12)
        .background(Color.secondary.opacity(0.10), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private var summary: String {
        guard let r = model.report else { return "no run yet — press the Wow button" }
        var lines: [String] = []
        // "@run": this is the state the measured run happened under, not the toggle's state now.
        lines.append("presses: \(r.presses.count)   sim: \(r.isSimulator)   hapticsOff@run: \(r.hapticsDisabled)")
        for p in r.presses.suffix(5) {
            let h = p.touchToHapticMs.map { String(format: "%6.2f", $0) } ?? "     -"
            let v = p.touchToVisualMs.map { String(format: "%6.2f", $0) } ?? "     -"
            lines.append("#\(p.index)  touch→haptic \(h) ms (\(p.hapticEvent ?? "-"))")
            lines.append("    touch→visual \(v) ms (\(p.visualUnit ?? "-"))")
        }
        if let f = r.frames {
            lines.append(String(format: "frames n=%d  nominal %.2f ms", f.sampleCount, f.nominalIntervalMs))
            lines.append(String(format: "  actual max %.2f  p95 %.2f  dropped %d  >8.33ms %d",
                                f.actualMaxMs, f.actualP95Ms, f.droppedFrames, f.actualFramesOver8_33Ms))
            lines.append(String(format: "  expected max %.2f  p95 %.2f", f.expectedMaxMs, f.expectedP95Ms))
        } else {
            lines.append("frames: not captured yet")
        }
        return lines.joined(separator: "\n")
    }
}

#else

// Release builds: the probe does not exist. These shims keep ContentView free of #if noise.
import SwiftUI

enum ProbeHooks {
    @inline(__always) static func install() {}
    @inline(__always) static func burstStarted() {}
}

extension View {
    @inline(__always) func probeTouchDown() -> some View { self }
}

struct ProbePanel: View {
    var body: some View { EmptyView() }
}

#endif
