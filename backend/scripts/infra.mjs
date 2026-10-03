import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { composeArguments, resolveMongoConfig, resolveMongoMode } from "./mongo-config.mjs";

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = resolve(backendDir, ".env");
if (!existsSync(envFile)) {
  console.error("Chưa có backend/.env. Chạy npm run setup tại thư mục gốc trước.");
  process.exit(1);
}
const env = { ...parseEnv(readFileSync(envFile, "utf8")), ...process.env };
try {
  const action = process.argv[2] || "up";
  const mode = action === "up" ? resolveMongoConfig(env).mode : resolveMongoMode(env);
  const args = composeArguments(mode, action);
  const result = spawnSync("docker", args, { cwd: backendDir, env, stdio: "inherit" });
  if (result.error) throw new Error("Không chạy được Docker Compose. Kiểm tra Docker đã được cài và bật.");
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
