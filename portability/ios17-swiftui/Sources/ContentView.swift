// ContentView.swift — exercises all three Wow units in a stock SwiftUI app.
import SwiftUI

struct ContentView: View {
    @State private var done = false
    @State private var claimed = false

    var body: some View {
        VStack(spacing: 32) {
            Button("Continue") {
                done.toggle()
                claimed.toggle()
            }
            .wowPress()

            WowSuccessCheck(trigger: done)
        }
        .padding()
        .wowRewardBurst(trigger: claimed)
    }
}
