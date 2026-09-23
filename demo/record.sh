#!/bin/bash
# demo/record.sh — records the website preview clips from the simulator and encodes them.
#   bash demo/record.sh            # all auto-run modes
#   bash demo/record.sh press 7    # one mode, custom seconds (press is tapped by hand meanwhile)
# Output: demo/recordings/<name>.raw.mov, <name>.mp4 (590px wide, h264), <name>-slow.mp4 (0.25x)
set -uo pipefail
UDID="${WOW_SIM_UDID:-7D5DEC58-48D0-4630-B2A2-D458A6B0B736}"   # iPhone 16 (iOS 18.6) by default; iPhone 17 (iOS 26) = E2E1E675-3F9F-401F-908F-03E8AE7D3DDA
BUNDLE=dev.wowunits.demo
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$HERE/recordings"; mkdir -p "$OUT"

record() {  # name seconds
  local name=$1 secs=$2
  xcrun simctl terminate "$UDID" "$BUNDLE" 2>/dev/null || true
  xcrun simctl launch "$UDID" "$BUNDLE" --record "$name" >/dev/null
  sleep 0.6
  xcrun simctl io "$UDID" recordVideo --codec h264 --force "$OUT/$name.raw.mov" >/dev/null 2>&1 &
  local pid=$!
  sleep "$secs"
  kill -INT "$pid"; wait "$pid" 2>/dev/null || true
  xcrun simctl terminate "$UDID" "$BUNDLE" 2>/dev/null || true
  echo "recorded $name ($secs s)"
}

# First timestamp after the initial idle: simctl recordVideo only emits frames when pixels change,
# so the first gap > 0.2 s in the frame list marks where the action starts.
action_start() {  # raw.mov → seconds
  ffprobe -v error -select_streams v:0 -show_entries frame=pts_time -of csv=p=0 "$1" \
    | awk '{t=$1; if (prev!="" && t-prev>0.2 && t>1.5) {print t; exit} prev=t} END{}'   # skip the launch fade (<1.5 s); auto modes act at t0=2 s after appear
}

encode() {  # name [lead] [duration]
  local name=$1 lead=${2:-0.6} dur=${3:-4.5} raw="$OUT/$1.raw.mov" cfr="$OUT/$1.cfr.mp4"
  local a; a="${WOW_ACTION_AT:-$(action_start "$raw")}"; [[ -z "$a" ]] && a=1.5   # WOW_ACTION_AT=<s> overrides detection
  local start; start="$(python3 -c "print(max(0.0, $a - $lead))")"
  # simctl writes frames only when pixels change; normalise to constant 60 fps first so a seek
  # before the action lands on the last *settled* frame (idle button), not the launch fade.
  ffmpeg -y -loglevel error -i "$raw" -vf "fps=60,scale=590:-2" -c:v libx264 -pix_fmt yuv420p -crf 18 -an "$cfr"
  ffmpeg -y -loglevel error -ss "$start" -t "$dur" -i "$cfr" \
    -vf "tpad=stop_mode=clone:stop_duration=6" -t "$dur" \
    -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart -an "$OUT/$name.mp4"
  ffmpeg -y -loglevel error -ss "$start" -t "$dur" -i "$cfr" \
    -vf "setpts=4*PTS,minterpolate='fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir',tpad=stop_mode=clone:stop_duration=20" \
    -t "$(python3 -c "print($dur*4)")" \
    -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart -an "$OUT/$name-slow.mp4"
  echo "encoded $name (action at ${a}s, trim from ${start}s) → $OUT/$name.mp4, $name-slow.mp4"
}

if [[ "${1:-}" == "encode" ]]; then
  encode "$2" "${3:-0.6}" "${4:-4.5}"
  exit 0
fi
if [[ $# -ge 1 ]]; then
  record "$1" "${2:-6}"
  exit 0
fi

# Auto-run modes: the sequence starts t0=2.0 s after appear; the app appears ~0.6–1.2 s after launch,
# so the action lands ~1.6–2.6 s into the recording. Keep 1.2 s of idle lead, hold 2.5 s after.
# recordVideo takes ~2 s to start capturing, so record 9 s to keep ~3 s of hold after the action.
for m in hero-a hero-b success-check reward-burst; do record "$m" 9; done
for m in hero-a hero-b success-check reward-burst; do encode "$m"; done
