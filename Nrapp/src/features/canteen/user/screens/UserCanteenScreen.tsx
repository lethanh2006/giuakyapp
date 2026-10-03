import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import {
  formatMoney,
  getCanteenErrorMessage,
} from "@/src/features/canteen/shared/model/presentation";
import UserOrderSummaryCard from "@/src/features/canteen/user/ui/UserOrderSummaryCard";
import {
  cancelCanteenOrder,
  createCanteenOrder,
  getCanteenMenu,
  getMyCanteenOrders,
  searchCanteenMenu,
} from "@/src/services/canteen/canteen.service";
import type {
  CanteenOrder,
  MenuGroup,
  MenuItem,
} from "@/src/services/canteen/constant";
import {
  listCanteenTables,
  type CanteenTable,
} from "@/src/services/canteen/table.service";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

type UserCanteenTab = "menu" | "orders";
type CartLine = {
  key: string;
  item: MenuItem;
  quantity: number;
  selectedOptionNames: string[];
};

function TablePicker({
  tables,
  selectedTableId,
  onSelect,
  compact = false,
}: {
  tables: CanteenTable[];
  selectedTableId: string | null;
  onSelect: (tableId: string) => void;
  compact?: boolean;
}) {
  return (
    <View
      className={
        compact ? "" : "rounded-[28px] border border-blue-100 bg-white p-4"
      }
    >
      {!compact ? (
        <View className="mb-4 flex-row items-start">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
            <Ionicons name="grid-outline" size={22} color="#2563eb" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-lg font-black text-slate-900">
              Chọn bàn trước khi gọi món
            </Text>
            <Text className="mt-1 text-xs leading-5 text-slate-500">
              Bạn có thể gọi thêm món cho bàn đang dùng. Bàn được giữ trong đơn
              để nhân viên xử lý nhanh hơn.
            </Text>
          </View>
        </View>
      ) : null}
      {tables.length === 0 ? (
        <View className="items-center rounded-2xl bg-slate-50 px-4 py-8">
          <Ionicons name="grid-outline" size={30} color="#94a3b8" />
          <Text className="mt-2 text-center text-xs font-semibold text-slate-500">
            Chưa có bàn khả dụng. Vui lòng thử tải lại sau.
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap justify-between">
          {tables.map((table) => {
            const selected = table._id === selectedTableId;
            const reserved = table.status === "reserved";
            const occupied = table.status === "occupied";
            return (
              <Pressable
                accessibilityLabel={`Chọn ${table.name}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: reserved, selected }}
                className={`mb-3 rounded-2xl border p-3 ${selected ? "border-blue-600 bg-blue-600" : reserved ? "border-slate-200 bg-slate-100 opacity-60" : occupied ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}
                disabled={reserved}
                key={table._id}
                onPress={() => onSelect(table._id)}
                style={{ width: "48.5%" }}
              >
                <View className="flex-row items-center justify-between">
                  <Ionicons
                    color={
                      selected ? "white" : occupied ? "#d97706" : "#059669"
                    }
                    name="restaurant-outline"
                    size={19}
                  />
                  {selected ? (
                    <Ionicons color="white" name="checkmark-circle" size={18} />
                  ) : null}
                </View>
                <Text
                  className={`mt-3 text-base font-black ${selected ? "text-white" : "text-slate-900"}`}
                >
                  {table.name}
                </Text>
                <Text
                  className={`mt-1 text-[11px] font-bold ${selected ? "text-blue-100" : reserved ? "text-slate-500" : occupied ? "text-amber-700" : "text-emerald-700"}`}
                >
                  {reserved
                    ? "Tạm khóa"
                    : occupied
                      ? "Đang dùng · gọi thêm được"
                      : `Trống · ${table.capacity} chỗ`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function UserCanteenScreen() {
  const { isAuth, getToken } = useAuthSession();
  const scrollRef = useRef<ScrollView>(null);
  const [tab, setTab] = useState<UserCanteenTab>("menu");
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [searchResults, setSearchResults] = useState<MenuItem[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuLoading, setMenuLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [tables, setTables] = useState<CanteenTable[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [tableError, setTableError] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [tablePickerVisible, setTablePickerVisible] = useState(false);
  const [draftOptions, setDraftOptions] = useState<Record<string, string[]>>(
    {},
  );
  const [cart, setCart] = useState<CartLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState<CanteenOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelReasons, setCancelReasons] = useState<Record<string, string>>(
    {},
  );
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const selectTable = (tableId: string) => {
    if (selectedTableId && selectedTableId !== tableId && cart.length > 0) {
      Alert.alert("Đổi bàn?", "Giỏ hàng hiện tại sẽ được gửi sang bàn mới.", [
        { text: "Giữ bàn", style: "cancel" },
        {
          text: "Đổi bàn",
          onPress: () => {
            setSelectedTableId(tableId);
            setTablePickerVisible(false);
          },
        },
      ]);
      return;
    }
    setSelectedTableId(tableId);
    setTablePickerVisible(false);
  };

  const selectedTable = useMemo(
    () => tables.find((table) => table._id === selectedTableId) ?? null,
    [selectedTableId, tables],
  );
  const tableNames = useMemo(
    () => new Map(tables.map((table) => [table._id, table.name])),
    [tables],
  );

  const loadMenu = useCallback(async () => {
    try {
      setMenuLoading(true);
      setMenuGroups(await getCanteenMenu());
    } catch (error) {
      Alert.alert(
        "Lỗi",
        getCanteenErrorMessage(error, "Không tải được thực đơn căn tin"),
      );
    } finally {
      setMenuLoading(false);
    }
  }, []);

  const loadTables = useCallback(async () => {
    if (!isAuth) return;
    try {
      setTablesLoading(true);
      const token = await getToken();
      if (!token) return;
      const result = await listCanteenTables(token, {
        page: 1,
        limit: 100,
        sortBy: "name",
        sortOrder: "asc",
      });
      setTables(result.data);
      setSelectedTableId((current) =>
        current &&
        result.data.some(
          (table) => table._id === current && table.status !== "reserved",
        )
          ? current
          : null,
      );
      setTableError(null);
    } catch (error) {
      setTableError(
        getCanteenErrorMessage(error, "Không tải được danh sách bàn"),
      );
    } finally {
      setTablesLoading(false);
    }
  }, [getToken, isAuth]);

  const loadOrders = useCallback(
    async (showLoading = true) => {
      if (!isAuth) return;
      try {
        if (showLoading) setOrdersLoading(true);
        const token = await getToken();
        if (!token) return;
        setOrders(await getMyCanteenOrders(token));
      } catch (error) {
        Alert.alert(
          "Lỗi",
          getCanteenErrorMessage(error, "Không tải được đơn hàng của bạn"),
        );
      } finally {
        if (showLoading) setOrdersLoading(false);
      }
    },
    [getToken, isAuth],
  );

  useEffect(() => {
    void loadMenu();
    void loadTables();
    void loadOrders();
  }, [loadMenu, loadOrders, loadTables]);

  useEffect(() => {
    const keyword = searchQuery.trim();
    if (!keyword) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const items = await searchCanteenMenu(keyword);
        if (active) setSearchResults(items);
      } catch (error) {
        if (active)
          Alert.alert(
            "Lỗi",
            getCanteenErrorMessage(error, "Không tìm kiếm được món ăn"),
          );
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const cartTotal = useMemo(
    () =>
      cart.reduce((sum, line) => {
        const optionPrice = (line.item.options ?? [])
          .filter((option) => line.selectedOptionNames.includes(option.name))
          .reduce((optionSum, option) => optionSum + option.price, 0);
        return sum + (line.item.price + optionPrice) * line.quantity;
      }, 0),
    [cart],
  );

  const toggleOption = (itemId: string, optionName: string) =>
    setDraftOptions((current) => {
      const selected = current[itemId] ?? [];
      return {
        ...current,
        [itemId]: selected.includes(optionName)
          ? selected.filter((name) => name !== optionName)
          : [...selected, optionName],
      };
    });

  const addToCart = (item: MenuItem) => {
    const selectedOptionNames = [...(draftOptions[item._id] ?? [])].sort();
    const key = `${item._id}:${selectedOptionNames.join("|")}`;
    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing)
        return current.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line,
        );
      return [...current, { key, item, quantity: 1, selectedOptionNames }];
    });
  };

  const changeCartQuantity = (key: string, change: number) =>
    setCart((current) =>
      current
        .map((line) =>
          line.key === key
            ? { ...line, quantity: line.quantity + change }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );

  const submitOrder = async () => {
    if (!selectedTableId) {
      Alert.alert("Chưa chọn bàn", "Hãy chọn bàn trước khi gọi món.");
      return;
    }
    if (cart.length === 0) {
      Alert.alert("Giỏ hàng trống", "Thêm ít nhất một món trước khi đặt.");
      return;
    }
    try {
      setSubmitting(true);
      const token = await getToken();
      if (!token) return;
      const order = await createCanteenOrder(token, {
        tableId: selectedTableId,
        paymentMethod: "CASH",
        items: cart.map((line) => ({
          menuItemId: line.item._id,
          quantity: line.quantity,
          selectedOptions: line.selectedOptionNames.map((name) => ({ name })),
        })),
      });
      setCart([]);
      setDraftOptions({});
      setTab("orders");
      await loadOrders(false);
      Alert.alert(
        "Đặt món thành công",
        `Đơn ${order.orderNumber} đã ghi nhận tại ${selectedTable?.name ?? "bàn đã chọn"}. Thanh toán tiền mặt khi nhận món.`,
      );
    } catch (error) {
      Alert.alert(
        "Lỗi",
        getCanteenErrorMessage(error, "Không thể tạo đơn hàng"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const performCancel = async (order: CanteenOrder) => {
    try {
      setCancellingId(order._id);
      const token = await getToken();
      if (!token) return;
      await cancelCanteenOrder(token, order._id, cancelReasons[order._id]);
      await loadOrders(false);
      Alert.alert("Đã hủy đơn", `Đơn ${order.orderNumber} đã được hủy.`);
    } catch (error) {
      Alert.alert(
        "Lỗi",
        getCanteenErrorMessage(error, "Không thể hủy đơn hàng"),
      );
    } finally {
      setCancellingId(null);
    }
  };

  const confirmCancel = (order: CanteenOrder) =>
    Alert.alert(
      "Xác nhận hủy đơn",
      `Bạn có chắc muốn hủy đơn ${order.orderNumber}?`,
      [
        { text: "Không", style: "cancel" },
        {
          text: "Hủy đơn",
          style: "destructive",
          onPress: () => void performCancel(order),
        },
      ],
    );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadMenu(), loadTables(), loadOrders(false)]);
    } finally {
      setRefreshing(false);
    }
  };
  const openCart = () => {
    setTab("menu");
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const renderMenuItem = (item: MenuItem) => {
    const selectedOptions = draftOptions[item._id] ?? [];
    return (
      <View
        key={item._id}
        className="mb-3 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm"
      >
        <View className="flex-row p-3.5">
          {item.imageUrl ? (
            <Image
              className="h-24 w-24 rounded-2xl bg-slate-100"
              resizeMode="cover"
              source={{ uri: item.imageUrl }}
            />
          ) : (
            <View className="h-24 w-24 items-center justify-center rounded-2xl bg-rose-50">
              <Ionicons name="restaurant" size={34} color="#e11d48" />
            </View>
          )}
          <View className="ml-3.5 flex-1">
            <Text className="text-base font-black text-slate-900">
              {item.name}
            </Text>
            {item.description ? (
              <Text className="mt-1 text-xs leading-5 text-slate-500">
                {item.description}
              </Text>
            ) : null}
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-base font-black text-rose-600">
                {formatMoney(item.price)}
              </Text>
              <Pressable
                className="flex-row items-center rounded-xl bg-rose-600 px-3 py-2 active:bg-rose-700"
                onPress={() => addToCart(item)}
              >
                <Ionicons name="add" size={17} color="white" />
                <Text className="ml-1 text-xs font-black text-white">Thêm</Text>
              </Pressable>
            </View>
          </View>
        </View>
        {item.options?.length ? (
          <View className="border-t border-slate-100 px-3.5 pb-3.5 pt-3">
            <Text className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Tùy chọn thêm
            </Text>
            <View className="flex-row flex-wrap">
              {item.options.map((option) => {
                const selected = selectedOptions.includes(option.name);
                return (
                  <Pressable
                    className={`mb-2 mr-2 rounded-full border px-3 py-2 ${selected ? "border-rose-500 bg-rose-50" : "border-slate-200 bg-white"}`}
                    key={option.name}
                    onPress={() => toggleOption(item._id, option.name)}
                  >
                    <Text
                      className={`text-xs font-bold ${selected ? "text-rose-600" : "text-slate-500"}`}
                    >
                      {selected ? "✓ " : ""}
                      {option.name} +{formatMoney(option.price)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  const renderCart = () => (
    <View className="mt-2 rounded-[28px] border border-rose-100 bg-white p-4 shadow-sm">
      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-black text-slate-900">Giỏ hàng</Text>
          <Text className="mt-1 text-xs font-semibold text-slate-400">
            {selectedTable?.name} · Thanh toán tiền mặt
          </Text>
        </View>
        <Pressable onPress={() => setCart([])}>
          <Text className="text-xs font-bold text-slate-400">Xóa tất cả</Text>
        </Pressable>
      </View>
      {cart.map((line) => (
        <View
          className="mb-3 flex-row items-center border-b border-slate-100 pb-3"
          key={line.key}
        >
          <View className="flex-1 pr-3">
            <Text className="text-sm font-black text-slate-800">
              {line.item.name}
            </Text>
            {line.selectedOptionNames.length ? (
              <Text className="mt-1 text-[11px] text-slate-400">
                + {line.selectedOptionNames.join(", ")}
              </Text>
            ) : null}
          </View>
          <View className="flex-row items-center rounded-xl bg-slate-100 p-1">
            <Pressable
              className="h-8 w-8 items-center justify-center"
              onPress={() => changeCartQuantity(line.key, -1)}
            >
              <Ionicons name="remove" size={16} color="#475569" />
            </Pressable>
            <Text className="w-7 text-center text-sm font-black text-slate-800">
              {line.quantity}
            </Text>
            <Pressable
              className="h-8 w-8 items-center justify-center"
              onPress={() => changeCartQuantity(line.key, 1)}
            >
              <Ionicons name="add" size={16} color="#475569" />
            </Pressable>
          </View>
        </View>
      ))}
      <View className="mt-1 flex-row items-center justify-between">
        <View>
          <Text className="text-[10px] font-bold uppercase text-slate-400">
            Tạm tính
          </Text>
          <Text className="text-xl font-black text-rose-600">
            {formatMoney(cartTotal)}
          </Text>
        </View>
        <Pressable
          className="flex-row items-center rounded-2xl bg-rose-600 px-5 py-3.5 active:bg-rose-700 disabled:opacity-50"
          disabled={submitting}
          onPress={submitOrder}
        >
          {submitting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Ionicons name="receipt" size={18} color="white" />
          )}
          <Text className="ml-2 text-sm font-black text-white">Gửi đơn</Text>
        </Pressable>
      </View>
      <View className="mt-3 flex-row items-start rounded-2xl bg-amber-50 p-3">
        <Ionicons name="cash-outline" size={17} color="#b45309" />
        <Text className="ml-2 flex-1 text-[11px] leading-4 text-amber-800">
          Bạn thanh toán tiền mặt khi nhận món. Admin sẽ xác nhận giao dịch trên
          hệ thống.
        </Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-slate-50">
      <View className="border-b border-slate-100 bg-white px-4 pb-3 pt-4">
        <View className="flex-row items-center">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-rose-50">
            <Ionicons name="restaurant" size={23} color="#e11d48" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-xl font-black text-slate-900">Căn tin</Text>
            <Text className="text-xs font-semibold text-slate-400">
              Chọn bàn · chọn món · nhận món
            </Text>
          </View>
          {cart.length > 0 ? (
            <Pressable
              accessibilityLabel="Mở giỏ hàng"
              className="flex-row items-center rounded-full bg-rose-600 px-2.5 py-1.5"
              onPress={openCart}
            >
              <Ionicons name="cart" size={13} color="white" />
              <Text className="ml-1 text-xs font-black text-white">
                {cart.length}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {selectedTable ? (
          <Pressable
            className="mt-3 flex-row items-center rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2.5"
            onPress={() => setTablePickerVisible(true)}
          >
            <Ionicons name="location-outline" size={17} color="#2563eb" />
            <View className="ml-2 flex-1">
              <Text className="text-[10px] font-black uppercase text-blue-500">
                Bàn đang chọn
              </Text>
              <Text className="mt-0.5 text-sm font-black text-blue-900">
                {selectedTable.name}
              </Text>
            </View>
            <Text className="text-xs font-black text-blue-700">Đổi bàn</Text>
          </Pressable>
        ) : null}
        <View className="mt-3 flex-row rounded-2xl bg-slate-100 p-1">
          {(
            [
              ["menu", "Gọi món"],
              ["orders", "Đơn của tôi"],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === value }}
              className={`flex-1 items-center rounded-xl border py-2.5 ${tab === value ? "border-rose-100 bg-white" : "border-transparent bg-slate-100"}`}
              key={value}
              onPress={() => setTab(value)}
            >
              <Text
                className={`text-xs font-black ${tab === value ? "text-rose-600" : "text-slate-500"}`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 36 }}
        ref={scrollRef}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {tab === "menu" ? (
          tablesLoading ? (
            <View className="items-center py-20">
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="mt-3 text-xs font-semibold text-slate-400">
                Đang tải bàn…
              </Text>
            </View>
          ) : tableError ? (
            <View className="items-center rounded-3xl bg-white px-5 py-12">
              <Ionicons
                name="cloud-offline-outline"
                size={38}
                color="#94a3b8"
              />
              <Text className="mt-3 text-center text-sm font-black text-slate-700">
                Chưa tải được danh sách bàn
              </Text>
              <Text className="mt-2 text-center text-xs leading-5 text-slate-500">
                {tableError}
              </Text>
              <Pressable
                className="mt-4 rounded-2xl bg-blue-600 px-5 py-3"
                onPress={() => void loadTables()}
              >
                <Text className="text-xs font-black text-white">Thử lại</Text>
              </Pressable>
            </View>
          ) : !selectedTableId ? (
            <TablePicker
              tables={tables}
              selectedTableId={selectedTableId}
              onSelect={selectTable}
            />
          ) : (
            <>
              <View className="mb-4 flex-row items-center rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                <Ionicons name="checkmark-circle" size={19} color="#059669" />
                <Text className="ml-2 flex-1 text-xs font-bold leading-5 text-emerald-800">
                  Đã chọn {selectedTable?.name}. Bây giờ chọn món bạn muốn gọi.
                </Text>
              </View>
              <View className="mb-4 flex-row items-center rounded-2xl border border-slate-200 bg-white px-3">
                <Ionicons name="search" size={19} color="#94a3b8" />
                <TextInput
                  className="h-12 flex-1 px-2 text-sm font-semibold text-slate-800"
                  onChangeText={setSearchQuery}
                  placeholder="Tìm món ăn…"
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                />
                {searching ? (
                  <ActivityIndicator size="small" color="#e11d48" />
                ) : null}
                {searchQuery ? (
                  <Pressable onPress={() => setSearchQuery("")}>
                    <Ionicons name="close-circle" size={20} color="#94a3b8" />
                  </Pressable>
                ) : null}
              </View>
              {menuLoading ? (
                <View className="items-center py-20">
                  <ActivityIndicator size="large" color="#e11d48" />
                </View>
              ) : searchResults ? (
                <View>
                  <Text className="mb-3 text-base font-black text-slate-800">
                    Kết quả tìm kiếm ({searchResults.length})
                  </Text>
                  {searchResults.map(renderMenuItem)}
                  {searchResults.length === 0 ? (
                    <View className="items-center rounded-3xl bg-white py-12">
                      <Ionicons
                        name="search-outline"
                        size={38}
                        color="#cbd5e1"
                      />
                      <Text className="mt-3 text-sm font-semibold text-slate-400">
                        Không tìm thấy món phù hợp
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                menuGroups.map((group) => (
                  <View key={group.category._id} className="mb-3">
                    <Text className="mb-1 text-lg font-black text-slate-900">
                      {group.category.name}
                    </Text>
                    {group.category.description ? (
                      <Text className="mb-3 text-xs leading-5 text-slate-400">
                        {group.category.description}
                      </Text>
                    ) : null}
                    {group.items.map(renderMenuItem)}
                  </View>
                ))
              )}
              {cart.length > 0 ? renderCart() : null}
            </>
          )
        ) : ordersLoading ? (
          <View className="items-center py-20">
            <ActivityIndicator size="large" color="#e11d48" />
          </View>
        ) : orders.length === 0 ? (
          <View className="items-center rounded-3xl bg-white py-14">
            <Ionicons name="receipt-outline" size={42} color="#cbd5e1" />
            <Text className="mt-3 text-sm font-semibold text-slate-400">
              Bạn chưa có đơn hàng nào
            </Text>
            <Pressable
              className="mt-4 rounded-2xl bg-rose-600 px-5 py-3"
              onPress={() => setTab("menu")}
            >
              <Text className="text-xs font-black text-white">
                Chọn món ngay
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="mb-4 flex-row items-start rounded-2xl border border-amber-100 bg-amber-50 p-3">
              <Ionicons name="cash-outline" size={18} color="#b45309" />
              <Text className="ml-2 flex-1 text-xs leading-5 text-amber-800">
                Tất cả đơn mới đều thanh toán tiền mặt. Khi đã thu tiền, admin
                sẽ cập nhật trạng thái đã thanh toán.
              </Text>
            </View>
            {orders.map((order) => (
              <UserOrderSummaryCard
                key={order._id}
                order={order}
                tableName={
                  order.tableId ? tableNames.get(order.tableId) : undefined
                }
                footer={
                  order.status === "CREATED" &&
                  order.paymentStatus === "PENDING" ? (
                    <View>
                      <TextInput
                        className="mb-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700"
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
                        className="items-center rounded-2xl border border-rose-200 bg-rose-50 py-2.5 disabled:opacity-50"
                        disabled={cancellingId === order._id}
                        onPress={() => confirmCancel(order)}
                      >
                        {cancellingId === order._id ? (
                          <ActivityIndicator color="#e11d48" size="small" />
                        ) : (
                          <Text className="text-xs font-black text-rose-600">
                            Hủy đơn
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  ) : undefined
                }
              />
            ))}
          </>
        )}
      </ScrollView>
      <Modal
        animationType="slide"
        transparent
        visible={tablePickerVisible}
        onRequestClose={() => setTablePickerVisible(false)}
      >
        <View
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(2, 6, 23, 0.45)" }}
        >
          <Pressable
            className="flex-1"
            onPress={() => setTablePickerVisible(false)}
          />
          <View className="max-h-[82%] rounded-t-[32px] bg-white px-4 pb-6 pt-4">
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-black text-slate-900">
                  Đổi bàn
                </Text>
                <Text className="mt-1 text-xs text-slate-400">
                  Chọn bàn trống hoặc bàn đang dùng
                </Text>
              </View>
              <Pressable
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
                onPress={() => setTablePickerVisible(false)}
              >
                <Ionicons name="close" size={20} color="#475569" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TablePicker
                compact
                tables={tables}
                selectedTableId={selectedTableId}
                onSelect={selectTable}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
