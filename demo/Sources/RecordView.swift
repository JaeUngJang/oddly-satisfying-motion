// RecordView.swift — clean recording screens for the website previews.
//
//   xcrun simctl launch <udid> dev.wowunits.demo --record hero-b
//
// Modes: hero-a | hero-b | press | success-check | reward-burst
// Auto-run modes start their sequence `t0` seconds after appear so clips trim deterministically.
// `press` runs nothing: it is tapped by hand while recording.

import SwiftUI

struct RecordView: View {
    enum Mode: String {
        case heroA = "hero-a", heroB = "hero-b", press, successCheck = "success-check", rewardBurst = "reward-burst"
    }
    enum Stage { case idle, loading, done }

    let mode: Mode
    private let t0: Double = 2.0

    @State private var stage: Stage = .idle
    @State private var check = false
    @State private var burst = false

    var body: some View {
        ZStack {
            Color(.systemBackground).ignoresSafeArea()
            if mode == .heroA {
                // Liquid Glass reads through to what is behind it; give it a real backdrop.
                LinearGradient(colors: [Color(.systemGray6), Color(.systemGray4)], startPoint: .top, endPoint: .bottom)
                    .ignoresSafeArea()
                Circle().fill(Color.orange.opacity(0.35)).frame(width: 260).offset(x: -90, y: -60)
                Circle().fill(Color.purple.opacity(0.30)).frame(width: 220).offset(x: 110, y: 90)
            }
            button.frame(width: 300)
        }
        .onAppear { schedule() }
    }

    private var title: String {
        switch mode {
        case .heroA, .heroB: return "Subscribe"
        case .press: return "Continue"
        case .successCheck: return "Save"
        case .rewardBurst: return "Claim"
        }
    }

    @ViewBuilder private var button: some View {
        switch mode {
        case .heroA:
            // iOS 26: the system's prominent Liquid Glass CTA. Older OS: solid prominent.
            if #available(iOS 26, *) {
                Button(action: {}) {
                    label(wow: false).frame(maxWidth: .infinity, minHeight: 22)
                }
                .buttonStyle(.glassProminent)
                .controlSize(.large)
            } else {
                Button(action: {}) {
                    label(wow: false).frame(maxWidth: .infinity, minHeight: 22)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }
        case .heroB, .press, .successCheck, .rewardBurst:
            Button(action: {}) {
                label(wow: true).frame(maxWidth: .infinity, minHeight: 22).ctaLook()
            }
            .wowPress()
            .wowRewardBurst(trigger: burst, count: 32, tint: .accentColor)
        }
    }

    @ViewBuilder private func label(wow: Bool) -> some View {
        switch stage {
        case .idle:
            Text(title)
        case .loading:
            ProgressView().progressViewStyle(.circular).tint(.white)
        case .done:
            if wow {
                WowSuccessCheck(trigger: check, size: 22, lineWidth: 3, tint: .white)
            } else {
                Image(systemName: "checkmark").font(.body.weight(.semibold))
            }
        }
    }

    private func schedule() {
        switch mode {
        case .press:
            break
        case .heroA:
            after(t0) { stage = .loading }
            after(t0 + 0.6) { stage = .done }
        case .heroB:
            after(t0) { stage = .loading }
            after(t0 + 0.6) {
                stage = .done
                DispatchQueue.main.async { check = true }   // genuine false → true edge after mount
            }
            after(t0 + 0.6 + 0.35) { burst = true }
        case .successCheck:
            after(t0) {
                stage = .done
                DispatchQueue.main.async { check = true }
            }
        case .rewardBurst:
            after(t0) { burst = true }
        }
    }

    private func after(_ seconds: Double, _ body: @escaping () -> Void) {
        DispatchQueue.main.asyncAfter(deadline: .now() + seconds, execute: body)
    }
}

private extension View {
    /// Same look as the demo's column B (a hand-built `.borderedProminent` + `.controlSize(.large)`).
    func ctaLook() -> some View {
        self
            .font(.body)
            .foregroundStyle(.white)
            .padding(.vertical, 15)
            .padding(.horizontal, 20)
            .background(Color.accentColor, in: Capsule())
    }
}
