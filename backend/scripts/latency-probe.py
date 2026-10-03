"""Small sequential timing probe; --remote runs it inside the deployed VPS."""
import argparse
from collections import Counter
import math
import json
import os
from pathlib import Path
import shlex
import statistics
import subprocess
import sys
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    config_home = Path(os.environ.get('XDG_CONFIG_HOME') or Path.home() / '.config')
    parser.add_argument('--config', default=str(config_home / 'nrapp/loadtest.env'))
    parser.add_argument('--base-url')
    parser.add_argument('--samples', type=int, default=3)
    parser.add_argument('--remote', action='store_true')
    parser.add_argument('--stdin-config', action='store_true', help=argparse.SUPPRESS)
    args = parser.parse_args()
    if not 1 <= args.samples <= 100:
        parser.error('--samples must be between 1 and 100')
    if args.stdin_config:
        config = json.load(sys.stdin)
    else:
        config = {}
        for line in Path(args.config).read_text().splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                key, value = line.split('=', 1)
                config[key.strip()] = value.strip()
    if not config.get('TOKEN') or '\n' in config['TOKEN'] or '\r' in config['TOKEN']:
        parser.error('Config must contain an access TOKEN on one line')

    if args.remote:
        command = 'python3 -c ' + shlex.quote(Path(__file__).read_text())
        command += ' --stdin-config --samples ' + str(args.samples)
        command += ' --base-url ' + shlex.quote(args.base_url or 'http://127.0.0.1:3000')
        # Token travels through encrypted stdin; no token file on VPS or token
        # in command arguments/logs. The remote process runs only curl GETs.
        ssh = ['ssh', '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'ConnectTimeout=10',
               '-i', str(Path.home() / '.ssh/nrapp_vps'), 'deploy@103.116.52.35', command]
        result = subprocess.run(ssh, input=json.dumps(config), text=True)
        raise SystemExit(result.returncode)

    base_url = (args.base_url or config.get('BASE_URL', '')).rstrip('/')
    if not base_url.startswith(('http://', 'https://')):
        parser.error('Supply a valid BASE_URL or --base-url')
    paths = ['/api/user/me', '/api/todo/my-tasks', '/api/chat/chat/all']
    print(f'Origin: {base_url}; sequential samples/API: {args.samples}', flush=True)
    print('Median milliseconds; WAIT includes network/proxy/backend, not backend CPU time.', flush=True)
    print(f'{"API":<26} {"HTTP":<16} {"DNS":>8} {"TCP":>8} {"TLS":>8} {"WAIT":>9} {"TOTAL":>9} {"p95":>9} {"max":>9}', flush=True)
    with tempfile.NamedTemporaryFile(mode='w', prefix='nrapp-probe-header-', suffix='.txt') as header:
        header.write('Authorization: Bearer ' + config['TOKEN'] + '\n')
        header.flush()
        failed = False
        for path in paths:
            samples = []
            statuses = Counter()
            for _ in range(args.samples):
                result = subprocess.run([
                    'curl', '--silent', '--show-error', '--max-time', '10',
                    '--header', '@' + header.name, '--output', '/dev/null',
                    '--write-out', '%{json}', base_url + path,
                ], capture_output=True, text=True)
                if result.returncode:
                    statuses['transport-error'] += 1
                    failed = True
                    continue
                data = json.loads(result.stdout)
                status = str(data['http_code'])
                statuses[status] += 1
                if status != '200':
                    failed = True
                    continue
                lookup = data['time_namelookup']
                connect = data['time_connect']
                tls = data['time_appconnect']
                samples.append({
                    'DNS': lookup * 1000,
                    'TCP': max(0, connect - lookup) * 1000,
                    'TLS': max(0, tls - connect) * 1000 if tls else 0,
                    'WAIT': max(0, data['time_starttransfer'] - data['time_pretransfer']) * 1000,
                    'TOTAL': data['time_total'] * 1000,
                })
            http = ','.join(f'{key}x{value}' for key, value in statuses.items())
            columns = [f'{statistics.median(sample[key] for sample in samples):9.2f}' if samples else f'{"N/A":>9}'
                       for key in ('DNS', 'TCP', 'TLS', 'WAIT', 'TOTAL')]
            totals = sorted(sample['TOTAL'] for sample in samples)
            columns.extend([f'{totals[math.ceil(.95 * len(totals)) - 1]:9.2f}', f'{totals[-1]:9.2f}'] if totals else [f'{"N/A":>9}'] * 2)
            print(f'{path:<26} {http:<16}' + ''.join(columns), flush=True)
    if failed:
        print('Some requests failed; only HTTP 200 responses contribute to timing medians.')
        raise SystemExit(1)


if __name__ == '__main__':
    main()
