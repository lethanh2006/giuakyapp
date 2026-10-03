import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectName =
  process.env.OBSERVABILITY_COMPOSE_PROJECT_NAME ||
  readEnvValue(
    resolve(backendDir, ".env"),
    "OBSERVABILITY_COMPOSE_PROJECT_NAME",
  ) ||
  "nrapp-observability";
const backendProjectName =
  process.env.COMPOSE_PROJECT_NAME ||
  readEnvValue(resolve(backendDir, ".env"), "COMPOSE_PROJECT_NAME") ||
  "nrapp-backend";

if (!/^[a-z0-9][a-z0-9_-]*$/.test(projectName)) {
  console.error(
    "OBSERVABILITY_COMPOSE_PROJECT_NAME chỉ được chứa chữ thường, số, _ hoặc -",
  );
  process.exit(1);
}
if (projectName === backendProjectName) {
  console.error(
    "OBSERVABILITY_COMPOSE_PROJECT_NAME phải khác COMPOSE_PROJECT_NAME của backend",
  );
  process.exit(1);
}

const composeArgs = process.argv.slice(2);
if (composeArgs.includes("--remove-orphans")) {
  console.error(
    "Không cho phép --remove-orphans vì backend dùng chung network observability",
  );
  process.exit(1);
}

if (
  composeArgs[0] === "ps" &&
  !composeArgs.some(
    (argument) => argument === "--orphans" || argument.startsWith("--orphans="),
  )
) {
  composeArgs.push("--orphans=false");
}

const requiredVariables = [
  "GRAFANA_ADMIN_PASSWORD",
];
const missingVariables = requiredVariables.filter(
  (variableName) => !resolveEnvValue(variableName),
);
if (missingVariables.length > 0) {
  console.error(
    `Thiếu biến bắt buộc cho observability Compose: ${missingVariables.join(", ")}`,
  );
  process.exit(1);
}

const result = spawnSync(
  "docker",
  [
    "compose",
    "--project-name",
    projectName,
    "--env-file",
    ".env",
    "--env-file",
    "logger/.env",
    "-f",
    "logger/compose.yaml",
    ...composeArgs,
  ],
  {
    cwd: backendDir,
    stdio: "inherit",
    env: {
      ...process.env,
      COMPOSE_PROJECT_NAME: projectName,
      OBSERVABILITY_COMPOSE_PROJECT_NAME: projectName,
    },
  },
);

if (result.error) {
  console.error(
    `Không chạy được observability Compose: ${result.error.message}`,
  );
  process.exit(1);
}
process.exit(result.status ?? 1);

function resolveEnvValue(expectedKey) {
  return (
    process.env[expectedKey] ||
    readEnvValue(resolve(backendDir, ".env"), expectedKey) ||
    readEnvValue(resolve(backendDir, "logger/.env"), expectedKey)
  );
}

function readEnvValue(filePath, expectedKey) {
  if (!existsSync(filePath)) return undefined;

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1 || line.slice(0, separator).trim() !== expectedKey) {
      continue;
    }
    let value = line.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    return value || undefined;
  }
  return undefined;
}
