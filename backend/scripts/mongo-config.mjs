const localInfrastructure = ["redis", "rabbitmq", "payment-postgres", "mailpit"];

export function resolveMongoMode(env) {
  const mode = (env.MONGO_MODE || "atlas").trim().toLowerCase();
  if (mode !== "atlas" && mode !== "local") {
    throw new Error("MONGO_MODE trong backend/.env phải là atlas hoặc local.");
  }
  return mode;
}

export function resolveMongoConfig(env) {
  const mode = resolveMongoMode(env);

  const database = (env.MONGO_DB_NAME || (mode === "local" ? "nrapp_local" : "")).trim();
  if (!database) {
    throw new Error("Thiếu MONGO_DB_NAME trong backend/.env; dùng nrapp_dev cho Atlas dev chung.");
  }
  if (/[\/\\.\s"$*<>:|?\x00]/u.test(database)) {
    throw new Error("MONGO_DB_NAME chứa ký tự không hợp lệ; dùng tên như nrapp_dev hoặc nrapp_local.");
  }

  if (mode === "local") {
    const hostPort = env.MONGO_HOST_PORT || "27017";
    if (!/^\d+$/.test(hostPort) || Number(hostPort) < 1 || Number(hostPort) > 65535) {
      throw new Error("MONGO_HOST_PORT phải là số nguyên từ 1 đến 65535.");
    }
    return {
      mode,
      database,
      url: `mongodb://127.0.0.1:${hostPort}/${database}?replicaSet=rs0&directConnection=true`,
    };
  }

  const url = env.MONGO_URL;
  if (!url || !url.startsWith("mongodb+srv://")) {
    throw new Error("MONGO_MODE=atlas cần MONGO_URL bắt đầu bằng mongodb+srv:// trong backend/.env.");
  }
  let parsed;
  let credentials;
  try {
    parsed = new URL(url);
    credentials = decodeURIComponent(`${parsed.username}:${parsed.password}`);
  } catch {
    throw new Error("MONGO_URL Atlas không hợp lệ. Kiểm tra URI và URL-encode mật khẩu.");
  }
  if (
    !parsed.username ||
    !parsed.password ||
    !parsed.hostname.endsWith(".mongodb.net") ||
    /<[^>]*>|\$\{|your[_ -]?(?:password|username)|replace[_ -]?me|changeme/i.test(credentials)
  ) {
    throw new Error("Điền tài khoản, mật khẩu và hostname Atlas thật trong MONGO_URL; không để placeholder.");
  }
  return { mode, database, url };
}

export function infrastructureServices(mode) {
  return mode === "local" ? ["mongo", ...localInfrastructure] : [...localInfrastructure];
}

export function composeArguments(mode, action) {
  const prefix = ["compose", ...(mode === "local" ? ["--profile", "local-mongo"] : [])];
  const services = infrastructureServices(mode);
  if (action === "up") return [...prefix, "up", "-d", "--wait", ...services];
  if (action === "down") return [...prefix, "down", ...services];
  if (action === "logs") return [...prefix, "logs", "--tail=100", "-f", ...services];
  throw new Error("Hạ tầng chỉ hỗ trợ up, down hoặc logs.");
}

export function redactMongoUris(line) {
  return line.replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, "[MongoDB URI đã ẩn]");
}
