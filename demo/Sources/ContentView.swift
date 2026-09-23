// ContentView.swift — the whole demo: one screen, two columns, same recipe, same timing.
//
//   A · AI default — what a code assistant emits by default for "add a subscribe button":
//                    a plain Button + .borderedProminent, a spinner, a static result.
//                    No touch-down feedback, no haptics, no reward.
//   B · Wow        — the same button wearing the units:
//                    .wowPress() on touch-down → ProgressView (0.6 s) → WowSuccessCheck in the
//                    label → .wowRewardBurst fired 0.35 s after the check starts.
//
// Both columns run the identical state machine and the identical delays, so the only variable
// is the units.

import SwiftUI

struct ContentView: View {

    enum Stage: Equatable { case idle, loading, done }

    /// Stand-in for the network call. The loading-morph unit is not in this slice, so this is a
    /// plain ProgressView in both columns.
    private static let loadingSeconds: Double = 0.6
    /// The check takes ~0.35 s to draw; the burst lands as it completes.
    private static let checkToBurstSeconds: Double = 0.35

    @State private var stageA: Stage = .idle
    @State private var stageB: Stage = .idle
    @State private var checkTrigger = false
    @State private var burstTrigger = false
    /// Invalidates in-flight delayed work after Reset.
    @State private var runID = 0

    @State private var hapticsOn = true
    @State private var slowMotion = false

    /// Slow motion scales the DEMO's own delays only. See the note under the toggle.
    private var timeScale: Double { slowMotion ? 4 : 1 }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                header
                HStack(alignment: .top, spacing: 14) {
                    columnA
                    columnB
                }
                controls
                ProbePanel()
            }
            .padding(18)
        }
        .onAppear { WowSettings.hapticsDisabled = !hapticsOn }
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Wow Units").font(.title2.weight(.semibold))
            Text("Same button, same timing. One wears the units.")
                .font(.footnote).foregroundStyle(.secondary)
        }
    }

    // MARK: - Column A (AI default)

    private var columnA: some View {
        VStack(spacing: 10) {
            columnTitle("A · AI default", "plain Button\nno haptics")
            Button(action: startA) {
                labelContent(stage: stageA, wow: false)
                    .frame(maxWidth: .infinity, minHeight: 22)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Column B (Wow)

    private var columnB: some View {
        VStack(spacing: 10) {
            columnTitle("B · Wow", "press · success-check\nreward-burst")
            Button(action: startB) {
                labelContent(stage: stageB, wow: true)
                    .frame(maxWidth: .infinity, minHeight: 22)
                    .prominentCTABackground()
            }
            .wowPress()
            // Before the burst wrapper, so the gesture's hit area is the button and nothing else.
            .probeTouchDown()
            .wowRewardBurst(trigger: burstTrigger, tint: .accentColor)
        }
        .frame(maxWidth: .infinity)
    }

    @ViewBuilder
    private func labelContent(stage: Stage, wow: Bool) -> some View {
        switch stage {
        case .idle:
            Text("Subscribe")
        case .loading:
            ProgressView().progressViewStyle(.circular).tint(.white)
        case .done:
            if wow {
                WowSuccessCheck(trigger: checkTrigger, size: 22, lineWidth: 3, tint: .white)
            } else {
                Image(systemName: "checkmark").font(.body.weight(.semibold))
            }
        }
    }

    private func columnTitle(_ title: String, _ subtitle: String) -> some View {
        VStack(spacing: 2) {
            Text(title).font(.subheadline.weight(.semibold))
            Text(subtitle)
                .font(.caption2).foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Controls

    private var controls: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button("Reset", action: reset)
                .buttonStyle(.bordered)

            Toggle("Haptics", isOn: $hapticsOn)
                .onChange(of: hapticsOn) { on in WowSettings.hapticsDisabled = !on }

            Toggle("Slow motion 0.25×", isOn: $slowMotion)
            Text("Slow motion scales the demo's own delays (label → loading → check → burst) by 4×. "
                 + "The units' own SwiftUI animations still run at 1×: SwiftUI has no public way to "
                 + "slow animations globally, and this demo does not touch private API.")
                .font(.caption2).foregroundStyle(.secondary)
        }
        .font(.subheadline)
    }

    // MARK: - Recipe

    private func startA() {
        guard stageA == .idle else { return }
        runID += 1
        let id = runID
        stageA = .loading
        after(Self.loadingSeconds) {
            guard id == runID else { return }
            stageA = .done
        }
    }

    private func startB() {
        guard stageB == .idle else { return }
        runID += 1
        let id = runID
        stageB = .loading
        after(Self.loadingSeconds) {
            guard id == runID else { return }
            stageB = .done
            // The check must mount with trigger == false and flip to true one tick later, so the
            // unit always sees a genuine false → true edge no matter how it starts itself.
            DispatchQueue.main.async {
                guard id == runID else { return }
                checkTrigger = true
            }
            after(Self.checkToBurstSeconds) {
                guard id == runID else { return }
                burstTrigger = true
                ProbeHooks.burstStarted()
            }
        }
    }

    private func reset() {
        runID += 1
        stageA = .idle
        stageB = .idle
        checkTrigger = false
        burstTrigger = false
    }

    private func after(_ seconds: Double, _ body: @escaping () -> Void) {
        DispatchQueue.main.asyncAfter(deadline: .now() + seconds * timeScale, execute: body)
    }
}

// MARK: - Shared CTA look

private extension View {
    /// SwiftUI resolves only ONE ButtonStyle per Button — the one closest to it — so column B
    /// cannot use `.borderedProminent` and `.wowPress()` at the same time. This reproduces the
    /// iOS 26 `.borderedProminent` + `.controlSize(.large)` appearance (capsule, solid tint; verified on the iPhone 17 simulator) on B's label so the two
    /// columns look the same and the only difference is the behaviour.
    /// The 15 pt vertical padding is not a guess: it is what makes B measure the same 52 pt as A
    /// in a screenshot diff.
    func prominentCTABackground() -> some View {
        self
            .font(.body)                       // .borderedProminent uses regular weight, not semibold
            .foregroundStyle(.white)
            .padding(.vertical, 15)
            .padding(.horizontal, 20)
            .background(Color.accentColor, in: Capsule())
    }
}
