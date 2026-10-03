import type {
  OrderPaymentStatus,
  OrderStatus,
} from "@/src/services/canteen/constant";
import { getApiErrorMessage } from "@/src/utils/apiHelper";

export const ORDER_STATUS_COLORS: Record<
  OrderStatus,
  { background: string; border: string; text: string }
> = {
  CREATED: { background: "#eff6ff", border: "#bfdbfe", text: "#2563eb" },
  COMPLETED: {
    background: "#f0fdf4",
    border: "#bbf7d0",
    text: "#15803d",
  },
  CANCELLED: {
    background: "#f8fafc",
    border: "#cbd5e1",
    text: "#64748b",
  },
};

export const PAYMENT_STATUS_COLORS: Record<
  OrderPaymentStatus,
  { background: string; text: string }
> = {
  PENDING: { background: "#fffbeb", text: "#b45309" },
  PAID: { background: "#ecfdf5", text: "#047857" },
};

export function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function shortId(value?: string | null) {
  if (!value) return "—";
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

export function getCanteenErrorMessage(error: unknown, fallback: string) {
  const roleGuardError = (
    error as { response?: { data?: { error?: unknown } } }
  )?.response?.data?.error;
  return typeof roleGuardError === "string" && roleGuardError.trim()
    ? roleGuardError
    : getApiErrorMessage(error, fallback);
}
