import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const gatewayDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const loggingOnly = process.argv.slice(2).includes("--logging");
const unknownArguments = process.argv
  .slice(2)
  .filter((argument) => argument !== "--logging");

if (unknownArguments.length) {
  console.error(`Unknown test arguments: ${unknownArguments.join(", ")}`);
  process.exit(1);
}

function findTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) return findTests(entryPath);
    return entry.isFile() && entry.name.endsWith(".test.js")
      ? [entryPath]
      : [];
  });
}

let tests;
try {
  tests = findTests(resolve(gatewayDir, "dist"))
    .filter(
      (file) =>
        !loggingOnly ||
        file ===
          resolve(
            gatewayDir,
            "dist/common/logging/gateway-observability.test.js",
          ),
    )
    .sort();
} catch (error) {
  console.error(`Cannot read compiled tests: ${error.message}`);
  process.exit(1);
}

if (!tests.length) {
  console.error("No compiled gateway tests found. Run npm run build first.");
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...tests], {
  cwd: gatewayDir,
  env: loggingOnly ? { ...process.env, LOG_FORMAT: "json" } : process.env,
  stdio: "inherit",
});

if (result.error) console.error(`Cannot run gateway tests: ${result.error.message}`);
process.exitCode = result.status ?? 1;
