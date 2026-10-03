const dns = require("node:dns");

const configured = (process.env.DEV_DNS_SERVERS || "").trim();
if (configured) {
  try {
    // This changes DNS resolution only in this local Node process.
    dns.setServers(configured.split(",").map((server) => server.trim()));
  } catch {
    console.error("DEV_DNS_SERVERS phải là danh sách địa chỉ IP DNS hợp lệ, ngăn cách bằng dấu phẩy.");
    process.exit(1);
  }
}
