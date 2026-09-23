// ContentView.swift — the Wow-Press button and both trigger units read ONLY this host's DS
// tokens (DS.pressScale, DS.accent). PrimaryButtonStyle (this host's own style) is used
// side-by-side on the reset button to prove the two coexist without conflict.
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
            .wowPress(over: PrimaryButtonStyle(), scale: DS.pressScale)   // press layered on the host's own ButtonStyle

            WowSuccessCheck(trigger: done, tint: DS.accent)

            Button("Reset") {
                done = false
                claimed = false
            }
            .buttonStyle(PrimaryButtonStyle())
        }
        .padding()
        .wowRewardBurst(trigger: claimed, tint: DS.accent)
    }
}
