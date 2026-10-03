import axios from "axios";

const requestTimeout =
  Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS) || 10_000;

const axiosInstance = axios.create({
  timeout: requestTimeout,
  headers: { Accept: "application/json" },
});

export default axiosInstance;
