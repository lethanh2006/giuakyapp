import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { createServer } from "node:net";
import { Resolver } from "node:dns";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { composeArguments, redactMongoUris, resolveMongoConfig } from "./mongo-config.mjs";

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const allServices = [
  { name: "auth", portKey: "AUTH_HOST_PORT", defaultPort: "4000" },
  { name: "user", portKey: "USER_HOST_PORT", defaultPort: "5000" },
  { name: "mail", portKey: "MAIL_HOST_PORT", defaultPort: "5001" },
  { name: "chat", portKey: "CHAT_HOST_PORT", defaultPort: "5002" },
  { name: "todo", portKey: "TODO_HOST_PORT", defaultPort: "5003" },
  {
    name: "workschedule",
    portKey: "WORKSCHEDULE_HOST_PORT",
    defaultPort: "5004",
  },
  { name: "canteen", portKey: "CANTEEN_HOST_PORT", defaultPort: "5005" },
  { name: "payment", portKey: "PAYMENT_HOST_PORT", defaultPort: "5006" },
  { name: "gateway", portKey: "GATEWAY_HOST_PORT", defaultPort: "3000" },
];

function readEnv(filePath) {
  return existsSync(filePath) ? parseEnv(readFileSync(filePath, "utf8")) : {};
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

let skipInfra = false;
let showHelp = false;
let requestedNames;
for (const argument of process.argv.slice(2)) {
  if (argument === "--skip-infra") skipInfra = true;
  else if (argument === "--help" || argument === "-h") showHelp = true;
  else if (argument.startsWith("--services=")) {
    if (requestedNames !== undefined) {
      fail("Chỉ truyền --services một lần, ngăn cách tên service bằng dấu phẩy.");
    }
    requestedNames = argument
      .slice("--services=".length)
      .split(",")
      .map((name) => name.trim());
    if (requestedNames.some((name) => !name)) {
      fail(
        "--services cần danh sách tên service không rỗng, ví dụ --services=auth,user,gateway.",
      );
    }
    const unknownNames = requestedNames.filter(
      (name) => !allServices.some((service) => service.name === name),
    );
    if (unknownNames.length) {
      fail(
        `Service không hợp lệ: ${[...new Set(unknownNames)].join(", ")}. Các service: ${allServices.map(({ name }) => name).join(", ")}.`,
      );
    }
  } else {
    fail(
      `Tham số không hợp lệ: ${argument}. Xem npm run dev:backend -- --help.`,
    );
  }
}

if (showHelp) {
  console.log(`Chạy backend local với Nest watch (tự tải lại khi sửa code).

Cách dùng tại thư mục gốc:
  npm run dev:backend
  npm run dev:backend -- --services=auth,user,mail,gateway
  npm run dev:backend -- --services=todo --skip-infra

  --services=<tên,tên>  Chỉ chạy các service được liệt kê; mặc định chạy tất cả.
  --skip-infra          Dùng hạ tầng Docker đã chạy, bỏ bước docker compose up.
  --help, -h           Hiện hướng dẫn này.

Các service: ${allServices.map(({ name }) => name).join(", ")}.
Không tự thêm service phụ thuộc. Tự liệt kê đủ service của luồng cần test (xem README).
MONGO_MODE=atlas dùng MongoDB Atlas dev chung; các hạ tầng khác chạy Docker local.
MONGO_MODE=local dùng thêm MongoDB trong Docker.
Nếu không dùng --skip-infra, hạ tầng Docker của chế độ đã chọn được khởi động.`);
  process.exit(0);
}

const services =
  requestedNames === undefined
    ? allServices
    : allServices.filter(({ name }) => requestedNames.includes(name));

if (!existsSync(resolve(backendDir, ".env"))) {
  fail("Chưa có backend/.env. Chạy npm run setup tại thư mục gốc trước.");
}
const rootEnv = { ...readEnv(resolve(backendDir, ".env")), ...process.env };
let mongo;
try {
  mongo = resolveMongoConfig(rootEnv);
} catch (error) {
  fail(error.message);
}
const dnsServers = (rootEnv.DEV_DNS_SERVERS || "").trim();
let dnsPreload;
if (dnsServers) {
  try {
    // Validate without performing a lookup or changing the system resolver.
    new Resolver().setServers(dnsServers.split(",").map((server) => server.trim()));
  } catch {
    fail("DEV_DNS_SERVERS phải là danh sách địa chỉ IP DNS hợp lệ, ngăn cách bằng dấu phẩy.");
  }
  dnsPreload = `--require=${JSON.stringify(resolve(backendDir, "scripts/dev-dns.cjs"))}`;
}
for (const key of [
  "JWT_SECRET",
  "RABBITMQ_USER",
  "RABBITMQ_PASSWORD",
  "PAYMENT_POSTGRES_USER",
  "PAYMENT_POSTGRES_PASSWORD",
  "PAYMENT_POSTGRES_DB",
  "AUTH_INTERNAL_SECRET",
  "USER_INTERNAL_SECRET",
  "CHAT_INTERNAL_SECRET",
  "TODO_INTERNAL_SECRET",
  "WORKSCHEDULE_INTERNAL_SECRET",
  "CANTEEN_INTERNAL_SECRET",
  "PAYMENT_INTERNAL_SECRET",
]) {
  if (!rootEnv[key]) fail(`Thiếu ${key} trong backend/.env`);
}
for (const { name } of services) {
  if (!existsSync(resolve(backendDir, name, ".env"))) {
    fail(
      `Chưa có backend/${name}/.env. Chạy npm run setup tại thư mục gốc trước.`,
    );
  }
  if (
    !existsSync(
      resolve(backendDir, name, "node_modules/@nestjs/cli/bin/nest.js"),
    )
  ) {
    fail(
      `Chưa cài dependencies cho ${name}. Chạy npm run setup tại thư mục gốc trước.`,
    );
  }
}

const port = (key, fallback) => rootEnv[key] || fallback;
const configuredPorts = services.map((service) => ({
  ...service,
  port: Number(port(service.portKey, service.defaultPort)),
}));
if (
  configuredPorts.some(
    ({ port: value }) => !Number.isInteger(value) || value < 1 || value > 65535,
  )
) {
  fail("Port service trong backend/.env phải là số nguyên từ 1 đến 65535.");
}
if (
  new Set(configuredPorts.map(({ port: value }) => value)).size !==
  services.length
) {
  fail("Các *_HOST_PORT của service trong backend/.env phải khác nhau.");
}

function isPortAvailable(value) {
  return new Promise((resolvePort) => {
    const server = createServer();
    server.unref();
    server.once("error", () => resolvePort(false));
    server.listen({ host: "127.0.0.1", port: value }, () => {
      server.close(() => resolvePort(true));
    });
  });
}
const availability = await Promise.all(
  configuredPorts.map(async (service) => ({
    ...service,
    available: await isPortAvailable(service.port),
  })),
);
const busyPorts = availability.filter(({ available }) => !available);
if (busyPorts.length) {
  fail(
    "Port đang được sử dụng: " +
      busyPorts.map(({ name, port: value }) => `${name}:${value}`).join(", ") +
      ". Dừng tiến trình cũ hoặc đổi *_HOST_PORT trong backend/.env.",
  );
}

if (!skipInfra) {
  const result = spawnSync("docker", composeArguments(mongo.mode, "up"), {
    cwd: backendDir,
    env: rootEnv,
    stdio: "inherit",
  });
  if (result.error)
    fail(`Không chạy được Docker Compose: ${result.error.message}`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const sharedLocalEnv = {
  NODE_ENV: "development",
  MONGO_MODE: mongo.mode,
  MONGO_URL: mongo.url,
  MONGO_DB_NAME: mongo.database,
  REDIS_URL: `redis://127.0.0.1:${port("REDIS_HOST_PORT", "6379")}`,
  Rabbitmq_Host: "127.0.0.1",
  Rabbitmq_Port: port("RABBITMQ_AMQP_HOST_PORT", "5672"),
  Rabbitmq_Username: rootEnv.RABBITMQ_USER,
  Rabbitmq_Password: rootEnv.RABBITMQ_PASSWORD,
  RABBITMQ_HOST: "127.0.0.1",
  RABBITMQ_PORT: port("RABBITMQ_AMQP_HOST_PORT", "5672"),
  RABBITMQ_USER: rootEnv.RABBITMQ_USER,
  RABBITMQ_PASSWORD: rootEnv.RABBITMQ_PASSWORD,
  PAYMENT_DB_HOST: "127.0.0.1",
  PAYMENT_DB_PORT: port("PAYMENT_POSTGRES_HOST_PORT", "5433"),
  PAYMENT_DB_USER: rootEnv.PAYMENT_POSTGRES_USER,
  PAYMENT_DB_PASSWORD: rootEnv.PAYMENT_POSTGRES_PASSWORD,
  PAYMENT_DB_NAME: rootEnv.PAYMENT_POSTGRES_DB,
  PAYMENT_DB_SSL: "false",
  PAYMENT_DB_RUN_MIGRATIONS: "true",
  CANTEEN_REQUIRE_SIGNATURE: "true",
  PAYMENT_REQUIRE_SIGNATURE: "true",
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: port("MAILPIT_SMTP_HOST_PORT", "1025"),
  SMTP_AUTH: "false",
  SMTP_SECURE: "false",
  SMTP_USER: "",
  SMTP_PASS: "",
  AUTH_SERVICE_URL: `http://127.0.0.1:${port("AUTH_HOST_PORT", "4000")}`,
  USER_SERVICE: `http://127.0.0.1:${port("USER_HOST_PORT", "5000")}`,
  USER_SERVICE_URL: `http://127.0.0.1:${port("USER_HOST_PORT", "5000")}`,
  CHAT_SERVICE_URL: `http://127.0.0.1:${port("CHAT_HOST_PORT", "5002")}`,
  TODO_SERVICE_URL: `http://127.0.0.1:${port("TODO_HOST_PORT", "5003")}`,
  WORKSCHEDULE_SERVICE_URL: `http://127.0.0.1:${port("WORKSCHEDULE_HOST_PORT", "5004")}`,
  CANTEEN_SERVICE_URL: `http://127.0.0.1:${port("CANTEEN_HOST_PORT", "5005")}`,
  PAYMENT_SERVICE_URL: `http://127.0.0.1:${port("PAYMENT_HOST_PORT", "5006")}`,
  LOG_FORMAT: "pretty",
  DEPLOYMENT_ENVIRONMENT: "development",
};

const children = new Map();
// The CLI can exit before its application children. Retain each group until
// shutdown finishes so those descendants still receive the forced stop.
const processGroups = new Set();
let shuttingDown = false;
let exitCode = 0;

function stopProcessGroup(pid, signal) {
  if (process.platform === "win32") {
    const result = spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
    });
    if (result.status === 0) processGroups.delete(pid);
    return;
  }
  try {
    // Stop the Nest CLI and its compiler/application subprocesses together.
    process.kill(-pid, signal);
  } catch (error) {
    if (error.code === "ESRCH") processGroups.delete(pid);
    else console.error(error.message);
  }
}

function processGroupExists(pid) {
  try {
    process.kill(process.platform === "win32" ? pid : -pid, 0);
    return true;
  } catch (error) {
    return error.code !== "ESRCH";
  }
}

function shutdown(signal = "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("\nĐang dừng các service local...");
  for (const pid of processGroups) stopProcessGroup(pid, signal);
  if (!processGroups.size) return;
  const cleanupTimer = setInterval(() => {
    for (const pid of processGroups) {
      if (!processGroupExists(pid)) processGroups.delete(pid);
    }
    if (!processGroups.size) {
      clearTimeout(forceTimer);
      clearInterval(cleanupTimer);
    }
  }, 100);
  // Keep this timer referenced even after every CLI has exited: an application
  // descendant may still be alive and ignoring the graceful stop signal.
  const forceTimer = setTimeout(() => {
    for (const pid of processGroups) stopProcessGroup(pid, "SIGKILL");
    processGroups.clear();
    clearInterval(cleanupTimer);
  }, 5000);
}

function pipeLogs(stream, name, output) {
  const lines = createInterface({ input: stream });
  lines.on("line", (line) => output.write(`[${name}] ${redactMongoUris(line)}\n`));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
for (const service of services) {
  const serviceDir = resolve(backendDir, service.name);
  const childEnv = {
    ...readEnv(resolve(serviceDir, ".env")),
    ...rootEnv,
    ...sharedLocalEnv,
    PORT: port(service.portKey, service.defaultPort),
  };
  if (dnsPreload) {
    // Nest's compiler and application subprocesses inherit NODE_OPTIONS too.
    childEnv.NODE_OPTIONS = `${childEnv.NODE_OPTIONS || ""} ${dnsPreload}`.trim();
  }
  const child = spawn(
    process.execPath,
    [
      resolve(serviceDir, "node_modules/@nestjs/cli/bin/nest.js"),
      "start",
      "--watch",
    ],
    {
      cwd: serviceDir,
      env: childEnv,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  children.set(service.name, child);
  if (child.pid) processGroups.add(child.pid);
  pipeLogs(child.stdout, service.name, process.stdout);
  pipeLogs(child.stderr, service.name, process.stderr);
  child.on("error", (error) => {
    console.error(`[${service.name}] Không khởi động được: ${error.message}`);
    children.delete(service.name);
    exitCode = 1;
    shutdown();
    if (!children.size) process.exitCode = exitCode;
  });
  child.on("exit", (code, signal) => {
    children.delete(service.name);
    if (!shuttingDown) {
      console.error(
        `[${service.name}] Đã dừng (code=${code}, signal=${signal ?? "none"})`,
      );
      exitCode = code || 1;
      shutdown();
    }
    if (!children.size) process.exitCode = exitCode;
  });
}

console.log(
  `Các service local đang khởi động: ${services.map(({ name }) => name).join(", ")}.`,
);
console.log(
  mongo.mode === "atlas"
    ? `MongoDB Atlas: database dev chung ${mongo.database}.`
    : `MongoDB Docker local: database ${mongo.database}, port ${port("MONGO_HOST_PORT", "27017")}.`,
);
if (services.some(({ name }) => name === "gateway")) {
  console.log(`Gateway: http://localhost:${port("GATEWAY_HOST_PORT", "3000")}`);
}
console.log(
  `Hộp thư OTP local: http://localhost:${port("MAILPIT_UI_HOST_PORT", "8025")}`,
);
console.log(
  "Nhấn Ctrl+C để dừng app. Dừng hạ tầng local bằng npm run infra:down; dữ liệu DB được giữ.",
);
