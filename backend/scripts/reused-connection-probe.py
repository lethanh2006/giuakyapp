"""Probe authenticated HTTP with one reused connection per route."""
import argparse
import http.client
import json
import math
import os
from pathlib import Path
import shlex
import socket
import ssl
import statistics
import subprocess
import sys
import time
from collections import Counter


DOMAIN = 'api-vps.thanhlelmtp2006.id.vn'


class LoopbackHTTPSConnection(http.client.HTTPSConnection):
    """Use VPS Nginx at 127.0.0.1 while retaining the public host and SNI."""

    def connect(self):
        self.sock = socket.create_connection(('127.0.0.1', 443), self.timeout)
        self.sock = self._context.wrap_socket(self.sock, server_hostname=DOMAIN)


def measure(token, remote, tunnel, nginx_loopback, samples):
    host = '127.0.0.1' if remote or tunnel else DOMAIN
    if remote:
        factory = lambda: http.client.HTTPConnection(host, 3000, timeout=10)
    elif tunnel:
        factory = lambda: http.client.HTTPConnection(host, 13000, timeout=10)
    elif nginx_loopback:
        factory = lambda: LoopbackHTTPSConnection(DOMAIN, timeout=10, context=ssl.create_default_context())
    else:
        factory = lambda: http.client.HTTPSConnection(host, timeout=10)
    routes = ['/api/user/me', '/api/todo/my-tasks', '/api/chat/chat/all']
    origin = ('VPS direct gateway' if remote else
              'VPS loopback Nginx HTTPS' if nginx_loopback else
              'SSH tunnel to gateway' if tunnel else 'public HTTPS')
    print(f'Origin: {origin}; {samples} sequential requests/API, connection reused', flush=True)
    for route in routes:
        connection = factory()
        timings = []
        statuses = Counter()
        for _ in range(samples):
            start = time.perf_counter()
            try:
                connection.request('GET', route, headers={'Authorization': 'Bearer ' + token})
                response = connection.getresponse()
                response.read()
                statuses[str(response.status)] += 1
                timings.append((time.perf_counter() - start) * 1000)
            except Exception as error:
                statuses[type(error).__name__] += 1
                connection.close()
                connection = factory()
            time.sleep(.1)
        connection.close()
        timings.sort()
        result = {'route': route, 'statuses': dict(statuses), 'samples': len(timings)}
        if timings:
            result.update(median_ms=statistics.median(timings),
                          p95_ms=timings[math.ceil(.95 * len(timings)) - 1],
                          p99_ms=timings[math.ceil(.99 * len(timings)) - 1], max_ms=timings[-1])
        print(json.dumps(result), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    config_home = Path(os.environ.get('XDG_CONFIG_HOME') or Path.home() / '.config')
    parser.add_argument('--config', default=str(config_home / 'nrapp/loadtest.env'))
    parser.add_argument('--samples', type=int, default=60)
    parser.add_argument('--remote', action='store_true')
    parser.add_argument('--tunnel', action='store_true')
    parser.add_argument('--nginx-loopback', action='store_true')
    parser.add_argument('--stdin-token', action='store_true', help=argparse.SUPPRESS)
    args = parser.parse_args()
    if sum([args.remote, args.tunnel, args.nginx_loopback]) > 1:
        parser.error('Select at most one connection route')
    if not 1 <= args.samples <= 100:
        parser.error('--samples must be between 1 and 100')
    if args.stdin_token:
        token = sys.stdin.read().strip()
    else:
        config = {}
        for line in Path(args.config).read_text().splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                key, value = line.split('=', 1)
                config[key.strip()] = value.strip()
        token = config.get('TOKEN', '')
    if not token or '\n' in token or '\r' in token:
        parser.error('Missing access TOKEN')
    if (args.remote or args.nginx_loopback) and not args.stdin_token:
        command = 'python3 -c ' + shlex.quote(Path(__file__).read_text())
        command += ' --stdin-token ' + ('--remote' if args.remote else '--nginx-loopback')
        command += ' --samples ' + str(args.samples)
        ssh = ['ssh', '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'ConnectTimeout=10',
               '-i', str(Path.home() / '.ssh/nrapp_vps'), 'deploy@103.116.52.35', command]
        raise SystemExit(subprocess.run(ssh, input=token, text=True).returncode)
    measure(token, args.remote, args.tunnel, args.nginx_loopback, args.samples)


if __name__ == '__main__':
    main()
