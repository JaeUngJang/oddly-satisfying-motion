#!/bin/bash
# portability/run.sh — proves the Wow Units portability contract: copy WowCore.swift + a unit's
# .swift file into a fresh host and it builds with zero edits. Three deliberately different hosts:
#   ios16-uikit-mixed   iOS 16.0, UIKit AppDelegate/SceneDelegate lifecycle, no SwiftUI @main App
#   ios17-swiftui       iOS 17.0, pure SwiftUI @main App
#   with-design-system  iOS 17.0, host owns a DesignSystem.swift; units used with injected tokens only
#   swift6-strict       iOS 17.0, Swift 6 language mode + strict concurrency (new-Xcode-project reality)
#
# Never touches units/ (read-only source of truth). Copies only the four .swift files that ship
# to users — never the unit.json sidecars — into each host's Sources/Wow/.
#
# Success is decided by grepping the captured build log for "** BUILD SUCCEEDED **", never by the
# exit code of a pipeline (xcodebuild's exit status is not meaningful once output is redirected).

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UNITS_DIR="$SCRIPT_DIR/../units"
# DerivedData MUST live outside the repo: the repo path is iCloud-synced, and in-repo
# DerivedData breaks codesign.
DERIVED_DATA_ROOT="$HOME/Library/Developer/Xcode/DerivedData"
LOG_DIR="$(mktemp -d "${TMPDIR:-/tmp}/wowport-logs.XXXXXX")"

UNIT_FILES=(
  "$UNITS_DIR/_core/WowCore.swift"
  "$UNITS_DIR/press/WowPress.swift"
  "$UNITS_DIR/success-check/WowSuccessCheck.swift"
  "$UNITS_DIR/reward-burst/WowRewardBurst.swift"
)

DIRS=(ios16-uikit-mixed ios17-swiftui with-design-system swift6-strict)
SCHEMES=(WowPort1 WowPort2 WowPort3 WowPort4)
TARGETS=(16.0 17.0 17.0 "17.0 swift6")

echo "Logs: $LOG_DIR"
echo

overall_status=0
row_dir=()
row_target=()
row_result=()
row_warn=()

for i in "${!DIRS[@]}"; do
  dir="${DIRS[$i]}"
  scheme="${SCHEMES[$i]}"
  target="${TARGETS[$i]}"
  proj_dir="$SCRIPT_DIR/$dir"
  wow_dir="$proj_dir/Sources/Wow"
  log_file="$LOG_DIR/$dir.log"

  echo "=== $dir ==="

  if [[ ! -d "$wow_dir" ]]; then
    echo "  missing directory: $wow_dir"
    row_dir+=("$dir"); row_target+=("$target"); row_result+=("MISSING Sources/Wow"); row_warn+=("-")
    overall_status=1
    continue
  fi

  rm -rf "${wow_dir:?}"/*

  missing_unit=0
  for f in "${UNIT_FILES[@]}"; do
    if [[ ! -f "$f" ]]; then
      echo "  missing unit source: $f"
      missing_unit=1
      continue
    fi
    cp "$f" "$wow_dir/"
  done

  if [[ "$missing_unit" -eq 1 ]]; then
    row_dir+=("$dir"); row_target+=("$target"); row_result+=("MISSING UNIT FILES"); row_warn+=("-")
    overall_status=1
    continue
  fi

  if ! (cd "$proj_dir" && xcodegen generate) >"$log_file.xcodegen.log" 2>&1; then
    echo "  xcodegen generate failed - see $log_file.xcodegen.log"
    row_dir+=("$dir"); row_target+=("$target"); row_result+=("XCODEGEN FAILED"); row_warn+=("-")
    overall_status=1
    continue
  fi

  dd_path="$DERIVED_DATA_ROOT/WowPort-$dir"

  xcodebuild \
    -project "$proj_dir/$scheme.xcodeproj" \
    -scheme "$scheme" \
    -destination 'generic/platform=iOS Simulator' \
    -derivedDataPath "$dd_path" \
    build >"$log_file" 2>&1

  if grep -q '\*\* BUILD SUCCEEDED \*\*' "$log_file"; then
    result="SUCCESS"
  else
    result="FAILED"
    overall_status=1
  fi

  warn_count="$(grep -c 'Sources/Wow/.*warning:' "$log_file" || true)"

  row_dir+=("$dir"); row_target+=("$target"); row_result+=("$result"); row_warn+=("$warn_count")
  echo "  $result (log: $log_file)"

  if [[ "$result" == "FAILED" ]]; then
    echo "  --- error lines ---"
    grep 'error:' "$log_file" | sed 's/^/  /' || echo "  (no \"error:\" lines found; see full log)"
  fi
done

echo
printf '%-22s %-18s %-19s %s\n' "PROJECT" "DEPLOYMENT TARGET" "RESULT" "WOW/ WARNINGS"
printf '%-22s %-18s %-19s %s\n' "----------------------" "------------------" "-------------------" "-------------"
for i in "${!row_dir[@]}"; do
  printf '%-22s %-18s %-19s %s\n' "${row_dir[$i]}" "${row_target[$i]}" "${row_result[$i]}" "${row_warn[$i]}"
done

exit "$overall_status"
