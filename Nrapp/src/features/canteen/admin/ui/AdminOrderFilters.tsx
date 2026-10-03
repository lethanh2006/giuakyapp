import {
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type OrderPaymentStatus,
  type OrderStatus,
} from "@/src/services/canteen/constant";
import { Ionicons } from "@expo/vector-icons";
import { useState, type ComponentProps } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = ComponentProps<typeof Ionicons>["name"];
type StatusFilter = OrderStatus | "ALL";
type PaymentFilter = OrderPaymentStatus | "ALL";

type AdminOrderFiltersProps = {
  page: number;
  paymentFilter: PaymentFilter;
  statusFilter: StatusFilter;
  totalOrders: number;
  totalPages: number;
  onApply: (status: StatusFilter, payment: PaymentFilter) => void;
};

const STATUS_ICONS: Record<StatusFilter, IconName> = {
  ALL: "apps-outline",
  CREATED: "add-circle-outline",
  COMPLETED: "checkmark-done-outline",
  CANCELLED: "close-circle-outline",
};

const PAYMENT_ICONS: Record<PaymentFilter, IconName> = {
  ALL: "wallet-outline",
  PENDING: "time-outline",
  PAID: "checkmark-circle-outline",
};

const STATUS_OPTIONS = ["ALL", ...ORDER_STATUSES] as StatusFilter[];
const PAYMENT_OPTIONS: PaymentFilter[] = ["ALL", "PENDING", "PAID"];

const getStatusLabel = (status: StatusFilter) =>
  status === "ALL" ? "Tất cả trạng thái" : ORDER_STATUS_LABELS[status];

const getPaymentLabel = (status: PaymentFilter) =>
  status === "ALL" ? "Tất cả thanh toán" : ORDER_PAYMENT_STATUS_LABELS[status];

export default function AdminOrderFilters({
  page,
  paymentFilter,
  statusFilter,
  totalOrders,
  totalPages,
  onApply,
}: AdminOrderFiltersProps) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [draftStatus, setDraftStatus] = useState<StatusFilter>(statusFilter);
  const [draftPayment, setDraftPayment] =
    useState<PaymentFilter>(paymentFilter);
  const activeCount =
    Number(statusFilter !== "ALL") + Number(paymentFilter !== "ALL");

  const openFilters = () => {
    setDraftStatus(statusFilter);
    setDraftPayment(paymentFilter);
    setVisible(true);
  };

  const applyFilters = () => {
    onApply(draftStatus, draftPayment);
    setVisible(false);
  };

  return (
    <>
      <View className="mb-3">
        <View className="flex-row items-center justify-between">
          <View className="min-w-0 flex-1 pr-3">
            <Text className="text-base font-black text-slate-900">
              Danh sách đơn
            </Text>
            <Text className="mt-0.5 text-[11px] font-semibold text-slate-400">
              {totalOrders} kết quả phù hợp
              {totalPages > 1 ? ` · Trang ${page}/${totalPages}` : ""}
            </Text>
          </View>

          <Pressable
            accessibilityLabel={`Mở bộ lọc đơn hàng${
              activeCount ? `, ${activeCount} điều kiện đang áp dụng` : ""
            }`}
            accessibilityRole="button"
            className="min-h-11 flex-row items-center rounded-2xl border border-red-200 bg-white px-3.5 active:bg-red-50"
            onPress={openFilters}
            style={{ elevation: 2 }}
          >
            <Ionicons name="options-outline" size={18} color="#dc2626" />
            <Text className="ml-2 text-xs font-black text-red-700">Bộ lọc</Text>
            {activeCount > 0 ? (
              <View className="ml-2 h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1">
                <Text className="text-[10px] font-black text-white">
                  {activeCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {activeCount > 0 ? (
          <View
            className="mt-3 flex-row flex-wrap items-center"
            style={{ gap: 8 }}
          >
            {statusFilter !== "ALL" ? (
              <View className="min-h-9 flex-row items-center rounded-full border border-red-200 bg-red-50 pl-3 pr-1.5">
                <Text className="text-[11px] font-bold text-red-700">
                  {getStatusLabel(statusFilter)}
                </Text>
                <Pressable
                  accessibilityLabel="Bỏ lọc trạng thái đơn"
                  accessibilityRole="button"
                  className="ml-1.5 h-7 w-7 items-center justify-center rounded-full active:bg-red-100"
                  hitSlop={4}
                  onPress={() => onApply("ALL", paymentFilter)}
                >
                  <Ionicons name="close" size={15} color="#b91c1c" />
                </Pressable>
              </View>
            ) : null}
            {paymentFilter !== "ALL" ? (
              <View className="min-h-9 flex-row items-center rounded-full border border-blue-200 bg-blue-50 pl-3 pr-1.5">
                <Text className="text-[11px] font-bold text-blue-700">
                  {getPaymentLabel(paymentFilter)}
                </Text>
                <Pressable
                  accessibilityLabel="Bỏ lọc trạng thái thanh toán"
                  accessibilityRole="button"
                  className="ml-1.5 h-7 w-7 items-center justify-center rounded-full active:bg-blue-100"
                  hitSlop={4}
                  onPress={() => onApply(statusFilter, "ALL")}
                >
                  <Ionicons name="close" size={15} color="#1d4ed8" />
                </Pressable>
              </View>
            ) : null}
            <Pressable
              accessibilityLabel="Xóa tất cả bộ lọc"
              accessibilityRole="button"
              className="min-h-9 justify-center px-1"
              onPress={() => onApply("ALL", "ALL")}
            >
              <Text className="text-[11px] font-black text-slate-500">
                Xóa tất cả
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <Modal
        animationType="slide"
        navigationBarTranslucent
        onRequestClose={() => setVisible(false)}
        statusBarTranslucent
        transparent
        visible={visible}
      >
        <View
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(2, 6, 23, 0.45)" }}
        >
          <Pressable
            accessibilityLabel="Đóng bộ lọc"
            className="flex-1"
            onPress={() => setVisible(false)}
          />
          <View
            className="max-h-[88%] rounded-t-[32px] bg-white"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <View className="items-center pt-3">
              <View className="h-1.5 w-11 rounded-full bg-slate-200" />
            </View>

            <View className="flex-row items-center justify-between border-b border-slate-100 px-5 pb-4 pt-3">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-black text-slate-900">
                  Lọc đơn hàng
                </Text>
                <Text className="mt-1 text-xs text-slate-400">
                  Chọn điều kiện rồi áp dụng một lần
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Đóng bộ lọc đơn hàng"
                accessibilityRole="button"
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
                onPress={() => setVisible(false)}
              >
                <Ionicons name="close" size={21} color="#475569" />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              <View className="px-5 pt-5">
                <Text className="mb-3 text-[11px] font-black uppercase tracking-[1.5px] text-slate-500">
                  Trạng thái đơn hàng
                </Text>
                <View className="flex-row flex-wrap justify-between">
                  {STATUS_OPTIONS.map((status) => {
                    const selected = draftStatus === status;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        className={`mb-2 min-h-14 flex-row items-center rounded-2xl border p-3 ${
                          selected
                            ? "border-red-400 bg-red-50"
                            : "border-slate-200 bg-white"
                        }`}
                        key={status}
                        onPress={() => setDraftStatus(status)}
                        style={{ width: "48.7%" }}
                      >
                        <View
                          className={`h-8 w-8 items-center justify-center rounded-xl ${
                            selected ? "bg-red-600" : "bg-slate-100"
                          }`}
                        >
                          <Ionicons
                            name={STATUS_ICONS[status]}
                            size={16}
                            color={selected ? "white" : "#64748b"}
                          />
                        </View>
                        <Text
                          className={`ml-2 flex-1 text-[11px] font-bold ${
                            selected ? "text-red-800" : "text-slate-600"
                          }`}
                          numberOfLines={2}
                        >
                          {getStatusLabel(status)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text className="mb-3 mt-4 text-[11px] font-black uppercase tracking-[1.5px] text-slate-500">
                  Trạng thái thanh toán
                </Text>
                <View className="flex-row flex-wrap justify-between">
                  {PAYMENT_OPTIONS.map((status) => {
                    const selected = draftPayment === status;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        className={`mb-2 min-h-14 flex-row items-center rounded-2xl border p-3 ${
                          selected
                            ? "border-blue-400 bg-blue-50"
                            : "border-slate-200 bg-white"
                        }`}
                        key={status}
                        onPress={() => setDraftPayment(status)}
                        style={{ width: "48.7%" }}
                      >
                        <View
                          className={`h-8 w-8 items-center justify-center rounded-xl ${
                            selected ? "bg-blue-600" : "bg-slate-100"
                          }`}
                        >
                          <Ionicons
                            name={PAYMENT_ICONS[status]}
                            size={16}
                            color={selected ? "white" : "#64748b"}
                          />
                        </View>
                        <Text
                          className={`ml-2 flex-1 text-[11px] font-bold ${
                            selected ? "text-blue-800" : "text-slate-600"
                          }`}
                          numberOfLines={2}
                        >
                          {getPaymentLabel(status)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View
              className="flex-row border-t border-slate-100 px-5 pt-4"
              style={{ gap: 10 }}
            >
              <Pressable
                accessibilityLabel="Đặt lại lựa chọn bộ lọc"
                accessibilityRole="button"
                className="min-h-12 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white active:bg-slate-50"
                onPress={() => {
                  setDraftStatus("ALL");
                  setDraftPayment("ALL");
                }}
              >
                <Text className="text-sm font-black text-slate-600">
                  Đặt lại
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Áp dụng bộ lọc đơn hàng"
                accessibilityRole="button"
                className="min-h-12 flex-[1.5] flex-row items-center justify-center rounded-2xl bg-red-600 px-4 active:bg-red-700"
                onPress={applyFilters}
                style={{ elevation: 2 }}
              >
                <Ionicons name="checkmark" size={18} color="white" />
                <Text className="ml-2 text-sm font-black text-white">
                  Áp dụng bộ lọc
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
