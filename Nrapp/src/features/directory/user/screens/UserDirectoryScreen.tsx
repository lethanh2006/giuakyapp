import { getRoleLabel } from "@/src/application/access/roles";
import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import { getAllUsers } from "@/src/services/user/user.service";
import type { User } from "@/src/services/user/constant";
import { normalizeUser } from "@/src/shared/model/normalize-user";
import { getApiErrorMessage } from "@/src/utils/apiHelper";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";

const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();

export default function UserDirectoryScreen() {
  const { getToken, user: currentUser } = useAuthSession();
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadUsers = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setErrorMessage("");
      try {
        const token = await getToken();
        if (!token) {
          setErrorMessage("Phiên đăng nhập đã hết hạn.");
          return;
        }
        const { data } = await getAllUsers(token);
        setUsers((data.users || []).map(normalizeUser));
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "Không tải được danh bạ."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken],
  );

  useFocusEffect(
    useCallback(() => {
      void loadUsers();
    }, [loadUsers]),
  );

  const filteredUsers = useMemo(() => {
    const keyword = normalizeSearch(query);
    if (!keyword) return users;
    return users.filter((user) =>
      normalizeSearch(`${user.name || ""} ${user.email || ""}`).includes(keyword),
    );
  }, [query, users]);

  return (
    <View className="flex-1 bg-slate-50">
      <View className="border-b border-blue-100 bg-blue-600 px-4 pb-5 pt-4">
        <View className="flex-row items-center">
          <Pressable
            accessibilityLabel="Quay lại"
            className="h-10 w-10 items-center justify-center rounded-xl bg-white/15"
            hitSlop={8}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={21} color="#fff" />
          </Pressable>
          <View className="ml-3 flex-1">
            <Text className="text-xl font-black text-white">Danh bạ đồng nghiệp</Text>
            <Text className="mt-1 text-xs text-blue-100">
              Tra cứu thông tin liên hệ trong công ty
            </Text>
          </View>
        </View>

        <View className="mt-4 flex-row items-center rounded-2xl bg-white px-3">
          <Ionicons name="search" size={19} color="#64748b" />
          <TextInput
            className="ml-2 h-12 flex-1 text-sm text-slate-800"
            onChangeText={setQuery}
            placeholder="Tìm theo tên hoặc email..."
            placeholderTextColor="#94a3b8"
            value={query}
          />
          {query ? (
            <Pressable accessibilityLabel="Xóa tìm kiếm" onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={19} color="#94a3b8" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
          <Text className="mt-3 text-xs text-slate-500">Đang tải danh bạ...</Text>
        </View>
      ) : errorMessage ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={34} color="#94a3b8" />
          <Text className="mt-3 text-center text-sm font-bold text-slate-700">
            {errorMessage}
          </Text>
          <Pressable
            className="mt-4 rounded-xl bg-blue-600 px-5 py-3"
            onPress={() => void loadUsers()}
          >
            <Text className="text-xs font-black text-white">Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          data={filteredUsers}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-xs font-black uppercase tracking-wider text-slate-500">
                {filteredUsers.length} thành viên
              </Text>
              <Text className="text-[11px] text-slate-400">Chỉ xem</Text>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center rounded-3xl border border-slate-200 bg-white p-10">
              <Ionicons name="people-outline" size={34} color="#94a3b8" />
              <Text className="mt-3 text-sm font-black text-slate-700">
                Không tìm thấy đồng nghiệp
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadUsers(true)}
              tintColor="#2563eb"
            />
          }
          renderItem={({ item }) => {
            const isCurrentUser = item._id === currentUser?._id;
            return (
              <View className="mb-3 flex-row items-center rounded-3xl border border-slate-200 bg-white p-4">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                  <Text className="text-lg font-black text-blue-700">
                    {(item.name || item.email || "N").charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="ml-3 min-w-0 flex-1">
                  <View className="flex-row items-center">
                    <Text className="flex-shrink text-sm font-black text-slate-800" numberOfLines={1}>
                      {item.name || "Chưa cập nhật tên"}
                    </Text>
                    {isCurrentUser ? (
                      <View className="ml-2 rounded-full bg-blue-50 px-2 py-0.5">
                        <Text className="text-[9px] font-black text-blue-700">BẠN</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text className="mt-1 text-xs text-slate-500" numberOfLines={1}>
                    {item.email || "Chưa có email"}
                  </Text>
                  <Text className="mt-1 text-[10px] font-bold uppercase text-blue-600">
                    {getRoleLabel(item.role)}
                  </Text>
                </View>
                <Ionicons name="person-circle-outline" size={23} color="#cbd5e1" />
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
