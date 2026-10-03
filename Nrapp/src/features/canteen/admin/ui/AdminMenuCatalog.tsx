import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import {
  formatMoney,
  getCanteenErrorMessage,
} from "@/src/features/canteen/shared/model/presentation";
import {
  createCanteenMenuItem,
  deleteCanteenMenuItem,
  getAdminCanteenMenu,
  redoCanteenMenuChange,
  undoCanteenMenuChange,
  updateCanteenMenuItem,
} from "@/src/services/canteen/canteen.service";
import type {
  CreateMenuItemInput,
  MenuCategory,
  MenuItem,
  MenuItemOption,
} from "@/src/services/canteen/constant";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

type Props = {
  refreshKey?: number;
};

const optionsToText = (options?: MenuItemOption[]) =>
  (options ?? []).map((option) => `${option.name} | ${option.price}`).join("\n");

const parseOptions = (value: string): MenuItemOption[] => {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const separator = line.lastIndexOf("|");
    const name = separator >= 0 ? line.slice(0, separator).trim() : "";
    const price = Number(separator >= 0 ? line.slice(separator + 1).trim() : "");
    if (!name || !Number.isSafeInteger(price) || price < 0) {
      throw new Error(
        `Tùy chọn dòng ${index + 1} phải có dạng “Tên | giá nguyên không âm”`,
      );
    }
    return { name, price };
  });
};

export default function AdminMenuCatalog({ refreshKey = 0 }: Props) {
  const { getToken } = useAuthSession();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);

  const loadCatalog = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        const token = await getToken();
        if (!token) return;
        const catalog = await getAdminCanteenMenu(token);
        setCategories(catalog.categories);
        setItems(catalog.items);
        setCategoryId((current) =>
          catalog.categories.some((category) => category._id === current)
            ? current
            : (catalog.categories[0]?._id ?? ""),
        );
      } catch (error) {
        Alert.alert(
          "Lỗi",
          getCanteenErrorMessage(error, "Không tải được danh mục quản trị"),
        );
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [getToken],
  );

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog, refreshKey]);

  const visibleItems = useMemo(
    () =>
      categoryFilter === "ALL"
        ? items
        : items.filter((item) => item.categoryId === categoryFilter),
    [categoryFilter, items],
  );

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category._id, category])),
    [categories],
  );

  const resetForm = useCallback(() => {
    setEditingId(null);
    setName("");
    setDescription("");
    setPrice("");
    setImageUrl("");
    setOptionsText("");
    setIsAvailable(true);
    setCategoryId(categories[0]?._id ?? "");
  }, [categories]);

  const editItem = (item: MenuItem) => {
    setEditingId(item._id);
    setCategoryId(item.categoryId);
    setName(item.name);
    setDescription(item.description ?? "");
    setPrice(String(item.price));
    setImageUrl(item.imageUrl ?? "");
    setOptionsText(optionsToText(item.options));
    setIsAvailable(item.isAvailable);
  };

  const saveItem = async () => {
    const normalizedName = name.trim();
    const normalizedPrice = Number(price.trim());
    if (!categoryId || !normalizedName) {
      Alert.alert("Thông báo", "Vui lòng chọn danh mục và nhập tên món");
      return;
    }
    if (!Number.isSafeInteger(normalizedPrice) || normalizedPrice < 0) {
      Alert.alert("Thông báo", "Giá món phải là số nguyên không âm");
      return;
    }

    let options: MenuItemOption[];
    try {
      options = parseOptions(optionsText);
    } catch (error) {
      Alert.alert(
        "Tùy chọn không hợp lệ",
        error instanceof Error ? error.message : "Hãy kiểm tra danh sách tùy chọn",
      );
      return;
    }

    const payload: CreateMenuItemInput = {
      categoryId,
      name: normalizedName,
      description: description.trim(),
      price: normalizedPrice,
      imageUrl: imageUrl.trim(),
      isAvailable,
      options,
    };
    const key = editingId ? `save:${editingId}` : "create";
    try {
      setBusyKey(key);
      const token = await getToken();
      if (!token) return;
      if (editingId) {
        await updateCanteenMenuItem(token, editingId, payload);
      } else {
        await createCanteenMenuItem(token, payload);
      }
      await loadCatalog(false);
      resetForm();
      Alert.alert(
        "Thành công",
        editingId ? "Đã cập nhật món ăn" : "Đã tạo món ăn",
      );
    } catch (error) {
      Alert.alert(
        "Lỗi",
        getCanteenErrorMessage(error, "Không lưu được món ăn"),
      );
    } finally {
      setBusyKey(null);
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    const key = `toggle:${item._id}`;
    try {
      setBusyKey(key);
      const token = await getToken();
      if (!token) return;
      await updateCanteenMenuItem(token, item._id, {
        isAvailable: !item.isAvailable,
      });
      await loadCatalog(false);
    } catch (error) {
      Alert.alert(
        "Lỗi",
        getCanteenErrorMessage(error, "Không đổi được trạng thái món"),
      );
    } finally {
      setBusyKey(null);
    }
  };

  const removeItem = async (item: MenuItem) => {
    const key = `delete:${item._id}`;
    try {
      setBusyKey(key);
      const token = await getToken();
      if (!token) return;
      await deleteCanteenMenuItem(token, item._id);
      await loadCatalog(false);
      if (editingId === item._id) resetForm();
      Alert.alert("Thành công", `Đã xóa ${item.name}. Có thể dùng Hoàn tác.`);
    } catch (error) {
      Alert.alert(
        "Lỗi",
        getCanteenErrorMessage(error, "Không xóa được món ăn"),
      );
    } finally {
      setBusyKey(null);
    }
  };

  const confirmRemove = (item: MenuItem) => {
    Alert.alert(
      "Xóa món ăn?",
      `Món “${item.name}” sẽ bị xóa khỏi dữ liệu. Bạn có thể hoàn tác ngay sau đó.`,
      [
        { text: "Không", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => void removeItem(item),
        },
      ],
    );
  };

  const runHistoryAction = async (action: "undo" | "redo") => {
    try {
      setBusyKey(action);
      const token = await getToken();
      if (!token) return;
      if (action === "undo") await undoCanteenMenuChange(token);
      else await redoCanteenMenuChange(token);
      await loadCatalog(false);
      resetForm();
    } catch (error) {
      Alert.alert(
        "Không thể thực hiện",
        getCanteenErrorMessage(
          error,
          action === "undo" ? "Không có thao tác để hoàn tác" : "Không có thao tác để làm lại",
        ),
      );
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return (
      <View className="items-center py-20">
        <ActivityIndicator size="large" color="#dc2626" />
      </View>
    );
  }

  return (
    <View>
      <View className="mb-4 rounded-3xl border border-red-100 bg-white p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-base font-black text-slate-900">
              {editingId ? "Chỉnh sửa món ăn" : "Tạo món ăn mới"}
            </Text>
            <Text className="mt-1 text-xs leading-5 text-slate-400">
              Mỗi tùy chọn nhập một dòng theo dạng: Tên | giá.
            </Text>
          </View>
          {editingId ? (
            <Pressable
              className="rounded-xl bg-slate-100 px-3 py-2"
              onPress={resetForm}
            >
              <Text className="text-xs font-bold text-slate-600">Tạo mới</Text>
            </Pressable>
          ) : null}
        </View>

        <Text className="mb-2 mt-4 text-[10px] font-black uppercase text-slate-400">
          Danh mục
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row pb-1">
            {categories.map((category) => {
              const selected = categoryId === category._id;
              return (
                <Pressable
                  key={category._id}
                  className={`mr-2 rounded-full border px-3 py-2 ${
                    selected
                      ? "border-red-500 bg-red-50"
                      : "border-slate-200 bg-white"
                  }`}
                  onPress={() => setCategoryId(category._id)}
                >
                  <Text
                    className={`text-xs font-bold ${
                      selected ? "text-red-600" : "text-slate-500"
                    }`}
                  >
                    {category.name}
                    {category.isActive === false ? " (ẩn)" : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <TextInput
          className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-800"
          maxLength={160}
          onChangeText={setName}
          placeholder="Tên món *"
          placeholderTextColor="#94a3b8"
          value={name}
        />
        <TextInput
          className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
          keyboardType="number-pad"
          onChangeText={setPrice}
          placeholder="Giá VND *"
          placeholderTextColor="#94a3b8"
          value={price}
        />
        <TextInput
          className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
          multiline
          onChangeText={setDescription}
          placeholder="Mô tả"
          placeholderTextColor="#94a3b8"
          value={description}
        />
        <TextInput
          autoCapitalize="none"
          className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
          onChangeText={setImageUrl}
          placeholder="URL ảnh"
          placeholderTextColor="#94a3b8"
          value={imageUrl}
        />
        <TextInput
          className="mt-2 min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
          multiline
          onChangeText={setOptionsText}
          placeholder={"Ví dụ:\nThêm trứng | 10000\nThêm cơm | 5000"}
          placeholderTextColor="#94a3b8"
          style={{ textAlignVertical: "top" }}
          value={optionsText}
        />

        <Pressable
          className={`mt-3 flex-row items-center justify-between rounded-2xl border px-3 py-3 ${
            isAvailable
              ? "border-emerald-200 bg-emerald-50"
              : "border-slate-200 bg-slate-50"
          }`}
          onPress={() => setIsAvailable((value) => !value)}
        >
          <Text
            className={`text-xs font-black ${
              isAvailable ? "text-emerald-700" : "text-slate-500"
            }`}
          >
            {isAvailable ? "Đang mở bán" : "Đang ẩn khỏi thực đơn"}
          </Text>
          <Ionicons
            name={isAvailable ? "toggle" : "toggle-outline"}
            size={28}
            color={isAvailable ? "#059669" : "#94a3b8"}
          />
        </Pressable>

        <Pressable
          className="mt-3 items-center rounded-2xl bg-red-600 py-3.5"
          disabled={busyKey !== null}
          onPress={saveItem}
        >
          {busyKey === "create" || busyKey === `save:${editingId}` ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-sm font-black text-white">
              {editingId ? "Lưu thay đổi" : "Tạo món"}
            </Text>
          )}
        </Pressable>
      </View>

      <View className="mb-4 flex-row">
        <Pressable
          className="mr-2 flex-1 flex-row items-center justify-center rounded-2xl border border-slate-200 bg-white py-3"
          disabled={busyKey !== null}
          onPress={() => runHistoryAction("undo")}
        >
          <Ionicons name="arrow-undo" size={17} color="#475569" />
          <Text className="ml-2 text-xs font-black text-slate-600">Hoàn tác</Text>
        </Pressable>
        <Pressable
          className="mr-2 flex-1 flex-row items-center justify-center rounded-2xl border border-slate-200 bg-white py-3"
          disabled={busyKey !== null}
          onPress={() => runHistoryAction("redo")}
        >
          <Ionicons name="arrow-redo" size={17} color="#475569" />
          <Text className="ml-2 text-xs font-black text-slate-600">Làm lại</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Tải lại danh mục"
          className="h-11 w-11 items-center justify-center rounded-2xl bg-red-50 active:bg-red-100"
          onPress={() => loadCatalog()}
        >
          <Ionicons name="refresh" size={18} color="#dc2626" />
        </Pressable>
      </View>

      <Text className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
        Lọc danh mục
      </Text>
      <ScrollView
        className="-mx-4 mb-4"
        contentContainerStyle={{ paddingHorizontal: 16 }}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {[{ _id: "ALL", name: "Tất cả" }, ...categories].map((category) => {
          const selected = categoryFilter === category._id;
          return (
            <Pressable
              key={category._id}
              className={`mr-2 rounded-full border px-3 py-2 ${
                selected
                  ? "border-red-500 bg-red-50"
                  : "border-slate-200 bg-white"
              }`}
              onPress={() => setCategoryFilter(category._id)}
            >
              <Text
                className={`text-xs font-bold ${
                  selected ? "text-red-600" : "text-slate-500"
                }`}
              >
                {category.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text className="mb-3 text-base font-black text-slate-800">
        {visibleItems.length} món ăn
      </Text>
      {visibleItems.length === 0 ? (
        <View className="items-center rounded-3xl bg-white py-12">
          <Ionicons name="restaurant-outline" size={38} color="#cbd5e1" />
          <Text className="mt-3 text-xs font-semibold text-slate-400">
            Chưa có món trong danh mục này
          </Text>
        </View>
      ) : (
        visibleItems.map((item) => (
          <View
            className="mb-3 rounded-3xl border border-slate-100 bg-white p-4"
            key={item._id}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-base font-black text-slate-900">
                  {item.name}
                </Text>
                <Text className="mt-1 text-xs font-bold text-red-600">
                  {formatMoney(item.price)} · {categoryById.get(item.categoryId)?.name ?? "Không rõ danh mục"}
                </Text>
                {item.description ? (
                  <Text className="mt-2 text-xs leading-5 text-slate-500">
                    {item.description}
                  </Text>
                ) : null}
                {item.options?.length ? (
                  <Text className="mt-2 text-[11px] leading-5 text-slate-400">
                    Tùy chọn: {item.options.map((option) => option.name).join(", ")}
                  </Text>
                ) : null}
              </View>
              <View
                className={`rounded-full px-2.5 py-1 ${
                  item.isAvailable ? "bg-emerald-50" : "bg-slate-100"
                }`}
              >
                <Text
                  className={`text-[10px] font-black ${
                    item.isAvailable ? "text-emerald-700" : "text-slate-500"
                  }`}
                >
                  {item.isAvailable ? "Đang bán" : "Đang ẩn"}
                </Text>
              </View>
            </View>

            <View className="mt-3 flex-row border-t border-slate-100 pt-3">
              <Pressable
                className="mr-2 flex-1 items-center rounded-xl bg-red-600 py-2.5 active:bg-red-700"
                onPress={() => editItem(item)}
              >
                <Text className="text-xs font-black text-white">Chỉnh sửa</Text>
              </Pressable>
              <Pressable
                className="mr-2 flex-1 items-center rounded-xl border border-emerald-200 bg-emerald-50 py-2.5"
                disabled={busyKey === `toggle:${item._id}`}
                onPress={() => toggleAvailability(item)}
              >
                {busyKey === `toggle:${item._id}` ? (
                  <ActivityIndicator color="#059669" size="small" />
                ) : (
                  <Text className="text-xs font-black text-emerald-700">
                    {item.isAvailable ? "Ẩn món" : "Mở bán"}
                  </Text>
                )}
              </Pressable>
              <Pressable
                accessibilityLabel={`Xóa ${item.name}`}
                className="h-10 w-10 items-center justify-center rounded-xl bg-rose-50"
                disabled={busyKey === `delete:${item._id}`}
                onPress={() => confirmRemove(item)}
              >
                {busyKey === `delete:${item._id}` ? (
                  <ActivityIndicator color="#e11d48" size="small" />
                ) : (
                  <Ionicons name="trash-outline" size={17} color="#e11d48" />
                )}
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );
}
