// swift-tools-version: 6.1
import PackageDescription

let package = Package(
    name: "AppleFoundationBridge",
    platforms: [
        .macOS(.v15)
    ],
    dependencies: [
        .package(url: "https://github.com/vapor/vapor.git", from: "4.102.0"),
    ],
    targets: [
        .executableTarget(
            name: "AppleFoundationBridge",
            dependencies: [
                .product(name: "Vapor", package: "vapor"),
            ]),
    ]
)