// ContractTests.swift — enforces the Wow Units "portability contract":
// each unit is ONE self-contained Swift file, depends only on WowCore.swift,
// requires no app configuration, and declares budgets that match its unit.json.
//
// These tests read units/ directly from disk (located via #filePath) rather than
// through SwiftPM resources, so they stay in sync with the source of truth even
// though unit.json files are excluded from the WowUnits target.

import Foundation
import XCTest
@testable import WowUnits

final class ContractTests: XCTestCase {

    // MARK: - Paths

    /// Package root, derived from this file's location. This file lives at
    /// Tests/WowUnitsTests/ContractTests.swift, two directories below the package root.
    private static let packageRoot: URL = {
        URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent() // Tests/WowUnitsTests
            .deletingLastPathComponent() // Tests
            .deletingLastPathComponent() // package root
    }()

    private static let unitsDir = packageRoot.appendingPathComponent("units", isDirectory: true)

    // MARK: - JSON models (mirror unit.json / index.json; extra JSON keys are ignored)

    private struct UnitJSON: Decodable {
        struct Spec: Decodable {
            let hapticBudgetMs: Int
            let visualBudgetMs: Int
            let hapticMaxDurationMs: Int
        }
        struct Platforms: Decodable {
            struct SwiftUIPlatform: Decodable {
                let file: String
                let minIOS: Int
                let entry: String
            }
            let swiftui: SwiftUIPlatform
        }
        let id: String
        let core: String
        let platforms: Platforms
        let spec: Spec
    }

    private struct IndexJSON: Decodable {
        let version: Int
        let core: String
        let units: [String]
    }

    private enum ContractTestError: Error, CustomStringConvertible {
        case unmappedUnit(String)
        var description: String {
            switch self {
            case .unmappedUnit(let id):
                return "No Swift spec mapping for unit id '\(id)' in ContractTests.swiftSpec(for:) — add a case."
            }
        }
    }

    // MARK: - Decoding helpers

    private static func decodeIndex() throws -> IndexJSON {
        let data = try Data(contentsOf: unitsDir.appendingPathComponent("index.json"))
        return try JSONDecoder().decode(IndexJSON.self, from: data)
    }

    private static func decodeUnitJSON(id: String) throws -> UnitJSON {
        let url = unitsDir.appendingPathComponent(id).appendingPathComponent("unit.json")
        let data = try Data(contentsOf: url)
        return try JSONDecoder().decode(UnitJSON.self, from: data)
    }

    /// Maps a unit id to its Swift `static let spec`. A unit added to index.json without a case
    /// here fails loudly (via the thrown error) instead of silently skipping validation.
    private static func swiftSpec(for id: String) throws -> WowSpec {
        switch id {
        case "press": return WowPressStyle.spec
        case "success-check": return WowSuccessCheck.spec
        case "reward-burst": return WowRewardBurst.spec
        default:
            throw ContractTestError.unmappedUnit(id)
        }
    }

    /// unit.json's "entry" field is like "WowPressStyle / .wowPress()" or just "WowSuccessCheck".
    /// The primary type name is the part before the first "/".
    private static func primaryTypeName(fromEntry entry: String) -> String {
        let first = entry.components(separatedBy: "/").first ?? entry
        return first.trimmingCharacters(in: .whitespaces)
    }

    /// Module names from every top-level `import X` line in a source file (comments stripped).
    private static func importedModules(in source: String) -> [String] {
        source
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { $0.hasPrefix("import ") }
            .map { line -> String in
                var rest = String(line.dropFirst("import ".count))
                if let commentRange = rest.range(of: "//") {
                    rest = String(rest[rest.startIndex..<commentRange.lowerBound])
                }
                return rest.trimmingCharacters(in: .whitespaces)
            }
    }

    // MARK: - 1. Spec sync
    // Every unit's unit.json spec must match the Swift `static let spec` it ships.

    func testSpecsMatchUnitJSON() throws {
        let index = try Self.decodeIndex()
        XCTAssertFalse(index.units.isEmpty, "index.json declares no units")

        for id in index.units {
            let unitJSON = try Self.decodeUnitJSON(id: id)
            let actual = try Self.swiftSpec(for: id)

            XCTAssertEqual(actual.id, unitJSON.id,
                           "\(id): WowSpec.id ('\(actual.id)') does not match unit.json id ('\(unitJSON.id)')")
            XCTAssertEqual(actual.minIOS, unitJSON.platforms.swiftui.minIOS,
                           "\(id): WowSpec.minIOS does not match unit.json platforms.swiftui.minIOS")
            XCTAssertEqual(actual.hapticBudgetMs, unitJSON.spec.hapticBudgetMs,
                           "\(id): WowSpec.hapticBudgetMs does not match unit.json spec.hapticBudgetMs")
            XCTAssertEqual(actual.visualBudgetMs, unitJSON.spec.visualBudgetMs,
                           "\(id): WowSpec.visualBudgetMs does not match unit.json spec.visualBudgetMs")
            XCTAssertEqual(actual.hapticMaxDurationMs, unitJSON.spec.hapticMaxDurationMs,
                           "\(id): WowSpec.hapticMaxDurationMs does not match unit.json spec.hapticMaxDurationMs")
        }
    }

    // MARK: - 2. Budgets within evidence windows
    //
    // Tactile feedback within 5–50 ms and visual feedback within 30–85 ms of touch reads as
    // simultaneous (Kaaresoja, Brewster & Lantz, ACM TAP 11(2), 2014). The 400 ms cap on the
    // longest haptic pattern comes from Hampton & Hildebrand (J. Consumer Research, 2026), where
    // a 3,200 ms reward vibration tested worse than no vibration at all.

    func testBudgetsWithinEvidenceWindows() {
        let specs: [WowSpec] = [WowPressStyle.spec, WowSuccessCheck.spec, WowRewardBurst.spec]
        XCTAssertEqual(Set(specs.map(\.id)).count, specs.count, "Duplicate unit ids among specs under test")

        for spec in specs {
            XCTAssertLessThanOrEqual(spec.hapticBudgetMs, 50,
                "\(spec.id): hapticBudgetMs \(spec.hapticBudgetMs) exceeds the 50ms tactile window")
            XCTAssertLessThanOrEqual(spec.visualBudgetMs, 85,
                "\(spec.id): visualBudgetMs \(spec.visualBudgetMs) exceeds the 85ms visual window")
            XCTAssertLessThanOrEqual(spec.hapticMaxDurationMs, 400,
                "\(spec.id): hapticMaxDurationMs \(spec.hapticMaxDurationMs) exceeds the 400ms cap")
        }
    }

    // MARK: - 3. Self-containment (static scan)
    // Every unit file may only import whitelisted frameworks, must not reach into app
    // configuration (environment objects, Bundle.main, AppDelegate, UIApplication delegate),
    // must not import WowUnits itself, and must not reference another unit's primary type.

    func testUnitsAreSelfContained() throws {
        let index = try Self.decodeIndex()
        let whitelist: Set<String> = ["SwiftUI", "UIKit", "CoreHaptics", "QuartzCore", "Foundation"]
        let forbidden = ["@EnvironmentObject", "Bundle.main", "AppDelegate", "UIApplication.shared.delegate", "import WowUnits"]

        var sources: [String: (source: String, file: String)] = [:]
        var primaryTypeNames: [String: String] = [:]

        for id in index.units {
            let unitJSON = try Self.decodeUnitJSON(id: id)
            let fileName = unitJSON.platforms.swiftui.file
            let fileURL = Self.unitsDir.appendingPathComponent(id).appendingPathComponent(fileName)
            let source = try String(contentsOf: fileURL, encoding: .utf8)
            sources[id] = (source, fileName)
            primaryTypeNames[id] = Self.primaryTypeName(fromEntry: unitJSON.platforms.swiftui.entry)
        }

        for id in index.units {
            guard let (source, fileName) = sources[id] else { continue }
            let location = "\(id)/\(fileName)"

            for module in Self.importedModules(in: source) {
                XCTAssertTrue(whitelist.contains(module),
                    "\(location): imports non-whitelisted module '\(module)'")
            }

            for token in forbidden {
                XCTAssertFalse(source.contains(token),
                    "\(location): contains forbidden reference '\(token)'")
            }

            for (otherId, typeName) in primaryTypeNames where otherId != id {
                XCTAssertFalse(source.contains(typeName),
                    "\(location): references '\(typeName)', the primary type of unit '\(otherId)' — units must be self-contained")
            }
        }
    }

    // MARK: - 4. Index integrity

    func testIndexIntegrity() throws {
        let fm = FileManager.default
        let contents = try fm.contentsOfDirectory(at: Self.unitsDir, includingPropertiesForKeys: [.isDirectoryKey])

        let unitDirURLs = contents.filter { url in
            (try? url.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory == true
                && url.lastPathComponent != "_core"
        }
        let dirNames = Set(unitDirURLs.map { $0.lastPathComponent })

        let index = try Self.decodeIndex()
        let indexNames = Set(index.units)

        XCTAssertEqual(dirNames, indexNames,
            "units/ subdirectories \(dirNames) do not match index.json units \(indexNames)")

        for dirURL in unitDirURLs {
            let unitJSONPath = dirURL.appendingPathComponent("unit.json").path
            XCTAssertTrue(fm.fileExists(atPath: unitJSONPath), "\(dirURL.lastPathComponent): missing unit.json")
        }

        for id in index.units {
            let unitJSON = try Self.decodeUnitJSON(id: id)
            XCTAssertEqual(unitJSON.core, "_core/WowCore.swift",
                "\(id): unit.json 'core' field is '\(unitJSON.core)', expected '_core/WowCore.swift'")
        }
    }

    // MARK: - 5. Core policy defaults
    // Core is main-actor isolated (units call it from view code), so these tests run on the main actor.

    @MainActor func testHapticsDisabledDefaultsToFalse() {
        XCTAssertFalse(WowSettings.hapticsDisabled,
            "WowSettings.hapticsDisabled must default to false — units stay fully usable without opt-in")
    }

    @MainActor func testProbeHooksDefaultToNil() {
        XCTAssertNil(WowProbe.onHaptic, "WowProbe.onHaptic must default to nil (zero-cost measurement hook)")
        XCTAssertNil(WowProbe.onVisual, "WowProbe.onVisual must default to nil (zero-cost measurement hook)")
    }

    @MainActor func testHapticsPlayDoesNotCrashOnSimulator() {
        // The simulator has no haptic hardware; WowHaptics must fall back silently, never crash/trap.
        WowHaptics.shared.play(.tap)
    }

    @MainActor func testHapticsPrepareIsIdempotent() {
        WowHaptics.shared.prepare()
        WowHaptics.shared.prepare()
    }
}
