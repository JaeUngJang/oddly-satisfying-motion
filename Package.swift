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
            ]
        ),
        .testTarget(
            name: "WowUnitsTests",
            dependencies: ["WowUnits"],
            path: "Tests/WowUnitsTests"
        ),
    ]
)
