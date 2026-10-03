import { randomBytes } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const supported = new Set(['--env-only', '--reset-env', '--help']);
for (const arg of args) {
  if (!supported.has(arg)) {
    console.error(`Tham số không hợp lệ: ${arg}`);
    process.exit(1);
  }
}
if (args.has('--help')) {
  console.log('npm run setup [-- --env-only] [--reset-env]');
  console.log('--env-only: chỉ tạo env, không cài dependency.');
  console.log('--reset-env: sao lưu env cũ rồi tạo lại cấu hình local và secret.');
  process.exit(0);
}
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 20 || (major === 20 && minor < 19)) {
  console.error('Cần Node.js 20.19 trở lên; khuyến nghị Node.js 22 (xem .nvmrc).');
  process.exit(1);
}

const reset = args.has('--reset-env');
const backupDir = resolve(
  rootDir,
  '.local-env-backups',
  new Date().toISOString().replace(/[:.]/g, '-'),
);
const serviceNames = [
  'auth', 'user', 'mail', 'chat', 'todo',
  'workschedule', 'canteen', 'payment', 'gateway',
];
const targets = ['backend', ...serviceNames.map((name) => `backend/${name}`), 'Nrapp'];
const secretKeys = [
  'JWT_SECRET', 'AUTH_INTERNAL_SECRET', 'USER_INTERNAL_SECRET',
  'CHAT_INTERNAL_SECRET', 'TODO_INTERNAL_SECRET',
  'WORKSCHEDULE_INTERNAL_SECRET', 'CANTEEN_INTERNAL_SECRET',
  'PAYMENT_INTERNAL_SECRET', 'CASSO_WEBHOOK_SECRET',
  'RABBITMQ_PASSWORD', 'PAYMENT_POSTGRES_PASSWORD',
];
const rootEnvPath = resolve(rootDir, 'backend/.env');
const existingRootEnv = !reset && existsSync(rootEnvPath)
  ? parseEnv(readFileSync(rootEnvPath, 'utf8'))
  : {};
const secrets = Object.fromEntries(secretKeys.map((key) => [
  key, existingRootEnv[key] || randomBytes(32).toString('hex'),
]));
let sharedValues = { ...existingRootEnv, ...secrets };

function backup(file) {
  if (!existsSync(file)) return;
  const destination = resolve(backupDir, relative(rootDir, file));
  mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
  copyFileSync(file, destination);
}

for (const target of targets) {
  const folder = resolve(rootDir, target);
  const destination = resolve(folder, '.env');
  if (reset) {
    backup(destination);
    const localOverride = resolve(folder, '.env.local');
    if (existsSync(localOverride)) {
      backup(localOverride);
      unlinkSync(localOverride);
    }
  } else if (existsSync(destination)) {
    console.log(`Giữ ${target}/.env`);
    continue;
  }
  const template = readFileSync(resolve(folder, '.env.example'), 'utf8');
  const contents = template.replace(/__([A-Z][A-Z0-9_]+)__/g, (_, key) => {
    if (!sharedValues[key]) throw new Error(`Chưa định nghĩa giá trị ${key}`);
    return sharedValues[key];
  });
  writeFileSync(destination, contents, { mode: 0o600 });
  if (target === 'backend') {
    sharedValues = { ...sharedValues, ...parseEnv(contents) };
  }
  console.log(`Tạo ${target}/.env`);
}
if (reset) console.log(`Env cũ được sao lưu tại ${relative(rootDir, backupDir)}/`);

if (!args.has('--env-only')) {
  // npm cung cấp đường dẫn CLI này trên cả Windows/macOS/Linux.
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    console.error('Hãy dùng npm run setup để cài dependency, hoặc thêm --env-only.');
    process.exit(1);
  }
  const packages = [
    'backend/logger/packages/observability',
    ...serviceNames.map((name) => `backend/${name}`),
    'Nrapp',
  ];
  for (const folder of packages) {
    console.log(`\nCài dependency: ${folder}`);
    const result = spawnSync(process.execPath, [npmCli, 'ci'], {
      cwd: resolve(rootDir, folder),
      stdio: 'inherit',
      env: process.env,
    });
    if (result.error || result.status !== 0) {
      console.error(`Không cài được dependency tại ${folder}. Kiểm tra kết nối npm rồi chạy lại npm run setup.`);
      process.exit(result.status || 1);
    }
  }
}
const finalRootEnv = parseEnv(readFileSync(rootEnvPath, 'utf8'));
if ((finalRootEnv.MONGO_MODE || 'atlas') === 'atlas') {
  console.log('\nMongoDB dùng Atlas dev chung. Điền URI do nhóm cung cấp vào MONGO_URL');
  console.log('trong backend/.env và thêm IP máy của bạn vào Atlas Network Access.');
}
console.log('\nMở hai terminal sau khi hoàn tất cấu hình MongoDB:');
console.log('  npm run dev:backend');
console.log('  npm run dev:web   (hoặc npm run dev:mobile)');
