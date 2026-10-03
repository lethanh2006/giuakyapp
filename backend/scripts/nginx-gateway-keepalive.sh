#!/usr/bin/env bash
# Run on the VPS as root after reviewing the preview. Keeps WebSocket upgrades.
set -Eeuo pipefail

site=/etc/nginx/sites-available/nrapp-api
mode=${1:-preview}
if [[ "$mode" != preview && "$mode" != apply ]] || (( $# > 1 )); then
  printf 'Usage: bash nginx-gateway-keepalive.sh [preview|apply]\n' >&2
  exit 2
fi
if [[ "$mode" == apply && $EUID -ne 0 ]]; then
  printf 'Applying the Nginx change requires root (sudo).\n' >&2
  exit 1
fi

rendered=$(mktemp)
staged=''
trap 'rm -f "$rendered"; if [[ -n "$staged" ]]; then rm -f "$staged"; fi' EXIT
python3 - "$site" "$rendered" <<'PY'
from pathlib import Path
import sys

site, rendered = map(Path, sys.argv[1:])
source = site.read_text()
old_map = """map $http_upgrade $nrapp_connection_upgrade {
    default upgrade;
    '' close;
}
"""
new_map = """upstream nrapp_gateway_keepalive {
    server 127.0.0.1:3000;
    keepalive 32;
}

map $http_upgrade $nrapp_connection_upgrade {
    default upgrade;
    '' '';
}
"""
old_proxy = 'proxy_pass http://127.0.0.1:3000;'
new_proxy = 'proxy_pass http://nrapp_gateway_keepalive;'
if source.count(old_map) != 1 or source.count(old_proxy) != 1:
    raise SystemExit('Expected Nginx configuration was not found exactly once; inspect it manually.')
Path(rendered).write_text(source.replace(old_map, new_map).replace(old_proxy, new_proxy))
PY

if [[ "$mode" == preview ]]; then
  diff -u "$site" "$rendered" || [[ $? == 1 ]]
  exit 0
fi

backup="${site}.before-keepalive-$(date -u +%Y%m%dT%H%M%SZ)"
cp -p "$site" "$backup"
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
  printf 'Nginx change failed; original restored from %s\n' "$backup" >&2
  exit 1
fi
printf 'Nginx keepalive enabled. Rollback copy: %s\n' "$backup"
