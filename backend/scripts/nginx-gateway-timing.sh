#!/usr/bin/env bash
# Temporary, token-free Nginx timing log to compare client and upstream latency.
set -Eeuo pipefail

site=/etc/nginx/sites-available/nrapp-api
backup="${site}.before-timing"
timing_log=/var/log/nginx/nrapp-api-timing.log
mode=${1:-preview}
if [[ "$mode" != preview && "$mode" != apply && "$mode" != restore ]] || (( $# > 1 )); then
  printf 'Usage: bash nginx-gateway-timing.sh [preview|apply|restore]\n' >&2
  exit 2
fi
if [[ "$mode" != preview && $EUID -ne 0 ]]; then
  printf 'Applying or restoring host Nginx requires root (sudo).\n' >&2
  exit 1
fi

rendered=$(mktemp)
staged=''
trap 'rm -f "$rendered"; if [[ -n "$staged" ]]; then rm -f "$staged"; fi' EXIT

if [[ "$mode" == restore ]]; then
  [[ -f "$backup" ]] || { printf 'No timing backup at %s\n' "$backup" >&2; exit 1; }
  cp -p "$site" "$rendered"
  staged=$(mktemp "${site}.staged.XXXXXX")
  cp -p "$backup" "$staged"
  mv -f "$staged" "$site"
  staged=''
  if ! nginx -t || ! systemctl reload nginx; then
    staged=$(mktemp "${site}.staged.XXXXXX")
    cp -p "$rendered" "$staged"
    mv -f "$staged" "$site"
    staged=''
    nginx -t
    systemctl reload nginx
    printf 'Restore failed; timing config reloaded.\n' >&2
    exit 1
  fi
  rm -f "$backup"
  printf 'Original Nginx config restored. Timing log kept at %s\n' "$timing_log"
  exit 0
fi

python3 - "$site" "$rendered" <<'PY'
from pathlib import Path
import sys

site, rendered = map(Path, sys.argv[1:])
source = site.read_text()
server_name = '    server_name api-vps.thanhlelmtp2006.id.vn 103.116.52.35;'
if source.count(server_name) != 2 or 'nrapp_api_timing' in source:
    raise SystemExit('Unexpected Nginx site or timing config already applied.')
format_line = ("log_format nrapp_api_timing 'rid=$upstream_http_x_request_id "
               "status=$status total=$request_time upstream=$upstream_response_time "
               "connect=$upstream_connect_time header=$upstream_header_time';\n\n")
source = format_line + source
source = source.replace(server_name, server_name +
                        '\n    access_log /var/log/nginx/nrapp-api-timing.log nrapp_api_timing;', 1)
rendered.write_text(source)
PY

if [[ "$mode" == preview ]]; then
  diff -u "$site" "$rendered" || [[ $? == 1 ]]
  exit 0
fi

[[ ! -e "$backup" ]] || { printf 'Backup already exists: %s\n' "$backup" >&2; exit 1; }
cp -p "$site" "$backup"
install -o www-data -g deploy -m 0640 /dev/null "$timing_log"
staged=$(mktemp "${site}.staged.XXXXXX")
cp -p "$site" "$staged"
cat "$rendered" > "$staged"
mv -f "$staged" "$site"
staged=''
if ! nginx -t || ! systemctl reload nginx; then
  staged=$(mktemp "${site}.staged.XXXXXX")
  cp -p "$backup" "$staged"
  mv -f "$staged" "$site"
  staged=''
  nginx -t
  systemctl reload nginx
  rm -f "$backup"
  printf 'Timing config failed; original restored.\n' >&2
  exit 1
fi
printf 'Timing log enabled at %s; run restore after measurement.\n' "$timing_log"
