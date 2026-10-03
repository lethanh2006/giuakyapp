import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import { getCanteenErrorMessage } from "@/src/features/canteen/shared/model/presentation";
import {
  createCanteenCategory,
  deleteCanteenCategory,
  listCanteenCategories,
  updateCanteenCategory,
  type CanteenCategory,
  type CreateCanteenCategoryInput,
} from "@/src/services/canteen/category.service";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

type Props = {
  refreshKey?: number;
};

export default function AdminCategoryManager({ refreshKey = 0 }: Props) {
  const { getToken } = useAuthSession();
  const [categories, setCategories] = useState<CanteenCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const loadCategories = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const result = await listCanteenCategories({
        page: 1,
        limit: 100,
        sortBy: "displayOrder",
        sortOrder: "asc",
      });
      setCategories(result.data);
    } catch (error) {
      Alert.alert(
        "Lỗi",
        getCanteenErrorMessage(error, "Không tải được danh mục món ăn"),
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories, refreshKey]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setDisplayOrder("0");
    setIsActive(true);
  };

  const startEditing = (category: CanteenCategory) => {
    setEditingId(category._id);
    setName(category.name);
    setDescription(category.description);
    setDisplayOrder(String(category.displayOrder ?? 0));
    setIsActive(category.isActive !== false);
  };

  const saveCategory = async () => {
    const normalizedName = name.trim();
    const normalizedDescription = description.trim();
    const normalizedOrder = Number(displayOrder.trim());
    if (!normalizedName || !normalizedDescription) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên và mô tả danh mục");
      return;
    }
    if (!Number.isSafeInteger(normalizedOrder) || normalizedOrder < 0) {
      Alert.alert("Thứ tự không hợp lệ", "Thứ tự phải là số nguyên không âm");
      return;
    }

    const payload: CreateCanteenCategoryInput = {
      name: normalizedName,
      description: normalizedDescription,
      displayOrder: normalizedOrder,
      isActive,
    };
    const key = editingId ? `save:${editingId}` : "create";
    try {
      setBusyKey(key);
      const token = await getToken();
      if (!token) return;
      if (editingId) {
        await updateCanteenCategory(token, editingId, payload);
      } else {
        await createCanteenCategory(token, payload);
      }
      await loadCategories(false);
      resetForm();
      Alert.alert(
        "Thành công",
        editingId ? "Đã cập nhật danh mục" : "Đã tạo danh mục",
      );
    } catch (error) {
      Alert.alert(
        "Lỗi",
        getCanteenErrorMessage(error, "Không lưu được danh mục"),
      );
    } finally {
      setBusyKey(null);
    }
  };

  const toggleCategory = async (category: CanteenCategory) => {
    const key = `toggle:${category._id}`;
    try {
      setBusyKey(key);
      const token = await getToken();
      if (!token) return;
      await updateCanteenCategory(token, category._id, {
        isActive: !category.isActive,
      });
      await loadCategories(false);
    } catch (error) {
      Alert.alert(
        "Lỗi",
        getCanteenErrorMessage(error, "Không đổi được trạng thái danh mục"),
      );
    } finally {
      setBusyKey(null);
    }
  };

  const removeCategory = async (category: CanteenCategory) => {
    try {
      setBusyKey(`delete:${category._id}`);
      const token = await getToken();
      if (!token) return;
      await deleteCanteenCategory(token, category._id);
      if (editingId === category._id) resetForm();
      await loadCategories(false);
      Alert.alert("Thành công", `Đã xóa danh mục ${category.name}`);
    } catch (error) {
      Alert.alert(
        "Không thể xóa",
        getCanteenErrorMessage(error, "Không xóa được danh mục"),
      );
    } finally {
      setBusyKey(null);
    }
  };

  const confirmRemove = (category: CanteenCategory) => {
    Alert.alert(
      "Xóa danh mục?",
      `Xóa “${category.name}”? Hãy chắc chắn không còn món ăn dùng danh mục này.`,
      [
        { text: "Không", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => void removeCategory(category),
        },
      ],
    );
  };

  if (loading) {
    return (
      <View className="items-center py-20">
        <ActivityIndicator color="#dc2626" size="large" />
      </View>
    );
  }

  return (
    <View>
      <View className="mb-4 rounded-3xl border border-red-100 bg-white p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-base font-black text-slate-900">
              {editingId ? "Chỉnh sửa danh mục" : "Tạo danh mục mới"}
            </Text>
            <Text className="mt-1 text-xs leading-5 text-slate-400">
              Danh mục đang ẩn vẫn có thể dùng khi quản trị món ăn.
            </Text>
          </View>
          {editingId ? (
            <Pressable
              className="rounded-xl bg-slate-100 px-3 py-2"
              onPress={resetForm}
            >
              <Text className="text-xs font-black text-slate-600">Tạo mới</Text>
            </Pressable>
          ) : null}
        </View>

        <TextInput
          className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-800"
          maxLength={120}
          onChangeText={setName}
          placeholder="Tên danh mục *"
          placeholderTextColor="#94a3b8"
          value={name}
        />
        <TextInput
          className="mt-2 min-h-20 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
          maxLength={500}
          multiline
          onChangeText={setDescription}
          placeholder="Mô tả *"
          placeholderTextColor="#94a3b8"
          style={{ textAlignVertical: "top" }}
          value={description}
        />
        <TextInput
          className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
          keyboardType="number-pad"
          onChangeText={setDisplayOrder}
          placeholder="Thứ tự hiển thị"
          placeholderTextColor="#94a3b8"
          value={displayOrder}
        />
        <Pressable
          className={`mt-2 flex-row items-center justify-between rounded-2xl border px-3 py-3 ${
            isActive
              ? "border-emerald-200 bg-emerald-50"
              : "border-slate-200 bg-slate-50"
          }`}
          onPress={() => setIsActive((current) => !current)}
        >
          <Text
            className={`text-xs font-black ${
              isActive ? "text-emerald-700" : "text-slate-500"
            }`}
          >
            {isActive ? "Đang hiển thị" : "Đang ẩn"}
          </Text>
          <Ionicons
            color={isActive ? "#059669" : "#94a3b8"}
            name={isActive ? "toggle" : "toggle-outline"}
            size={28}
          />
        </Pressable>
        <Pressable
          className="mt-3 items-center rounded-2xl bg-red-600 py-3.5"
          disabled={busyKey !== null}
          onPress={saveCategory}
        >
          {busyKey === "create" || busyKey === `save:${editingId}` ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-sm font-black text-white">
              {editingId ? "Lưu thay đổi" : "Tạo danh mục"}
            </Text>
          )}
        </Pressable>
      </View>

      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-black text-slate-800">
          {categories.length} danh mục
        </Text>
        <Pressable
          accessibilityLabel="Tải lại danh mục"
          className="h-10 w-10 items-center justify-center rounded-xl bg-red-50 active:bg-red-100"
          onPress={() => loadCategories()}
        >
          <Ionicons color="#dc2626" name="refresh" size={17} />
        </Pressable>
      </View>

      {categories.length === 0 ? (
        <View className="items-center rounded-3xl bg-white py-12">
          <Ionicons color="#cbd5e1" name="albums-outline" size={38} />
          <Text className="mt-3 text-xs font-semibold text-slate-400">
            Chưa có danh mục món ăn
          </Text>
        </View>
      ) : (
        categories.map((category) => (
          <View
            className="mb-3 rounded-3xl border border-slate-100 bg-white p-4"
            key={category._id}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-base font-black text-slate-900">
                  {category.name}
                </Text>
                <Text className="mt-1 text-xs leading-5 text-slate-500">
                  {category.description}
                </Text>
                <Text className="mt-2 text-[11px] font-bold text-slate-400">
                  Thứ tự: {category.displayOrder ?? 0}
                </Text>
              </View>
              <View
                className={`rounded-full px-2.5 py-1 ${
                  category.isActive ? "bg-emerald-50" : "bg-slate-100"
                }`}
              >
                <Text
                  className={`text-[10px] font-black ${
                    category.isActive ? "text-emerald-700" : "text-slate-500"
                  }`}
                >
                  {category.isActive ? "Hiển thị" : "Đang ẩn"}
                </Text>
              </View>
            </View>
            <View className="mt-3 flex-row border-t border-slate-100 pt-3">
              <Pressable
                className="mr-2 flex-1 items-center rounded-xl bg-red-600 py-2.5 active:bg-red-700"
                onPress={() => startEditing(category)}
              >
                <Text className="text-xs font-black text-white">Chỉnh sửa</Text>
              </Pressable>
              <Pressable
                className="mr-2 flex-1 items-center rounded-xl border border-emerald-200 bg-emerald-50 py-2.5"
                disabled={busyKey === `toggle:${category._id}`}
                onPress={() => toggleCategory(category)}
              >
                {busyKey === `toggle:${category._id}` ? (
                  <ActivityIndicator color="#059669" size="small" />
                ) : (
                  <Text className="text-xs font-black text-emerald-700">
                    {category.isActive ? "Ẩn" : "Hiện"}
                  </Text>
                )}
              </Pressable>
              <Pressable
                accessibilityLabel={`Xóa ${category.name}`}
                className="h-10 w-10 items-center justify-center rounded-xl bg-rose-50"
                disabled={busyKey === `delete:${category._id}`}
                onPress={() => confirmRemove(category)}
              >
                {busyKey === `delete:${category._id}` ? (
                  <ActivityIndicator color="#e11d48" size="small" />
                ) : (
                  <Ionicons color="#e11d48" name="trash-outline" size={17} />
                )}
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );
}
