import { AxiosError, isAxiosError } from "axios";

export function getAuthHeader(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  if (error.code === "ECONNABORTED") {
    return "Kết nối đến máy chủ quá thời gian. Vui lòng kiểm tra backend.";
  }

  if (!error.response) {
    return "Không thể kết nối đến máy chủ. Hãy kiểm tra Gateway và cấu hình địa chỉ API.";
  }

  const data = (error as AxiosError<{ message?: string | string[] }>).response
    ?.data;
  const message = data?.message;

  return Array.isArray(message) ? message.join("\n") : message || fallback;
}
