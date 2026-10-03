import {
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_PAYMENT_METHOD_LABELS,
  ORDER_STATUS_LABELS,
  type CanteenOrder,
} from "@/src/services/canteen/constant";
import {
  formatDateTime,
  formatMoney,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
} from "@/src/features/canteen/shared/model/presentation";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

type UserOrderSummaryCardProps = {
  order: CanteenOrder;
  tableName?: string;
  footer?: ReactNode;
};

export default function UserOrderSummaryCard({
  order,
  tableName,
  footer,
}: UserOrderSummaryCardProps) {
  const statusColors =
    ORDER_STATUS_COLORS[order.status] ?? ORDER_STATUS_COLORS.CANCELLED;
  const paymentColors =
    PAYMENT_STATUS_COLORS[order.paymentStatus] ?? PAYMENT_STATUS_COLORS.PENDING;

  return (
    <View className="mb-3 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <View className="flex-row items-start justify-between border-b border-slate-100 px-4 py-3.5">
        <View className="flex-1 pr-3">
          <Text className="text-base font-black text-slate-900">
            Đơn {order.orderNumber}
          </Text>
          <Text className="mt-1 text-[11px] font-semibold text-slate-400">
            {formatDateTime(order.createdAt)}
          </Text>
          <Text className="mt-1 text-[11px] font-bold text-blue-700">
            {tableName ?? (order.tableId ? "Bàn đang chọn" : "Chưa có bàn")}
          </Text>
        </View>
        <View
          className="rounded-full border px-2.5 py-1"
          style={{
            backgroundColor: statusColors.background,
            borderColor: statusColors.border,
          }}
        >
          <Text
            className="text-[10px] font-black uppercase"
            style={{ color: statusColors.text }}
          >
            {ORDER_STATUS_LABELS[order.status] ?? "Đơn lịch sử"}
          </Text>
        </View>
      </View>

      <View className="px-4 py-3">
        {order.items.map((item, index) => (
          <View
            key={`${item.menuItemId}-${index}`}
            className="mb-2 flex-row items-start justify-between"
          >
            <View className="flex-1 pr-3">
              <Text className="text-sm font-bold text-slate-700">
                {item.quantity} × {item.name}
              </Text>
              {item.selectedOptions?.length ? (
                <Text className="mt-0.5 text-[11px] text-slate-400">
                  +{" "}
                  {item.selectedOptions.map((option) => option.name).join(", ")}
                </Text>
              ) : null}
              {item.note ? (
                <Text className="mt-0.5 text-[11px] italic text-slate-400">
                  {item.note}
                </Text>
              ) : null}
            </View>
            <Text className="text-xs font-extrabold text-slate-600">
              {formatMoney(
                (item.unitPrice +
                  (item.selectedOptions ?? []).reduce(
                    (sum, option) => sum + option.price,
                    0,
                  )) *
                  item.quantity,
              )}
            </Text>
          </View>
        ))}

        <View className="mt-1 flex-row items-center justify-between border-t border-dashed border-slate-200 pt-3">
          <View>
            <Text className="text-[10px] font-bold uppercase text-slate-400">
              {ORDER_PAYMENT_METHOD_LABELS[order.paymentMethod] ??
                "Phương thức cũ"}
            </Text>
            <View
              className="mt-1 self-start rounded-full px-2 py-0.5"
              style={{ backgroundColor: paymentColors.background }}
            >
              <Text
                className="text-[10px] font-bold"
                style={{ color: paymentColors.text }}
              >
                {ORDER_PAYMENT_STATUS_LABELS[order.paymentStatus] ??
                  "Thanh toán cũ"}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-lg font-black text-rose-600">
              {formatMoney(order.finalAmount)}
            </Text>
          </View>
        </View>

        {order.cancellationReason ? (
          <View className="mt-3 flex-row rounded-2xl bg-slate-50 p-3">
            <Ionicons name="information-circle" size={18} color="#64748b" />
            <Text className="ml-2 flex-1 text-xs leading-5 text-slate-500">
              Lý do hủy: {order.cancellationReason}
            </Text>
          </View>
        ) : null}
      </View>

      {footer ? (
        <View className="border-t border-slate-100 px-4 py-3">{footer}</View>
      ) : null}
    </View>
  );
}
