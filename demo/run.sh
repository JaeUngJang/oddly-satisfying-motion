#!/usr/bin/env bash
# run.sh — generate, build, install and launch the Oddly Satisfying Motion demo on the iPhone 16 simulator.
#
# Usage:  demo/run.sh            (from anywhere; paths are resolved from the script's location)
#         WOW_SIM_UDID=... demo/run.sh   to target a different simulator
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

UDID="${WOW_SIM_UDID:-7D5DEC58-48D0-4630-B2A2-D458A6B0B736}"   # iPhone 16
BUNDLE_ID="dev.wowunits.demo"
PROJECT="$SCRIPT_DIR/WowDemo.xcodeproj"

# DerivedData MUST live outside the repo: this tree is under ~/Desktop, which is iCloud-synced,
# and iCloud's file replacement breaks codesign on the built products.
DERIVED="$HOME/Library/Developer/Xcode/DerivedData/WowDemo"
APP="$DERIVED/Build/Products/Debug-iphonesimulator/WowDemo.app"
BUILD_LOG="$DERIVED/last-build.log"

echo "==> xcodegen generate"
xcodegen generate --spec "$SCRIPT_DIR/project.yml"

echo "==> xcodebuild (derivedDataPath: $DERIVED)"
mkdir -p "$DERIVED"
set +e
xcodebuild \
  -project "$PROJECT" \
  -scheme WowDemo \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "platform=iOS Simulator,id=$UDID" \
  -derivedDataPath "$DERIVED" \
  build 2>&1 | tee "$BUILD_LOG"
# Exit status of xcodebuild itself, not of tee.
BUILD_STATUS=${PIPESTATUS[0]}
set -e

if [ "$BUILD_STATUS" -ne 0 ] || ! grep -q '\*\* BUILD SUCCEEDED \*\*' "$BUILD_LOG"; then
  echo "BUILD FAILED (status $BUILD_STATUS). Last errors:"
  grep -E "error:|warning: .*(deprecat|unavailable)" "$BUILD_LOG" | tail -30 || true
  exit 1
fi
grep '\*\* BUILD SUCCEEDED \*\*' "$BUILD_LOG"

echo "==> boot simulator $UDID"
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b >/dev/null
open -a Simulator --args -CurrentDeviceUDID "$UDID" || true

echo "==> install + launch"
xcrun simctl install "$UDID" "$APP"
xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
xcrun simctl launch "$UDID" "$BUNDLE_ID"

echo
echo "app: $APP"
echo "probe json (after pressing 'Write JSON file'):"
echo "  \$(xcrun simctl get_app_container $UDID $BUNDLE_ID data)/tmp/wow-probe.json"
