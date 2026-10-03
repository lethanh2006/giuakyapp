#!/usr/bin/env bash
# Run on the VPS, as deploy. Changes only the gateway rate-limit settings.
set -euo pipefail
action="${1:-enable}"
if [[ "$action" != enable && "$action" != restore ]] || (( $# > 1 )); then
  printf 'Usage (on VPS): bash scripts/gateway-loadtest.sh [enable|restore]\n' >&2
  exit 2
fi
cd /opt/nrapp/backend
test -f gateway/.env
test -x /home/deploy/bin/dc
backup_file=/opt/nrapp-backups/gateway-rate-limit-before-loadtest.json
mkdir -p /opt/nrapp-backups

update_settings() {
  python3 - "$1" "$backup_file" <<'PY'
import json
import os
import re
import sys
from pathlib import Path

action, backup_name = sys.argv[1:]
env = Path('gateway/.env')
backup = Path(backup_name)
text = env.read_text()
keys = ('RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_MAX_REQUESTS')
patterns = {key: re.compile(r'^\s*(?:export\s+)?' + key + r'=.*$', re.MULTILINE) for key in keys}
if action == 'enable':
    if not backup.exists():
        previous = {key: patterns[key].findall(text) for key in keys}
        fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as stream:
            json.dump(previous, stream)
    replacement = {'RATE_LIMIT_WINDOW_MS': ['RATE_LIMIT_WINDOW_MS=60000'],
                   'RATE_LIMIT_MAX_REQUESTS': ['RATE_LIMIT_MAX_REQUESTS=300000']}
else:
    replacement = json.loads(backup.read_text())
for key in keys:
    text = patterns[key].sub('', text)
    lines = replacement[key]
    if lines:
        text = text.rstrip('\n') + '\n' + '\n'.join(lines) + '\n'
env.write_text(text)
env.chmod(0o600)
print('Gateway rate-limit configuration updated: ' + action)
PY
}

recreate_gateway() {
  /home/deploy/bin/dc config --quiet
  /home/deploy/bin/dc --profile app up -d --no-deps --force-recreate --no-build --pull never --wait gateway
}

update_settings "$action"
if ! recreate_gateway; then
  if [[ "$action" == enable ]]; then
    printf 'Gateway update failed; restoring previous settings.\n' >&2
    update_settings restore
    recreate_gateway
  fi
  exit 1
fi
if [[ "$action" == restore ]]; then
  rm -- "$backup_file"
fi

curl --fail --silent --show-error --max-time 15 \
  -D - -o /dev/null http://127.0.0.1:3000/health \
  | awk 'tolower($0) ~ /^http\/|^x-ratelimit-/ { print }'
