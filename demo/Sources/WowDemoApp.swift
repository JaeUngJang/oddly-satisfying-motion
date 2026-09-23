// WowDemoApp.swift — entry point for the Wow Units demo / measurement harness.

import SwiftUI

@main
struct WowDemoApp: App {
    init() {
        // Installs WowProbe.onHaptic / onVisual handlers. No-op in release builds.
        ProbeHooks.install()
    }

    var body: some Scene {
        WindowGroup {
            root
        }
    }

    /// `--record <mode>` opens a clean recording screen (see RecordView.swift); otherwise the demo.
    @ViewBuilder private var root: some View {
        let args = CommandLine.arguments
        if let i = args.firstIndex(of: "--record"), i + 1 < args.count,
           let mode = RecordView.Mode(rawValue: args[i + 1]) {
            RecordView(mode: mode)
        } else {
            ContentView()
        }
    }
}
