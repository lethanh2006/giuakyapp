"""Measure Auth and signed internal read endpoints from the VPS gateway container."""
import argparse
import json
import os
from pathlib import Path
import shlex
import subprocess

PROGRAM = r'''
const fs = require('node:fs');
const { performance } = require('node:perf_hooks');
const { randomUUID } = require('node:crypto');
const axios = require('axios');
const { ConfigService } = require('@nestjs/config');
const { InternalRequestSignatureService } = require('./dist/common/security/internal-request-signature.service');
const config = JSON.parse(fs.readFileSync(0, 'utf8'));
const signer = new InternalRequestSignatureService(new ConfigService(process.env));
const authUrl = process.env.AUTH_SERVICE_URL || 'http://auth:4000';
let user;
async function authRead() {
  const response = await axios.post(authUrl + '/api/auth/introspect', {}, {
    headers: { Authorization: 'Bearer ' + config.token }, timeout: 10000,
  });
  if (!response.data.valid || !response.data.user) throw new Error('invalid-identity');
  user = response.data.user;
}
async function internalRead(target, origin, path) {
  const requestId = randomUUID();
  const payload = Buffer.from(JSON.stringify(user)).toString('base64');
  await axios.get(origin + path, { timeout: 10000, headers: {
    'x-request-id': requestId,
    ...signer.signUserPayload(payload, requestId, target, 'GET:' + path),
  }});
}
async function measure(stage, read) {
  const timings = [];
  let failed = 0;
  for (let i = 0; i < config.samples; i++) {
    const start = performance.now();
    try { await read(); timings.push(performance.now() - start); }
    catch { failed++; }
  }
  timings.sort((a, b) => a - b);
  const median = timings.length ? (timings[Math.floor((timings.length - 1) / 2)] + timings[Math.floor(timings.length / 2)]) / 2 : null;
  const percentile = (fraction) => timings.length ? timings[Math.ceil(fraction * timings.length) - 1] : null;
  console.log(JSON.stringify({ stage, samples: timings.length, failed,
    median_ms: median, p95_ms: percentile(.95), p99_ms: percentile(.99),
    min_ms: timings[0] ?? null, max_ms: timings.at(-1) ?? null }));
  if (failed) throw new Error('stage-request-failed');
}
async function main() {
  await measure('Auth introspection + credential DB read', authRead);
  for (const [target, fallback, path] of [
    ['user', 'http://user:5000', '/api/user/me'],
    ['todo', 'http://todo:5003', '/api/todo/my-tasks'],
    ['chat', 'http://chat:5002', '/api/chat/chat/all'],
  ]) {
    const origin = process.env[target.toUpperCase() + '_SERVICE_URL'] || fallback;
    await measure(target + ' internal read + DB (excluding Auth)', () => internalRead(target, origin, path));
  }
}
main().catch(() => { console.error('Stage probe failed; stopped.'); process.exitCode = 1; });
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    config_home = Path(os.environ.get('XDG_CONFIG_HOME') or Path.home() / '.config')
    parser.add_argument('--config', default=str(config_home / 'nrapp/loadtest.env'))
    parser.add_argument('--samples', type=int, default=5)
    args = parser.parse_args()
    if not 1 <= args.samples <= 100:
        parser.error('--samples must be between 1 and 100')
    config = {}
    for line in Path(args.config).read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            config[key.strip()] = value.strip()
    token = config.get('TOKEN', '')
    if not token or '\r' in token or '\n' in token:
        parser.error('Missing access TOKEN')
    command = 'docker exec -i nrapp-backend-gateway-1 node -e ' + shlex.quote(PROGRAM)
    ssh = ['ssh', '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'ConnectTimeout=10',
           '-i', str(Path.home() / '.ssh/nrapp_vps'), 'deploy@103.116.52.35', command]
    print('Sequential stage probe; wall time includes internal HTTP and DB. Not a load-test p99.', flush=True)
    result = subprocess.run(ssh, input=json.dumps({'token': token, 'samples': args.samples}), text=True)
    raise SystemExit(result.returncode)


if __name__ == '__main__':
    main()
