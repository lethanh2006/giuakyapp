import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skipInfra = process.argv.includes("--skip-infra");

const services = [
  {
    name: "auth",
    script: "start:dev",
    portKey: "AUTH_HOST_PORT",
    defaultPort: "4000",
  },
  {
    name: "user",
    script: "dev",
    portKey: "USER_HOST_PORT",
    defaultPort: "5000",
  },
  {
    name: "mail",
    script: "dev",
    portKey: "MAIL_HOST_PORT",
    defaultPort: "5001",
  },
  {
    name: "chat",
    script: "dev",
    portKey: "CHAT_HOST_PORT",
    defaultPort: "5002",
  },
  {
    name: "todo",
    script: "dev",
    portKey: "TODO_HOST_PORT",
    defaultPort: "5003",
  },
  {
    name: "workschedule",
    script: "dev",
    portKey: "WORKSCHEDULE_HOST_PORT",
    defaultPort: "5004",
  },
  {
    name: "canteen",
    script: "start:dev",
    portKey: "CANTEEN_HOST_PORT",
    defaultPort: "5005",
  },
  {
    name: "payment",
    script: "start:dev",
    portKey: "PAYMENT_HOST_PORT",
    defaultPort: "5006",
  },
  {
    name: "gateway",
    script: "dev",
    portKey: "GATEWAY_HOST_PORT",
    defaultPort: "3000",
  },
];

function parseEnv(filePath) {
  const values = {};
  if (!existsSync(filePath)) return values;

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }

  return values;
}

function runDocker(args) {
  const result = spawnSync("docker", ["compose", ...args], {
    cwd: backendDir,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`Không chạy được Docker Compose: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runObservability(args) {
  const result = spawnSync(
    process.execPath,
    ["scripts/observability-compose.mjs", ...args],
    { cwd: backendDir, stdio: "inherit" },
  );

  if (result.error) {
    console.error(
      `Không chạy được observability stack: ${result.error.message}`,
    );
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function pipeLogs(stream, serviceName, output) {
  const lines = createInterface({ input: stream });
  lines.on("line", (line) => output.write(`[${serviceName}] ${line}\n`));
}

function isPortAvailable(portNumber) {
  return new Promise((resolvePort) => {
    const server = createServer();
    server.unref();
    server.once("error", () => resolvePort(false));
    server.listen({ host: "127.0.0.1", port: portNumber }, () => {
      server.close(() => resolvePort(true));
    });
  });
}

const rootEnv = {
  ...parseEnv(resolve(backendDir, ".env")),
  ...parseEnv(resolve(backendDir, "logger/.env")),
  ...process.env,
};
for (const requiredKey of [
  "RABBITMQ_USER",
  "RABBITMQ_PASSWORD",
  "PAYMENT_POSTGRES_USER",
  "PAYMENT_POSTGRES_PASSWORD",
  "PAYMENT_POSTGRES_DB",
  "CANTEEN_INTERNAL_SECRET",
  "PAYMENT_INTERNAL_SECRET",
]) {
  if (!rootEnv[requiredKey]) {
    console.error(`Thiếu ${requiredKey} trong backend/.env`);
    process.exit(1);
  }
}

if (!skipInfra) {
  // App containers and local apps use the same host ports, so they cannot run together.
  runDocker(["stop", ...services.map(({ name }) => name)]);
  runObservability(["up", "-d", "--wait"]);
  runDocker(["up", "-d", "--wait", "redis", "rabbitmq", "payment-postgres"]);
}

const port = (key, fallback) => rootEnv[key] || fallback;

const configuredPorts = services.map((service) => ({
  ...service,
  port: Number(port(service.portKey, service.defaultPort)),
}));
const invalidPorts = configuredPorts.filter(
  ({ port: portNumber }) =>
    !Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535,
);
if (invalidPorts.length > 0) {
  console.error(
    "Port không hợp lệ trong backend/.env: " +
      invalidPorts.map(({ portKey }) => portKey).join(", "),
  );
  process.exit(1);
}

const duplicatePorts = configuredPorts.filter(
  (service, index, all) =>
    all.findIndex(({ port: portNumber }) => portNumber === service.port) !==
    index,
);
if (duplicatePorts.length > 0) {
  console.error(
    "Các service đang được cấu hình trùng port: " +
      duplicatePorts
        .map(({ name, port: portNumber }) => `${name}:${portNumber}`)
        .join(", "),
  );
  process.exit(1);
}

const availability = await Promise.all(
  configuredPorts.map(async (service) => ({
    ...service,
    available: await isPortAvailable(service.port),
  })),
);
const busyPorts = availability.filter(({ available }) => !available);
if (busyPorts.length > 0) {
  console.error(
    "Không thể chạy local vì port đang được sử dụng: " +
      busyPorts
        .map(({ name, port: portNumber }) => `${name}:${portNumber}`)
        .join(", "),
  );
  console.error(
    "Hãy dừng tiến trình cũ hoặc đổi *_HOST_PORT trong backend/.env.",
  );
  process.exit(1);
}

const sharedLocalEnv = {
  REDIS_URL: `redis://127.0.0.1:${port("REDIS_HOST_PORT", "6379")}`,
  Rabbitmq_Host: "127.0.0.1",
  Rabbitmq_Port: port("RABBITMQ_AMQP_HOST_PORT", "5672"),
  Rabbitmq_Username: rootEnv.RABBITMQ_USER,
  Rabbitmq_Password: rootEnv.RABBITMQ_PASSWORD,
  PAYMENT_DB_HOST: "127.0.0.1",
  PAYMENT_DB_PORT: port("PAYMENT_POSTGRES_HOST_PORT", "5433"),
  PAYMENT_DB_USER: rootEnv.PAYMENT_POSTGRES_USER,
  PAYMENT_DB_PASSWORD: rootEnv.PAYMENT_POSTGRES_PASSWORD,
  PAYMENT_DB_NAME: rootEnv.PAYMENT_POSTGRES_DB,
  PAYMENT_DB_SSL: "false",
  PAYMENT_DB_RUN_MIGRATIONS: "true",
  CANTEEN_INTERNAL_SECRET: rootEnv.CANTEEN_INTERNAL_SECRET,
  CANTEEN_REQUIRE_SIGNATURE: "true",
  PAYMENT_INTERNAL_SECRET: rootEnv.PAYMENT_INTERNAL_SECRET,
  PAYMENT_REQUIRE_SIGNATURE: "true",
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
let shuttingDown = false;

function shutdown(signal = "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("\nĐang dừng các service local...");
  for (const child of children.values()) child.kill(signal);

  const forceTimer = setTimeout(() => {
    for (const child of children.values()) {
      // `child.killed` chỉ cho biết signal trước đã được gửi, không có nghĩa
      // tiến trình đã thoát. Map chỉ còn chứa các tiến trình chưa emit `exit`.
      child.kill("SIGKILL");
    }
  }, 5000);
  forceTimer.unref();
}

for (const service of services) {
  const child = spawn("npm", ["run", service.script], {
    cwd: resolve(backendDir, service.name),
    env: {
      ...process.env,
      ...sharedLocalEnv,
      NODE_ENV: "development",
      PORT: port(service.portKey, service.defaultPort),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  children.set(service.name, child);
  pipeLogs(child.stdout, service.name, process.stdout);
  pipeLogs(child.stderr, service.name, process.stderr);

  child.on("error", (error) => {
    console.error(`[${service.name}] Không khởi động được: ${error.message}`);
    shutdown();
  });
  child.on("exit", (code, signal) => {
    children.delete(service.name);
    if (!shuttingDown && code !== 0) {
      console.error(
        `[${service.name}] Đã dừng (code=${code}, signal=${signal ?? "none"})`,
      );
    }
    if (children.size === 0) process.exitCode = code ?? 0;
  });
}

console.log(
  "Các service local đang khởi động. Gateway: http://localhost:" +
    port("GATEWAY_HOST_PORT", "3000"),
);
console.log(
  "Nhấn Ctrl+C để dừng app; Redis, RabbitMQ và PostgreSQL vẫn được giữ lại.",
);

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
