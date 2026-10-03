#!/usr/bin/env node

const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const EXPO_GO_PACKAGE = "host.exp.exponent";
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || "3000";
const DEVICE_TIMEOUT_MS = 120_000;
const READY_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 1_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  });
}

function requireCommand(command, args = ["version"]) {
  const result = run(command, args);

  if (result.error?.code === "ENOENT") {
    throw new Error(`Không tìm thấy lệnh ${command}. Hãy kiểm tra Android SDK trong PATH.`);
  }
}

function getConnectedDevices() {
  const result = run("adb", ["devices"]);

  if (result.status !== 0) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 2 && parts[1] === "device")
    .map(([serial]) => serial);
}

function startDefaultEmulator() {
  requireCommand("emulator", ["-version"]);

  const result = run("emulator", ["-list-avds"]);
  const avds = result.stdout
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);

  if (avds.length === 0) {
    throw new Error("Không tìm thấy Android Virtual Device (AVD). Hãy tạo emulator trước.");
  }

  const avd = process.env.EXPO_ANDROID_AVD || avds[0];
  console.log(`› Đang khởi động emulator ${avd}...`);

  const emulator = spawn("emulator", ["-avd", avd], {
    cwd: PROJECT_ROOT,
    detached: true,
    stdio: "ignore",
  });
  emulator.unref();
}

async function waitUntil(message, predicate, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return;
    }

    process.stdout.write(".");
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`${message} quá ${Math.round(timeoutMs / 1000)} giây.`);
}

async function resolveDevice() {
  let [serial] = getConnectedDevices();

  if (!serial) {
    startDefaultEmulator();
    process.stdout.write("› Đợi emulator kết nối");
    await waitUntil("Đợi emulator kết nối", () => getConnectedDevices().length > 0, DEVICE_TIMEOUT_MS);
    process.stdout.write("\n");
    [serial] = getConnectedDevices();
  }

  return serial;
}

function adb(serial, ...args) {
  return run("adb", ["-s", serial, ...args]);
}

function reverseApiPort(serial) {
  const result = adb(
    serial,
    "reverse",
    `tcp:${API_PORT}`,
    `tcp:${API_PORT}`,
  );

  if (result.status !== 0) {
    throw new Error(
      `Không thể ADB reverse cổng API ${API_PORT}: ${result.stderr.trim()}`,
    );
  }

  console.log(`› Đã ADB reverse cổng API ${API_PORT}.`);
}

async function waitForAndroidReady(serial) {
  process.stdout.write("› Đợi Android khởi động hoàn tất");
  await waitUntil(
    "Android khởi động",
    () => {
      const systemBooted = adb(serial, "shell", "getprop", "sys.boot_completed").stdout.trim();
      const deviceBooted = adb(serial, "shell", "getprop", "dev.bootcomplete").stdout.trim();
      const bootAnimation = adb(serial, "shell", "getprop", "init.svc.bootanim").stdout.trim();
      const homeActivity = adb(
        serial,
        "shell",
        "cmd",
        "package",
        "resolve-activity",
        "--brief",
        "-a",
        "android.intent.action.MAIN",
        "-c",
        "android.intent.category.HOME",
      ).stdout;

      return (
        systemBooted === "1" &&
        deviceBooted === "1" &&
        bootAnimation === "stopped" &&
        homeActivity.includes("/") &&
        !homeActivity.includes("FallbackHome")
      );
    },
    READY_TIMEOUT_MS,
  );
  process.stdout.write("\n› Đợi mạng emulator được xác thực");

  await waitUntil(
    "Mạng emulator",
    () => {
      const output = adb(serial, "shell", "dumpsys", "connectivity").stdout;
      return output
        .split(/\r?\n/)
        .some(
          (line) =>
            line.includes("NetworkAgentInfo") &&
            line.includes("CONNECTED") &&
            line.includes("INTERNET") &&
            line.includes("VALIDATED"),
        );
    },
    READY_TIMEOUT_MS,
  );
  process.stdout.write("\n");
}

function isExpoGoInstalled(serial) {
  return adb(serial, "shell", "pm", "path", EXPO_GO_PACKAGE).status === 0;
}

function getTopActivity(serial) {
  const output = adb(serial, "shell", "dumpsys", "activity", "activities").stdout;
  return output.split(/\r?\n/).find((line) => line.includes("topResumedActivity")) || "";
}

async function warmExpoGo(serial) {
  if (!isExpoGoInstalled(serial)) {
    console.log("› Expo Go chưa được cài; Expo CLI sẽ hướng dẫn cài đặt.");
    return;
  }

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    console.log(`› Làm nóng Expo Go${attempt === 2 ? " (thử lại)" : ""}...`);
    adb(serial, "shell", "am", "force-stop", EXPO_GO_PACKAGE);
    adb(
      serial,
      "shell",
      "monkey",
      "-p",
      EXPO_GO_PACKAGE,
      "-c",
      "android.intent.category.LAUNCHER",
      "1",
    );
    await sleep(8_000);

    const topActivity = getTopActivity(serial);
    if (topActivity.includes(EXPO_GO_PACKAGE) && !topActivity.includes("ErrorActivity")) {
      return;
    }
  }

  throw new Error("Expo Go vẫn mở ErrorActivity sau khi Android đã có mạng.");
}

async function startExpo() {
  const expoBinary = path.join(
    PROJECT_ROOT,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "expo.cmd" : "expo",
  );
  const expoArgs = ["start", "--localhost", "--android", ...process.argv.slice(2)];
  const child = spawn(expoBinary, expoArgs, {
    cwd: PROJECT_ROOT,
    env: process.env,
    stdio: "inherit",
  });

  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        resolve(0);
      } else {
        resolve(code ?? 1);
      }
    });
  });
}

async function main() {
  requireCommand("adb");
  const serial = await resolveDevice();
  await waitForAndroidReady(serial);
  reverseApiPort(serial);
  await warmExpoGo(serial);
  console.log("› Android và Expo Go đã sẵn sàng. Đang mở Nrapp...");
  process.exitCode = await startExpo();
}

main().catch((error) => {
  console.error(`\n✖ ${error.message}`);
  process.exitCode = 1;
});
