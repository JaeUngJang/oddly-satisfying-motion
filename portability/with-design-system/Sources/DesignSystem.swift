// DesignSystem.swift — this host's OWN tokens and button style, independent of Oddly Satisfying Motion.
// The units must adopt these via their own injected-style parameters (scale:/tint:),
// never by editing unit source.
import SwiftUI

enum DS {
    static let accent = Color(red: 0.15, green: 0.6, blue: 0.45)
    static let corner: CGFloat = 14
    static let pressScale: CGFloat = 0.94
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .background(DS.accent)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: DS.corner, style: .continuous))
    }
}
