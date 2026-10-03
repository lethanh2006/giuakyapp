import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import AdminCategoryManager from "@/src/features/canteen/admin/ui/AdminCategoryManager";
import AdminMenuCatalog from "@/src/features/canteen/admin/ui/AdminMenuCatalog";
import AdminOrderFilters from "@/src/features/canteen/admin/ui/AdminOrderFilters";
import AdminOrderSummaryCard from "@/src/features/canteen/admin/ui/AdminOrderSummaryCard";
import AdminTableManager from "@/src/features/canteen/admin/ui/AdminTableManager";
import { getCanteenErrorMessage } from "@/src/features/canteen/shared/model/presentation";
import {
  confirmCashCanteenPayment,
  cancelCanteenOrder,
  listCanteenOrders,
} from "@/src/services/canteen/canteen.service";
import {
  type CanteenOrder,
  type OrderPaymentStatus,
  type OrderStatus,
} from "@/src/services/canteen/constant";
import {
  listCanteenTables,
  type CanteenTable,
} from "@/src/services/canteen/table.service";
import { getRoleLabel } from "@/src/application/access/roles";
import { normalizeAppRole } from "@/src/services/user/constant";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import { Ionicons } from "@expo/vector-icons";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

type OperationsTab = "orders" | "catalog" | "categories" | "tables";
type StatusFilter = OrderStatus | "ALL";
type PaymentFilter = OrderPaymentStatus | "ALL";
type OrderAction = "cash" | "cancel";
type IoniconName = ComponentProps<typeof Ionicons>["name"];

const OPERATION_TAB_ITEMS: {
  value: OperationsTab;
  label: string;
  icon: IoniconName;
}[] = [
  {
    value: "orders",
    label: "Đơn & thu tiền",
    icon: "receipt-outline",
  },
  {
    value: "catalog",
    label: "Thực đơn",
    icon: "restaurant-outline",
  },
  {
    value: "categories",
    label: "Danh mục",
    icon: "albums-outline",
  },
  {
    value: "tables",
    label: "Bàn ăn",
    icon: "grid-outline",
  },
];

function LoadErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View className="items-center rounded-3xl border border-rose-100 bg-white px-5 py-10">
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-rose-50">
        <Ionicons name="cloud-offline-outline" size={24} color="#e11d48" />
      </View>
      <Text className="mt-3 text-center text-sm font-black text-slate-800">
        Chưa tải được dữ liệu
      </Text>
      <Text className="mt-1 text-center text-xs leading-5 text-slate-500">
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        className="mt-4 flex-row items-center rounded-2xl bg-red-600 px-4 py-3 active:bg-red-700"
        onPress={onRetry}
      >
        <Ionicons name="refresh" size={16} color="white" />
        <Text className="ml-2 text-xs font-black text-white">Thử lại</Text>
      </Pressable>
    </View>
  );
}

export default function AdminCanteenScreen() {
  const { user, getToken } = useAuthSession();
  const role = normalizeAppRole(user?.role);
  const canOperate = role === "admin";
  const [tab, setTab] = useState<OperationsTab>("orders");
  const [resourceRefreshKey, setResourceRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<CanteenOrder[]>([]);
  const [tables, setTables] = useState<CanteenTable[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [cancelReasons, setCancelReasons] = useState<Record<string, string>>(
    {},
  );
  const actionLock = useRef(false);
  const ordersRequestId = useRef(0);
  const tableNames = useMemo(
    () => new Map(tables.map((table) => [table._id, table.name])),
    [tables],
  );

  const loadTables = useCallback(
    async (showError = false) => {
      try {
        const token = await getToken();
        if (!token) return;
        const result = await listCanteenTables(token, {
          page: 1,
          limit: 100,
          sortBy: "name",
          sortOrder: "asc",
        });
        setTables(result.data);
      } catch (error) {
        if (showError)
          Alert.alert(
            "Lỗi",
            getCanteenErrorMessage(error, "Không tải được danh sách bàn"),
          );
      }
    },
    [getToken],
  );

  const loadOrders = useCallback(
    async (showLoading = true) => {
      const requestId = ++ordersRequestId.current;
      try {
        if (showLoading) setOrdersLoading(true);
        const token = await getToken();
        if (!token) {
          setOrdersError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
          return;
        }
        const result = await listCanteenOrders(token, {
          page,
          limit: 20,
          status: statusFilter === "ALL" ? undefined : statusFilter,
          paymentStatus: paymentFilter === "ALL" ? undefined : paymentFilter,
        });
        if (requestId !== ordersRequestId.current) return;
        const nextTotalPages = Math.max(result.pagination?.totalPages || 1, 1);
        if (page > nextTotalPages) {
          setPage(nextTotalPages);
          return;
        }
        setOrders(Array.isArray(result.orders) ? result.orders : []);
        setTotalPages(nextTotalPages);
        setTotalOrders(result.pagination?.total || 0);
        setOrdersError(null);
      } catch (error) {
        if (requestId === ordersRequestId.current)
          setOrdersError(
            getCanteenErrorMessage(error, "Không tải được danh sách đơn hàng"),
          );
      } finally {
        if (showLoading && requestId === ordersRequestId.current)
          setOrdersLoading(false);
      }
    },
    [getToken, page, paymentFilter, statusFilter],
  );

  useEffect(() => {
    void loadTables(true);
  }, [loadTables]);
  useEffect(() => {
    if (tab === "orders") void loadOrders();
  }, [loadOrders, tab]);

  const runOrderAction = async (action: OrderAction, order: CanteenOrder) => {
    if (actionLock.current) return;
    actionLock.current = true;
    const key = `${action}:${order._id}`;
    try {
      setActionKey(key);
      const token = await getToken();
      if (!token) {
        Alert.alert(
          "Lỗi",
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        );
        return;
      }
      if (action === "cash") await confirmCashCanteenPayment(token, order._id);
      else await cancelCanteenOrder(token, order._id, cancelReasons[order._id]);
      await loadOrders(false);
      if (action === "cancel")
        setCancelReasons((current) => {
          const next = { ...current };
          delete next[order._id];
          return next;
        });
      Alert.alert(
        "Đã cập nhật",
        action === "cash"
          ? `Đã xác nhận thu tiền mặt cho ${order.orderNumber}.`
          : `Đã hủy ${order.orderNumber}.`,
      );
    } catch (error) {
      Alert.alert(
        "Lỗi",
        getCanteenErrorMessage(error, "Không cập nhật được đơn hàng"),
      );
      void loadOrders(false);
    } finally {
      actionLock.current = false;
      setActionKey(null);
    }
  };

  const confirmCash = (order: CanteenOrder) =>
    Alert.alert(
      "Xác nhận thu tiền mặt",
      `Bạn đã nhận đủ ${order.finalAmount.toLocaleString("vi-VN")} đ cho ${order.orderNumber}?`,
      [
        { text: "Chưa", style: "cancel" },
        {
          text: "Đã nhận tiền",
          onPress: () => void runOrderAction("cash", order),
        },
      ],
    );

  const confirmCancel = (order: CanteenOrder) =>
    Alert.alert("Xác nhận hủy đơn", `Hủy đơn ${order.orderNumber}?`, [
      { text: "Không", style: "cancel" },
      {
        text: "Hủy đơn",
        style: "destructive",
        onPress: () => void runOrderAction("cancel", order),
      },
    ]);

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([loadOrders(false), loadTables()]);
      setResourceRefreshKey((current) => current + 1);
    } finally {
      setRefreshing(false);
    }
  };
  const applyOrderFilters = (status: StatusFilter, payment: PaymentFilter) => {
    setPage(1);
    setStatusFilter(status);
    setPaymentFilter(payment);
  };
  const resetOrderFilters = () => applyOrderFilters("ALL", "ALL");
  const hasOrderFilters = statusFilter !== "ALL" || paymentFilter !== "ALL";
  const pageStats = useMemo(
    () => ({
      pendingCash: orders.filter(
        (order) =>
          order.paymentMethod === "CASH" &&
          order.paymentStatus === "PENDING" &&
          order.status !== "CANCELLED",
      ).length,
      completed: orders.filter(
        (order) =>
          order.paymentStatus === "PAID" || order.status === "COMPLETED",
      ).length,
      cancelled: orders.filter((order) => order.status === "CANCELLED").length,
    }),
    [orders],
  );

  const renderOrderActions = (order: CanteenOrder) => {
    if (!canOperate)
      return (
        <Text className="text-center text-xs font-semibold text-slate-400">
          Chỉ admin được xác nhận thu tiền.
        </Text>
      );
    const canCollect =
      order.paymentMethod === "CASH" &&
      order.paymentStatus === "PENDING" &&
      order.status !== "CANCELLED";
    const canCancel =
      order.status === "CREATED" && order.paymentStatus === "PENDING";
    if (!canCollect && !canCancel) return null;
    return (
      <View>
        {canCollect ? (
          <Pressable
            className="mb-2 flex-row items-center justify-center rounded-2xl bg-emerald-600 py-3 active:bg-emerald-700"
            disabled={actionKey !== null}
            onPress={() => confirmCash(order)}
          >
            {actionKey === `cash:${order._id}` ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="cash-outline" size={17} color="white" />
                <Text className="ml-2 text-xs font-black text-white">
                  Đã thu tiền mặt
                </Text>
              </>
            )}
          </Pressable>
        ) : null}
        {canCancel ? (
          <>
            <TextInput
              className="mb-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700"
              editable={actionKey === null}
              maxLength={500}
              onChangeText={(reason) =>
                setCancelReasons((current) => ({
                  ...current,
                  [order._id]: reason,
                }))
              }
              placeholder="Lý do hủy (không bắt buộc)"
              placeholderTextColor="#94a3b8"
              value={cancelReasons[order._id] ?? ""}
            />
            <Pressable
              className="items-center rounded-2xl border border-rose-200 bg-rose-50 py-3"
              disabled={actionKey !== null}
              onPress={() => confirmCancel(order)}
            >
              {actionKey === `cancel:${order._id}` ? (
                <ActivityIndicator color="#e11d48" size="small" />
              ) : (
                <Text className="text-xs font-black text-rose-600">
                  Hủy đơn
                </Text>
              )}
            </Pressable>
          </>
        ) : null}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-slate-50">
      <View
        className="overflow-hidden border-b border-red-800 bg-red-900 px-4 pb-5 pt-4"
        style={{ elevation: 3 }}
      >
        <View
          className="absolute -right-12 -top-16 h-40 w-40 rounded-full"
          style={{ backgroundColor: "rgba(239, 68, 68, 0.2)" }}
        />
        <View className="flex-row items-center">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-red-600">
            <Ionicons name="storefront" size={24} color="white" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-[10px] font-black uppercase tracking-[2px] text-red-200">
              Khu vực quản lý
            </Text>
            <Text className="mt-0.5 text-xl font-black text-white">
              Căn tin nhân viên
            </Text>
          </View>
          <View
            className="items-center rounded-2xl border px-3 py-2"
            style={{
              borderColor: "rgba(255, 255, 255, 0.15)",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            <Ionicons name="person-circle-outline" size={20} color="#fecaca" />
            <Text className="mt-1 text-[9px] font-bold text-red-100">
              {getRoleLabel(user?.role)}
            </Text>
          </View>
        </View>
        <Text className="mt-4 text-xs leading-5 text-red-100">
          Theo dõi món theo bàn và xác nhận khi đã nhận đủ tiền mặt.
        </Text>
      </View>
      <View className="border-b border-slate-100 bg-slate-50 pb-3 pt-3">
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16 }}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <View className="flex-row" style={{ gap: 8 }}>
            {OPERATION_TAB_ITEMS.map(({ value, label, icon }) => {
              const selected = tab === value;
              const badge = value === "orders" ? pageStats.pendingCash : 0;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  className={`min-w-[100px] items-center rounded-2xl border px-3 py-2.5 ${selected ? "border-red-600 bg-red-600" : "border-slate-100 bg-white"}`}
                  key={value}
                  onPress={() => setTab(value)}
                  style={{ elevation: 1 }}
                >
                  <Ionicons
                    color={selected ? "white" : "#64748b"}
                    name={icon}
                    size={18}
                  />
                  <Text
                    className={`mt-1 text-[10px] font-black ${selected ? "text-white" : "text-slate-600"}`}
                  >
                    {label}
                  </Text>
                  {badge > 0 ? (
                    <View className="absolute right-1.5 top-1.5 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 py-0.5">
                      <Text className="text-[8px] font-black text-white">
                        {badge > 99 ? "99+" : badge}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 36 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {tab === "orders" ? (
          <>
            <View className="mb-4 flex-row" style={{ gap: 8 }}>
              <View className="flex-1 overflow-hidden rounded-2xl border border-amber-100 bg-white p-3">
                <Ionicons name="cash-outline" size={17} color="#d97706" />
                <Text className="mt-2 text-[9px] font-black uppercase text-slate-500">
                  Chờ thu tiền
                </Text>
                <Text className="mt-1 text-2xl font-black text-amber-700">
                  {pageStats.pendingCash}
                </Text>
              </View>
              <View className="flex-1 overflow-hidden rounded-2xl border border-emerald-100 bg-white p-3">
                <Ionicons
                  name="checkmark-circle-outline"
                  size={17}
                  color="#059669"
                />
                <Text className="mt-2 text-[9px] font-black uppercase text-slate-500">
                  Đã hoàn tất
                </Text>
                <Text className="mt-1 text-2xl font-black text-emerald-700">
                  {pageStats.completed}
                </Text>
              </View>
              <View className="flex-1 overflow-hidden rounded-2xl border border-slate-100 bg-white p-3">
                <Ionicons
                  name="close-circle-outline"
                  size={17}
                  color="#64748b"
                />
                <Text className="mt-2 text-[9px] font-black uppercase text-slate-500">
                  Đã hủy
                </Text>
                <Text className="mt-1 text-2xl font-black text-slate-700">
                  {pageStats.cancelled}
                </Text>
              </View>
            </View>
            <AdminOrderFilters
              onApply={applyOrderFilters}
              page={page}
              paymentFilter={paymentFilter}
              statusFilter={statusFilter}
              totalOrders={totalOrders}
              totalPages={totalPages}
            />
            {ordersLoading ? (
              <View className="items-center py-20">
                <ActivityIndicator size="large" color="#dc2626" />
                <Text className="mt-3 text-xs font-semibold text-slate-400">
                  Đang tải đơn hàng…
                </Text>
              </View>
            ) : ordersError ? (
              <LoadErrorCard
                message={ordersError}
                onRetry={() => void loadOrders()}
              />
            ) : orders.length === 0 ? (
              <View className="items-center rounded-3xl border border-slate-100 bg-white px-5 py-14">
                <Ionicons name="receipt-outline" size={42} color="#cbd5e1" />
                <Text className="mt-3 text-sm font-black text-slate-700">
                  Không có đơn phù hợp
                </Text>
                {hasOrderFilters ? (
                  <Pressable
                    className="mt-4 rounded-2xl bg-red-600 px-4 py-3"
                    onPress={resetOrderFilters}
                  >
                    <Text className="text-xs font-black text-white">
                      Xem tất cả đơn
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              orders.map((order) => (
                <AdminOrderSummaryCard
                  footer={renderOrderActions(order)}
                  key={order._id}
                  order={order}
                  tableName={
                    order.tableId ? tableNames.get(order.tableId) : undefined
                  }
                />
              ))
            )}
            {!ordersLoading && !ordersError && totalPages > 1 ? (
              <View className="mt-2 flex-row">
                <Pressable
                  className="mr-2 flex-1 items-center rounded-2xl border border-slate-200 bg-white py-3"
                  disabled={page <= 1}
                  onPress={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <Text className="text-xs font-black text-slate-600">
                    Trang trước
                  </Text>
                </Pressable>
                <Pressable
                  className="flex-1 items-center rounded-2xl bg-red-700 py-3"
                  disabled={page >= totalPages}
                  onPress={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  <Text className="text-xs font-black text-white">
                    Trang sau
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : tab === "catalog" ? (
          <AdminMenuCatalog refreshKey={resourceRefreshKey} />
        ) : tab === "categories" ? (
          <AdminCategoryManager refreshKey={resourceRefreshKey} />
        ) : (
          <AdminTableManager refreshKey={resourceRefreshKey} />
        )}
      </ScrollView>
    </View>
  );
}
