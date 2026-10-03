#!/usr/bin/env bash
set -euo pipefail

config_file="${XDG_CONFIG_HOME:-$HOME/.config}/nrapp/loadtest.env"
scripts_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
mode="${1:-smoke}"
target_vus="${2:-10}"

if [[ "$mode" != smoke && "$mode" != load ]] || [[ ! "$target_vus" =~ ^[1-9][0-9]*$ ]] || (( $# > 2 )); then
  printf 'Usage: bash scripts/loadtest-vps.sh [smoke|load] [target_vus]\n' >&2
  exit 2
fi
if [[ ! -f "$config_file" ]]; then
  printf 'Missing config file: %s\nCreate it with BASE_URL and TOKEN.\n' "$config_file" >&2
  exit 1
fi

report_dir="${REPORT_DIR:-/tmp/nrapp-k6-reports}"
mkdir -p -- "$report_dir"
report_dir="$(cd -- "$report_dir" && pwd)"
report_name="$(date -u +%Y%m%dT%H%M%S)-${mode}-${target_vus}vu"
printf 'Report directory: %s\n' "$report_dir"

set +e
docker run --rm -i \
  --user "$(id -u):$(id -g)" \
  --env-file "$config_file" \
  -e MODE="$mode" \
  -e TARGET_VUS="$target_vus" \
  -e SMOKE_DURATION="${SMOKE_DURATION:-20s}" \
  -e RAMP_SECONDS="${RAMP_SECONDS:-60}" \
  -e HOLD_SECONDS="${HOLD_SECONDS:-180}" \
  -e DOWN_SECONDS="${DOWN_SECONDS:-30}" \
  -e PERF_TRACE="${PERF_TRACE:-0}" \
  -v "$scripts_dir:/tests:ro" \
  -v "$report_dir:/reports" \
  grafana/k6 run --summary-export="/reports/$report_name.json" /tests/loadtest.js \
  2>&1 | tee "$report_dir/$report_name.log"
test_status=${PIPESTATUS[0]}
set -e
python3 "$scripts_dir/summarize-loadtest.py" \
  "$report_dir/$report_name.json" "$mode" "$target_vus" \
  "${RAMP_SECONDS:-60}" "${HOLD_SECONDS:-180}" "$test_status"
exit "$test_status"
