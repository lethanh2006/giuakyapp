import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import { getCanteenErrorMessage } from "@/src/features/canteen/shared/model/presentation";
import {
  createCanteenTable,
  deleteCanteenTable,
  listCanteenTables,
  updateCanteenTable,
  updateCanteenTableStatus,
  type CanteenTable,
  type CanteenTableStatus,
  type CreateCanteenTableInput,
} from "@/src/services/canteen/table.service";
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

const TABLE_STATUS_LABELS: Record<CanteenTableStatus, string> = {
  empty: "Trống",
  occupied: "Đang dùng",
  reserved: "Đã đặt",
};

const TABLE_STATUSES: CanteenTableStatus[] = ["empty", "occupied", "reserved"];

export default function AdminTableManager({ refreshKey = 0 }: Props) {
  const { getToken } = useAuthSession();
  const [tables, setTables] = useState<CanteenTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("4");

  const loadTables = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
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
        Alert.alert(
          "Lỗi",
          getCanteenErrorMessage(error, "Không tải được danh sách bàn"),
        );
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [getToken],
  );

  useEffect(() => {
    void loadTables();
  }, [loadTables, refreshKey]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCapacity("4");
  };

  const startEditing = (table: CanteenTable) => {
    setEditingId(table._id);
    setName(table.name);
    setCapacity(String(table.capacity));
  };

  const saveTable = async () => {
    const normalizedName = name.trim();
    const normalizedCapacity = Number(capacity.trim());
    if (!normalizedName) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên bàn");
      return;
    }
    if (!Number.isSafeInteger(normalizedCapacity) || normalizedCapacity < 1) {
      Alert.alert(
        "Sức chứa không hợp lệ",
        "Sức chứa phải là số nguyên từ 1 trở lên",
      );
      return;
    }

    const payload: CreateCanteenTableInput = {
      name: normalizedName,
      capacity: normalizedCapacity,
    };
    const key = editingId ? `save:${editingId}` : "create";
    try {
      setBusyKey(key);
      const token = await getToken();
      if (!token) return;
      if (editingId) {
        await updateCanteenTable(token, editingId, payload);
      } else {
        await createCanteenTable(token, payload);
      }
      await loadTables(false);
      resetForm();
      Alert.alert(
        "Thành công",
        editingId ? "Đã cập nhật bàn" : "Đã tạo bàn mới",
      );
    } catch (error) {
      Alert.alert("Lỗi", getCanteenErrorMessage(error, "Không lưu được bàn"));
    } finally {
      setBusyKey(null);
    }
  };

  const changeStatus = async (
    table: CanteenTable,
    status: CanteenTableStatus,
  ) => {
    const key = `status:${table._id}:${status}`;
    try {
      setBusyKey(key);
      const token = await getToken();
      if (!token) return;
      await updateCanteenTableStatus(token, table._id, status);
      await loadTables(false);
    } catch (error) {
      Alert.alert(
        "Lỗi",
        getCanteenErrorMessage(error, "Không đổi được trạng thái bàn"),
      );
    } finally {
      setBusyKey(null);
    }
  };

  const removeTable = async (table: CanteenTable) => {
    try {
      setBusyKey(`delete:${table._id}`);
      const token = await getToken();
      if (!token) return;
      await deleteCanteenTable(token, table._id);
      if (editingId === table._id) resetForm();
      await loadTables(false);
      Alert.alert("Thành công", `Đã xóa ${table.name}`);
    } catch (error) {
      Alert.alert(
        "Không thể xóa",
        getCanteenErrorMessage(error, "Chỉ có thể xóa bàn đang trống"),
      );
    } finally {
      setBusyKey(null);
    }
  };

  const confirmRemove = (table: CanteenTable) => {
    Alert.alert(
      "Xóa bàn?",
      `Xóa “${table.name}”? Chỉ bàn đang trống mới có thể xóa.`,
      [
        { text: "Không", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => void removeTable(table),
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
          <Text className="text-base font-black text-slate-900">
            {editingId ? "Chỉnh sửa bàn" : "Tạo bàn mới"}
          </Text>
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
          maxLength={80}
          onChangeText={setName}
          placeholder="Tên bàn *"
          placeholderTextColor="#94a3b8"
          value={name}
        />
        <TextInput
          className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
          keyboardType="number-pad"
          onChangeText={setCapacity}
          placeholder="Sức chứa *"
          placeholderTextColor="#94a3b8"
          value={capacity}
        />
        <Pressable
          className="mt-3 items-center rounded-2xl bg-red-600 py-3.5"
          disabled={busyKey !== null}
          onPress={saveTable}
        >
          {busyKey === "create" || busyKey === `save:${editingId}` ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-sm font-black text-white">
              {editingId ? "Lưu thay đổi" : "Tạo bàn"}
            </Text>
          )}
        </Pressable>
      </View>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-black text-slate-800">
          {tables.length} bàn ăn
        </Text>
        <Pressable
          accessibilityLabel="Tải lại danh sách bàn"
          className="h-10 w-10 items-center justify-center rounded-xl bg-red-50 active:bg-red-100"
          onPress={() => loadTables()}
        >
          <Ionicons color="#dc2626" name="refresh" size={17} />
        </Pressable>
      </View>

      {tables.length === 0 ? (
        <View className="items-center rounded-3xl bg-white py-12">
          <Ionicons color="#cbd5e1" name="grid-outline" size={38} />
          <Text className="mt-3 text-xs font-semibold text-slate-400">
            Chưa có bàn ăn
          </Text>
        </View>
      ) : (
        tables.map((table) => (
          <View
            className="mb-3 rounded-3xl border border-slate-100 bg-white p-4"
            key={table._id}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-base font-black text-slate-900">
                  {table.name}
                </Text>
                <Text className="mt-1 text-xs font-bold text-red-600">
                  Sức chứa {table.capacity} người
                </Text>
              </View>
              <View
                className={`rounded-full px-2.5 py-1 ${
                  table.status === "empty"
                    ? "bg-emerald-50"
                    : table.status === "reserved"
                      ? "bg-amber-50"
                      : "bg-rose-50"
                }`}
              >
                <Text
                  className={`text-[10px] font-black ${
                    table.status === "empty"
                      ? "text-emerald-700"
                      : table.status === "reserved"
                        ? "text-amber-700"
                        : "text-rose-700"
                  }`}
                >
                  {TABLE_STATUS_LABELS[table.status]}
                </Text>
              </View>
            </View>

            <View className="mt-3 flex-row border-t border-slate-100 pt-3">
              {TABLE_STATUSES.map((status) => {
                const selected = table.status === status;
                return (
                  <Pressable
                    className={`mr-2 flex-1 items-center rounded-xl border py-2.5 ${
                      selected
                        ? "border-red-500 bg-red-50"
                        : "border-slate-200 bg-white"
                    }`}
                    disabled={busyKey !== null || selected}
                    key={status}
                    onPress={() => changeStatus(table, status)}
                  >
                    {busyKey === `status:${table._id}:${status}` ? (
                      <ActivityIndicator color="#dc2626" size="small" />
                    ) : (
                      <Text
                        className={`text-[10px] font-black ${
                          selected ? "text-red-600" : "text-slate-500"
                        }`}
                      >
                        {TABLE_STATUS_LABELS[status]}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
            <View className="mt-2 flex-row">
              <Pressable
                className="mr-2 flex-1 items-center rounded-xl bg-red-600 py-2.5 active:bg-red-700"
                onPress={() => startEditing(table)}
              >
                <Text className="text-xs font-black text-white">Chỉnh sửa</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Xóa ${table.name}`}
                className="h-10 w-10 items-center justify-center rounded-xl bg-rose-50"
                disabled={busyKey !== null || table.status !== "empty"}
                onPress={() => confirmRemove(table)}
              >
                {busyKey === `delete:${table._id}` ? (
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
