// swift-tools-version:5.9
// Dev container only. Distribution is file copy (see README): users never depend on this package.
import PackageDescription

let package = Package(
    name: "WowUnits",
    platforms: [.iOS(.v16)],
    products: [.library(name: "WowUnits", targets: ["WowUnits"])],
    targets: [
        .target(
            name: "WowUnits",
            path: "units",
            exclude: [
                "index.json",
                "press/unit.json",
                "success-check/unit.json",
                "reward-burst/unit.json",
                "loading-morph/unit.json",
                "hold-fill/unit.json",
                "icon-swap/unit.json",
                "label-roll/unit.json",
                "failure-shake/unit.json",
            ]
        ),
        .testTarget(
            name: "WowUnitsTests",
            dependencies: ["WowUnits"],
            path: "Tests/WowUnitsTests"
        ),
    ]
)
