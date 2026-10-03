import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const loggerEnv = parseEnv(resolve(backendDir, "logger/.env"));
const rootEnv = parseEnv(resolve(backendDir, ".env"));
const env = { ...loggerEnv, ...rootEnv, ...process.env };
const prometheusUrl = `http://127.0.0.1:${env.PROMETHEUS_HOST_PORT || "9090"}`;
const grafanaUrl = `http://127.0.0.1:${env.GRAFANA_HOST_PORT || "3001"}`;

await requireOk(`${prometheusUrl}/-/ready`, "Prometheus");
await requireOk(`${grafanaUrl}/api/health`, "Grafana");

const targets = await getJson(`${prometheusUrl}/api/v1/targets`);
const nodeExporter = targets.data?.activeTargets?.find(
  (target) => target.labels?.job === "node-exporter",
);
if (nodeExporter?.health !== "up") {
  throw new Error("Target node-exporter chưa UP trong Prometheus");
}

for (const metric of [
  "node_cpu_seconds_total",
  "node_memory_MemTotal_bytes",
  "node_filesystem_size_bytes",
]) {
  const result = await getJson(
    `${prometheusUrl}/api/v1/query?query=${encodeURIComponent(metric)}`,
  );
  if (!Array.isArray(result.data?.result) || result.data.result.length === 0) {
    throw new Error(`Prometheus chưa thu được metric ${metric}`);
  }
}

console.log("Monitoring smoke test đạt: Prometheus, Grafana, CPU, RAM và đĩa.");

async function requireOk(url, name) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) {
    throw new Error(`${name} trả HTTP ${response.status}`);
  }
}

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) {
    throw new Error(`${url} trả HTTP ${response.status}`);
  }
  const body = await response.json();
  if (body.status !== "success") {
    throw new Error(`${url} không trả trạng thái success`);
  }
  return body;
}

function parseEnv(filePath) {
  if (!existsSync(filePath)) return {};
  return Object.fromEntries(
    readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }),
  );
}
