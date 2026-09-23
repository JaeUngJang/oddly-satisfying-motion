// WowRewardBurst.swift — Wow Unit "reward-burst". Requires WowCore.swift in the same target.
//
// The reward comes out of the button that earned it.
//   motion        : 12–40 paper pieces, gravity 900 pt/s², mass-linked speed and drag, ~1 s and gone
//   haptic        : .burst, played BEFORE any visual work
//   timing        : haptic within 50 ms, first frame within 85 ms of the trigger
//   colour        : ONE tint, five brightness steps plus per-piece opacity. No rainbow, no images.
//   reduce motion : no particles; one soft glow pulse from the button, 0.4 s. Haptic unchanged.
//   first burst   : warmed by one invisible frame of the same Canvas, once per process
//   haptics off   : WowSettings.hapticsDisabled = true, or haptic: false
//
// Usage
//   Button("Claim") { claimed = true }.wowRewardBurst(trigger: claimed)
//   Button("Claim") { claimed = true }.wowRewardBurst(trigger: claimed, count: 32, tint: .orange)
//
// Four decisions that separate this from a particle emitter
//  1. Closed form, not integration. Drag is linear, so v' = −kv + g solves exactly:
//     p(t) = p₀ + v_t·t + (v₀ − v_t)(1 − e^(−kt))/k. Every piece is O(1) from the spawn stamp,
//     identical at 60 and 120 Hz, and nothing drifts or accumulates. One exp per piece per frame.
//  2. One random drives the rest. mass ∈ 0.7…1.3 sets both launch speed (impulse/mass) and drag
//     rate (k = coefficient/mass), so light pieces shoot out and brake while heavy ones leave
//     slowly and plough on. Visible variety from a single knob, not from a table of magic numbers.
//  3. Paper tumbles. The x-scale of each piece is |cos(spin)|, so it turns edge-on twice a
//     revolution and thins to a hairline. That flicker is what reads as paper instead of dots,
//     and it costs one cosine.
//  4. The overlay is sized by the physics. At spawn the burst solves its own envelope — apex,
//     fall and lateral reach, all closed form — so the Canvas is exactly large enough to never
//     clip and never a pixel larger. Compositing area, not draw calls, is what an overlay spends.

import SwiftUI
import UIKit

// MARK: - Unit

struct WowRewardBurst {
    static let spec = WowSpec(id: "reward-burst", minIOS: 16,
                              hapticBudgetMs: 50, visualBudgetMs: 85, hapticMaxDurationMs: 150)
}

extension View {
    /// Fires a burst from this view's top edge when `trigger` becomes true.
    /// `count` 12…40 (clamped). `duration` ~1.0 s total life.
    ///
    /// The burst is an overlay: it never affects this view's layout, never takes touches, and
    /// removes itself the moment the last piece dies. Setting `trigger` back to false mid-flight
    /// does nothing; the next false→true spawns a fresh burst.
    func wowRewardBurst(trigger: Bool, count: Int = 24, tint: Color = .accentColor,
                        duration: Double = 1.0, haptic: Bool = true) -> some View {
        modifier(WowRewardBurstModifier(trigger: trigger, count: count, tint: tint,
                                        duration: duration, haptic: haptic))
    }
}

// MARK: - Modifier

/// The first Canvas in a process pays for pipeline set-up — measured at 77–86 ms, one dropped frame.
/// It is a process cost, not a per-view one, so the first host to appear pays it for every other.
@MainActor private enum WowBurstWarmup {
    static var done = false
}

private struct WowRewardBurstModifier: ViewModifier {
    let trigger: Bool
    let count: Int
    let tint: Color
    let duration: Double
    let haptic: Bool

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var burst: WowBurst?

    func body(content: Content) -> some View {
        content
            .overlay { if let burst { WowBurstLayer(burst: burst, tint: tint) } }
            .wowOnChange(of: trigger) { on in
                guard on else { return }                            // reset mid-flight: no-op
                if haptic { WowHaptics.shared.play(.burst) }        // 1 — haptic, before any view work
                WowProbe.onVisual?("reward-burst", WowProbe.now())  // 2 — probe
                burst = WowBurst(id: (burst?.id ?? 0) &+ 1,         // 3 — spawn
                                 glow: reduceMotion, count: count, duration: duration)
            }
            .task(id: burst?.id) {
                // Last piece dead → overlay gone → TimelineView stops. Nothing loops.
                guard let burst else { return }
                let left = burst.life - Date().timeIntervalSince(burst.start)
                if left > 0 { try? await Task.sleep(nanoseconds: UInt64(left * 1_000_000_000)) }
                if !Task.isCancelled { self.burst = nil }
            }
            .onAppear {
                if haptic { WowHaptics.shared.prepare() }
                guard !WowBurstWarmup.done else { return }
                WowBurstWarmup.done = true
                // The same layer, the same TimelineView, the same draw calls — invisible, then gone
                // by the existing retirement task. No probe, no haptic: measurements stay clean.
                burst = WowBurst(id: 0, glow: reduceMotion,
                                 count: WowBurstPhysics.count.lowerBound, duration: 1, warm: true)
            }
    }
}

// MARK: - Physics

/// Every number the burst is made of, in one place. Tuned at phone scale, not in metres.
private enum WowBurstPhysics {
    static let gravity: CGFloat = 900                       // pt/s², down
    static let mass: ClosedRange<CGFloat> = 0.7...1.3
    static let drag: ClosedRange<CGFloat> = 1.6...2.4       // force coefficient; drag rate k = drag/mass
    static let impulse: ClosedRange<CGFloat> = 520...700    // pt/s at mass 1; launch speed = impulse/mass
    static let cone: ClosedRange<CGFloat> = -110...(-70)    // degrees, screen coords: −90° is straight up
    static let lateral: ClosedRange<CGFloat> = -60...60     // pt/s sideways, on top of the cone
    static let spin: ClosedRange<CGFloat> = -6...6          // rad/s
    static let edge: ClosedRange<CGFloat> = 4...7           // long edge, pt
    static let span: ClosedRange<CGFloat> = 0.75...1.0      // fraction of `duration` each piece lives
    static let alpha: ClosedRange<CGFloat> = 0.85...1.0
    static let jitter: CGFloat = 0.2                        // ± fraction of host width along the top edge
    static let seam: CGFloat = 2                            // ± pt off the edge, so there is no visible line
    static let fadeFrom: CGFloat = 0.7                      // fade over the last 30 % of each life
    static let count: ClosedRange<Int> = 12...40            // under 12 reads as a glitch, over 40 as a casino
    static let duration: ClosedRange<Double> = 0.3...3.0
    static let glowSeconds: Double = 0.4
    static let glowScale: CGFloat = 1.6
    static let glowOpacity: CGFloat = 0.5
    static let warmSeconds: Double = 0.05                   // ≥ 2 frames at 60 Hz, gone long before a tap
    static let warmOpacity: CGFloat = 0.001                 // not 0: CoreAnimation skips a 0-opacity layer,
                                                            // and skipping it is exactly what we must not do.
                                                            // 0.001 × 255 = 0.26, so it cannot tint a pixel.
    static let tumbleFloor: CGFloat = 0.12                  // edge-on paper is a hairline, not nothing
    static let driftShare: CGFloat = 0.4                    // in-plane turn runs slower than the tumble
}

/// One piece of paper. Decided once at spawn, read-only for the life of the burst.
/// The two reach coefficients fold the closed-form solution's divisions into spawn time, so a
/// frame costs one exp, one cosine and a handful of multiply-adds.
private struct WowBurstPiece {
    let fx: CGFloat         // spawn offset along the top edge, as a fraction of host width
    let y0: CGFloat         // spawn offset off the edge, pt
    let k: CGFloat          // drag rate, 1/s
    let vt: CGFloat         // terminal fall speed, pt/s  (= gravity/k)
    let ax: CGFloat         // x(t) = fx·W + ax·(1 − e^(−kt))
    let ay: CGFloat         // y(t) = y0 + vt·t + ay·(1 − e^(−kt))
    let w: CGFloat
    let h: CGFloat
    let tilt: CGFloat       // starting orientation, rad
    let spin: CGFloat       // rad/s
    let life: CGFloat       // s
    let alpha: CGFloat
    let shade: Int
    let round: Bool
}

/// How far the burst provably travels from its origin. Solved at spawn, spent on the canvas size.
private struct WowBurstEnvelope {
    var rise: CGFloat = 0    // pt above the origin
    var fall: CGFloat = 0    // pt below it
    var side: CGFloat = 0    // pt either way, velocity part only
    var jitter: CGFloat = 0  // widest spawn offset, as a fraction of host width
}

// MARK: - Burst

private struct WowBurst {
    let id: Int
    let start: Date
    let life: Double
    let glow: Bool
    let warm: Bool
    let pieces: [WowBurstPiece]
    let envelope: WowBurstEnvelope

    init(id: Int, glow: Bool, count: Int, duration: Double, warm: Bool = false) {
        typealias P = WowBurstPhysics
        self.id = id
        self.start = Date()
        self.glow = glow
        self.warm = warm
        guard !glow else {
            self.life = warm ? P.warmSeconds : P.glowSeconds
            self.pieces = []
            self.envelope = WowBurstEnvelope()
            return
        }

        let total = CGFloat(min(max(duration, P.duration.lowerBound), P.duration.upperBound))
        let n = min(max(count, P.count.lowerBound), P.count.upperBound)
        self.life = warm ? P.warmSeconds : Double(total)

        var pieces: [WowBurstPiece] = []
        pieces.reserveCapacity(n)
        var envelope = WowBurstEnvelope()

        for i in 0..<n {
            let mass = CGFloat.random(in: P.mass)
            let k = CGFloat.random(in: P.drag) / mass
            let vt = P.gravity / k
            let speed = CGFloat.random(in: P.impulse) / mass
            let angle = CGFloat.random(in: P.cone) * .pi / 180
            let vx = cos(angle) * speed + CGFloat.random(in: P.lateral)
            let vy = sin(angle) * speed                      // negative: screen y grows downward
            let ax = vx / k
            let ay = (vy - vt) / k
            let fx = CGFloat.random(in: -P.jitter...P.jitter)
            let y0 = CGFloat.random(in: -P.seam...P.seam)
            let life = CGFloat.random(in: P.span) * total
            let edge = CGFloat.random(in: P.edge)
            let round = i.isMultiple(of: 2)                  // alternating: an exact half of each, never clumped

            // Envelope, closed form. y is a valley: its minimum is the apex, where v_y = 0, i.e.
            // t* = ln(1 − v_y/v_t)/k; its maximum is at one of the two ends (a piece that dies
            // before it falls back is lowest at spawn). |ax| is the horizontal asymptote and so
            // bounds x(t) for every t. Nothing here is a guess or a safety factor.
            let apex = min(max(log(1 - vy / vt) / k, 0), life)
            let yUp = y0 + vt * apex + ay * (1 - exp(-k * apex))
            let yDown = max(y0, y0 + vt * life + ay * (1 - exp(-k * life)))
            let half = edge * 0.6 + 1                        // half-diagonal of the piece, plus antialiasing
            envelope.rise = max(envelope.rise, half - yUp)
            envelope.fall = max(envelope.fall, half + yDown)
            envelope.side = max(envelope.side, half + abs(ax))
            envelope.jitter = max(envelope.jitter, abs(fx))

            pieces.append(WowBurstPiece(fx: fx, y0: y0, k: k, vt: vt, ax: ax, ay: ay,
                                        w: round ? edge * 0.8 : edge,
                                        h: round ? edge * 0.8 : edge * 0.62,
                                        tilt: CGFloat.random(in: 0..<(2 * CGFloat.pi)),
                                        spin: CGFloat.random(in: P.spin),
                                        life: life,
                                        alpha: CGFloat.random(in: P.alpha),
                                        shade: Int.random(in: wowBurstShades.indices),
                                        round: round))
        }
        self.pieces = pieces
        self.envelope = envelope
    }

    /// The smallest canvas this burst provably fits in, in host coordinates.
    func box(host: CGSize) -> WowBurstBox {
        if glow {
            let radius = 0.5 * hypot(host.width, host.height)
            let reach = radius * WowBurstPhysics.glowScale
            return WowBurstBox(offset: CGPoint(x: host.width * 0.5 - reach,
                                               y: host.height * 0.5 - reach),
                               size: CGSize(width: 2 * reach, height: 2 * reach),
                               origin: CGPoint(x: reach, y: reach),
                               glowRadius: radius)
        }
        let reach = envelope.side + envelope.jitter * host.width
        return WowBurstBox(offset: CGPoint(x: host.width * 0.5 - reach, y: -envelope.rise),
                           size: CGSize(width: 2 * reach, height: envelope.rise + envelope.fall),
                           origin: CGPoint(x: reach, y: envelope.rise),   // the host's top edge
                           glowRadius: 0)
    }
}

/// Canvas geometry: where it sits relative to the host, how big it is, and where the burst leaves from.
private struct WowBurstBox {
    let offset: CGPoint     // canvas top-leading, in host coordinates
    let size: CGSize
    let origin: CGPoint     // emission point, in canvas coordinates
    let glowRadius: CGFloat
}

// MARK: - Colour

/// Five brightness steps off ONE tint. Everyone's confetti is a rainbow; a rainbow is a casino.
private let wowBurstShades: [CGFloat] = [0.80, 0.90, 1.00, 1.10, 1.18]

/// Built once per burst, in `body`, where the colour scheme is known — never in the render loop,
/// where a Color per piece per frame would mean thousands of allocations a second.
private func wowBurstPalette(_ tint: Color, dark: Bool) -> [Color] {
    let base = UIColor(tint).resolvedColor(with: UITraitCollection(userInterfaceStyle: dark ? .dark : .light))
    var h: CGFloat = 0, s: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
    guard base.getHue(&h, saturation: &s, brightness: &b, alpha: &a) else {
        return Array(repeating: Color(uiColor: base), count: wowBurstShades.count)
    }
    return wowBurstShades.map { step in
        // Brighter steps give up a little saturation: lit paper, not neon.
        Color(uiColor: UIColor(hue: h,
                               saturation: min(s * (step > 1 ? 2 - step : 1), 1),
                               brightness: min(b * step, 1),
                               alpha: a))
    }
}

// MARK: - Drawing

/// Unit shapes, built once. Scaling the context beats rebuilding a Path per piece per frame:
/// at 40 pieces on a 120 Hz panel that is ~4 800 allocations a second not made.
private let wowBurstChip = Path(CGRect(x: -0.5, y: -0.5, width: 1, height: 1))
private let wowBurstDot = Path(ellipseIn: CGRect(x: -0.5, y: -0.5, width: 1, height: 1))

private struct WowBurstLayer: View {
    let burst: WowBurst
    let tint: Color
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        // Everything that can be hoisted is hoisted here: this runs once per burst, the closure
        // inside TimelineView runs once per frame.
        let palette = wowBurstPalette(tint, dark: scheme == .dark)
        let ramp = Gradient(stops: [.init(color: tint, location: 0),
                                    .init(color: tint.opacity(0.45), location: 0.45),
                                    .init(color: tint.opacity(0), location: 1)])
        GeometryReader { proxy in
            let box = burst.box(host: proxy.size)
            TimelineView(.animation) { timeline in
                // rendersAsynchronously: false — this is latency work, not throughput work.
                Canvas(opaque: false, colorMode: .nonLinear, rendersAsynchronously: false) { context, _ in
                    let t = CGFloat(max(0, timeline.date.timeIntervalSince(burst.start)))
                    if burst.glow {
                        wowDrawGlow(context, t: t, at: box.origin, radius: box.glowRadius, ramp: ramp)
                    } else {
                        wowDrawPieces(context, t: t, at: box.origin,
                                      width: proxy.size.width, pieces: burst.pieces, palette: palette)
                    }
                }
            }
            .frame(width: box.size.width, height: box.size.height)
            .offset(x: box.offset.x, y: box.offset.y)
        }
        .opacity(burst.warm ? WowBurstPhysics.warmOpacity : 1)
        .allowsHitTesting(false)      // the burst is never in the way of the next tap
        .accessibilityHidden(true)    // decoration: never an element, never announced
    }
}

/// One exp, one cosine and one fill per piece. No allocation, no shadows, no blur, no per-piece gradient.
private func wowDrawPieces(_ context: GraphicsContext, t: CGFloat, at origin: CGPoint,
                           width: CGFloat, pieces: [WowBurstPiece], palette: [Color]) {
    let fadeFrom = WowBurstPhysics.fadeFrom
    let floor = WowBurstPhysics.tumbleFloor
    let drift = WowBurstPhysics.driftShare
    for piece in pieces {
        if t >= piece.life { continue }
        let decay = 1 - exp(-piece.k * t)
        let x = origin.x + piece.fx * width + piece.ax * decay
        let y = origin.y + piece.y0 + piece.vt * t + piece.ay * decay
        let age = t / piece.life
        let fade = age < fadeFrom ? 1 : (1 - age) / (1 - fadeFrom)
        let turn = piece.spin * t
        var layer = context
        layer.opacity = piece.alpha * fade
        layer.translateBy(x: x, y: y)
        layer.rotate(by: .radians(Double(piece.tilt + turn * drift)))
        layer.scaleBy(x: piece.w * max(abs(cos(piece.tilt + turn)), floor), y: piece.h)
        layer.fill(piece.round ? wowBurstDot : wowBurstChip, with: .color(palette[piece.shade]))
    }
}

/// Reduce Motion: nothing travels. One soft pulse out of the button, 0.4 s, same haptic.
private func wowDrawGlow(_ context: GraphicsContext, t: CGFloat, at origin: CGPoint,
                         radius: CGFloat, ramp: Gradient) {
    let p = min(t / CGFloat(WowBurstPhysics.glowSeconds), 1)
    let r = radius * (1 + (WowBurstPhysics.glowScale - 1) * p)
    var layer = context
    layer.opacity = WowBurstPhysics.glowOpacity * (1 - p)
    layer.fill(Path(ellipseIn: CGRect(x: origin.x - r, y: origin.y - r, width: 2 * r, height: 2 * r)),
               with: .radialGradient(ramp, center: origin, startRadius: 0, endRadius: r))
}
