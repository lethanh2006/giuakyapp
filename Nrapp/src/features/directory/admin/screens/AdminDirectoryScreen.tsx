import {
  canManageAccounts,
  getRoleLabel,
  ROLE_OPTIONS,
} from "@/src/application/access/roles";
import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import { normalizeUser } from "@/src/shared/model/normalize-user";
import {
  deleteUserByAdmin,
  updateUserRoleByAdmin,
} from "@/src/services/auth/auth.service";
import {
  normalizeAppRole,
  type KnownAppRole,
  type User,
} from "@/src/services/user/constant";
import { getAllUsers } from "@/src/services/user/user.service";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import { getApiErrorMessage } from "@/src/utils/apiHelper";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";

const ROLE_BADGES: Record<KnownAppRole, { background: string; text: string }> =
  {
    admin: { background: "bg-red-50", text: "text-red-700" },
    user: { background: "bg-blue-50", text: "text-blue-700" },
  };

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .trim();

const getKnownRole = (role: User["role"]): KnownAppRole => {
  const normalized = normalizeAppRole(role);
  const match = ROLE_OPTIONS.find((option) => option.value === normalized);
  return match?.value || "user";
};

export default function AdminDirectoryScreen() {
  const area = "admin" as const;
  const { getToken, user: currentUser } = useAuthSession();
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<KnownAppRole>("user");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const hasAccountPermission = canManageAccounts(currentUser?.role);

  const loadUsers = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setInitialLoading(true);
      setErrorMessage("");

      try {
        const token = await getToken();
        if (!token) {
          setErrorMessage(
            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          );
          return;
        }
        const { data } = await getAllUsers(token);
        setUsers((data.users || []).map(normalizeUser));
      } catch (error) {
        setErrorMessage(
          getApiErrorMessage(error, "Không tải được danh bạ nhân sự."),
        );
      } finally {
        setInitialLoading(false);
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
    const normalizedQuery = normalizeSearchText(query);
    return [...users]
      .filter((candidate) => {
        if (!normalizedQuery) return true;
        const searchable = [
          candidate.name,
          candidate.username,
          candidate._id,
          ...(hasAccountPermission
            ? [
                candidate.email,
                getRoleLabel(candidate.role),
                String(candidate.role),
              ]
            : []),
        ]
          .filter(Boolean)
          .map((value) => normalizeSearchText(String(value)))
          .join(" ");
        return searchable.includes(normalizedQuery);
      })
      .sort((left, right) => left.name.localeCompare(right.name, "vi"));
  }, [hasAccountPermission, query, users]);

  const openRoleEditor = (target: User) => {
    if (!hasAccountPermission || target._id === currentUser?._id) return;
    if (editingUserId === target._id) {
      setEditingUserId(null);
      return;
    }
    setSelectedRole(getKnownRole(target.role));
    setEditingUserId(target._id);
  };

  const applyRole = async (target: User) => {
    if (!hasAccountPermission || busyUserId) return;
    try {
      setBusyUserId(target._id);
      const token = await getToken();
      if (!token) {
        Alert.alert(
          "Lỗi",
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        );
        return;
      }
      await updateUserRoleByAdmin(token, target._id, selectedRole);
      setUsers((current) =>
        current.map((candidate) =>
          candidate._id === target._id
            ? { ...candidate, role: selectedRole }
            : candidate,
        ),
      );
      setEditingUserId(null);
      Alert.alert(
        "Thành công",
        `Đã đổi vai trò của ${target.name} thành ${getRoleLabel(selectedRole)}.`,
      );
    } catch (error) {
      Alert.alert(
        "Lỗi",
        getApiErrorMessage(error, "Không cập nhật được vai trò người dùng."),
      );
    } finally {
      setBusyUserId(null);
    }
  };

  const confirmRoleUpdate = (target: User) => {
    const currentRole = getKnownRole(target.role);
    if (selectedRole === currentRole) {
      setEditingUserId(null);
      return;
    }
    Alert.alert(
      "Xác nhận đổi vai trò",
      `${target.name} sẽ chuyển từ ${getRoleLabel(currentRole)} sang ${getRoleLabel(selectedRole)}.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đổi vai trò",
          onPress: () => applyRole(target),
        },
      ],
    );
  };

  const removeUser = async (target: User) => {
    if (!hasAccountPermission || busyUserId) return;
    try {
      setBusyUserId(target._id);
      const token = await getToken();
      if (!token) {
        Alert.alert(
          "Lỗi",
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        );
        return;
      }
      await deleteUserByAdmin(token, target._id);
      setUsers((current) =>
        current.filter((candidate) => candidate._id !== target._id),
      );
      setEditingUserId(null);
      Alert.alert("Thành công", `Đã xóa tài khoản của ${target.name}.`);
    } catch (error) {
      Alert.alert(
        "Lỗi",
        getApiErrorMessage(error, "Không xóa được tài khoản người dùng."),
      );
    } finally {
      setBusyUserId(null);
    }
  };

  const confirmRemoveUser = (target: User) => {
    Alert.alert(
      "Xóa tài khoản?",
      `Tài khoản của ${target.name} sẽ bị xóa vĩnh viễn và không thể đăng nhập lại.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa tài khoản",
          style: "destructive",
          onPress: () => removeUser(target),
        },
      ],
    );
  };

  const renderUser = ({ item }: { item: User }) => {
    const role = getKnownRole(item.role);
    const roleBadge = ROLE_BADGES[role];
    const isSelf = item._id === currentUser?._id;
    const isEditing = editingUserId === item._id;
    const isBusy = busyUserId === item._id;
    const initial = (item.name || item.email || "N").charAt(0).toUpperCase();

    return (
      <View className="mb-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <View className="flex-row items-center">
          <View
            className={`h-12 w-12 items-center justify-center rounded-2xl ${
              area === "admin" ? "bg-red-50" : "bg-blue-50"
            }`}
          >
            <Text
              className={`text-lg font-black ${
                area === "admin" ? "text-red-700" : "text-blue-700"
              }`}
            >
              {initial}
            </Text>
          </View>
          <View className="ml-3 min-w-0 flex-1">
            <View className="flex-row items-center">
              <Text
                className="min-w-0 flex-shrink text-sm font-black text-slate-800"
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {isSelf ? (
                <View className="ml-2 rounded-full bg-slate-100 px-2 py-1">
                  <Text className="text-[9px] font-black uppercase text-slate-500">
                    Bạn
                  </Text>
                </View>
              ) : null}
            </View>
            <Text className="mt-1 text-xs text-slate-500" numberOfLines={1}>
              {hasAccountPermission
                ? item.email || "Chưa có email"
                : `Mã nhân sự: ${item._id}`}
            </Text>
          </View>
          {hasAccountPermission ? (
            <View
              className={`ml-2 rounded-full px-2.5 py-1.5 ${roleBadge.background}`}
            >
              <Text className={`text-[10px] font-black ${roleBadge.text}`}>
                {getRoleLabel(role)}
              </Text>
            </View>
          ) : null}
        </View>

        {hasAccountPermission && !isSelf ? (
          <Pressable
            accessibilityLabel={`Quản lý tài khoản ${item.name}`}
            className="mt-3 flex-row items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 py-2.5 active:bg-slate-100"
            disabled={Boolean(busyUserId)}
            onPress={() => openRoleEditor(item)}
          >
            {isBusy ? (
              <ActivityIndicator color="#475569" size="small" />
            ) : (
              <Ionicons
                name={isEditing ? "chevron-up" : "settings-outline"}
                size={17}
                color="#475569"
              />
            )}
            <Text className="ml-2 text-xs font-black text-slate-600">
              {isBusy
                ? "Đang xử lý"
                : isEditing
                  ? "Đóng quản lý"
                  : "Quản lý tài khoản"}
            </Text>
          </Pressable>
        ) : null}

        {isEditing ? (
          <View className="mt-3 border-t border-slate-100 pt-3">
            <Text className="mb-2 text-xs font-black text-slate-700">
              Chọn vai trò mới
            </Text>
            <View className="flex-row flex-wrap justify-between">
              {ROLE_OPTIONS.map((option) => {
                const selected = selectedRole === option.value;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    className={`mb-2 items-center rounded-xl border px-2 py-2.5 ${
                      selected
                        ? "border-red-500 bg-red-50"
                        : "border-slate-200 bg-white"
                    }`}
                    key={option.value}
                    onPress={() => setSelectedRole(option.value)}
                    style={{ width: "48.5%" }}
                  >
                    <Text
                      className={`text-xs font-black ${
                        selected ? "text-red-700" : "text-slate-600"
                      }`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View className="mt-1 flex-row">
              <Pressable
                className="mr-2 flex-1 flex-row items-center justify-center rounded-2xl border border-red-100 bg-red-50 py-3 active:bg-red-100"
                disabled={Boolean(busyUserId)}
                onPress={() => confirmRemoveUser(item)}
              >
                <Ionicons name="trash-outline" size={17} color="#dc2626" />
                <Text className="ml-1.5 text-xs font-black text-red-600">
                  Xóa
                </Text>
              </Pressable>
              <Pressable
                className="flex-[1.6] flex-row items-center justify-center rounded-2xl bg-red-600 py-3 active:bg-red-700"
                disabled={Boolean(busyUserId)}
                onPress={() => confirmRoleUpdate(item)}
              >
                <Ionicons name="save-outline" size={17} color="white" />
                <Text className="ml-1.5 text-xs font-black text-white">
                  Lưu vai trò
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <FlatList
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      data={filteredUsers}
      keyExtractor={(item) => item._id}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        <View className="items-center rounded-3xl border border-slate-100 bg-white px-5 py-10">
          {initialLoading ? (
            <ActivityIndicator
              color={area === "admin" ? "#dc2626" : "#2563eb"}
            />
          ) : (
            <Ionicons
              name={errorMessage ? "cloud-offline-outline" : "people-outline"}
              size={36}
              color="#94a3b8"
            />
          )}
          <Text className="mt-3 text-center text-sm font-black text-slate-700">
            {initialLoading
              ? "Đang tải danh bạ"
              : errorMessage
                ? "Không tải được danh bạ"
                : "Không tìm thấy nhân sự"}
          </Text>
          <Text className="mt-1 text-center text-xs leading-5 text-slate-500">
            {errorMessage ||
              (query
                ? "Hãy thử tên, email hoặc vai trò khác."
                : "Danh bạ hiện chưa có dữ liệu.")}
          </Text>
          {errorMessage ? (
            <Pressable
              className="mt-4 rounded-2xl bg-slate-800 px-5 py-3 active:bg-slate-900"
              onPress={() => void loadUsers()}
            >
              <Text className="text-xs font-black text-white">Thử lại</Text>
            </Pressable>
          ) : null}
        </View>
      }
      ListHeaderComponent={
        <>
          <View
            className={`mb-4 overflow-hidden rounded-3xl px-5 py-5 ${
              area === "admin" ? "bg-red-600" : "bg-blue-600"
            }`}
          >
            <View className="absolute -right-8 -top-12 h-32 w-32 rounded-full bg-white/10" />
            <View className="flex-row items-center">
              <Pressable
                accessibilityLabel="Quay lại"
                className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-white/15 active:bg-white/25"
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={20} color="white" />
              </Pressable>
              <View className="flex-1">
                <Text className="text-xl font-black text-white">
                  Danh bạ nhân sự
                </Text>
                <Text className="mt-1 text-xs leading-5 text-white/80">
                  {hasAccountPermission
                    ? "Tìm kiếm, phân quyền và quản lý tài khoản."
                    : "Tìm nhanh thông tin liên hệ trong hệ thống."}
                </Text>
              </View>
            </View>
          </View>

          {errorMessage && users.length > 0 ? (
            <View className="mb-3 flex-row items-center rounded-2xl border border-amber-100 bg-amber-50 p-3">
              <Ionicons name="warning-outline" size={18} color="#d97706" />
              <Text className="ml-2 flex-1 text-xs leading-5 text-amber-800">
                {errorMessage}
              </Text>
              <Pressable
                accessibilityLabel="Tải lại danh bạ"
                className="ml-2 rounded-xl bg-amber-100 px-3 py-2 active:bg-amber-200"
                onPress={() => void loadUsers()}
              >
                <Text className="text-[10px] font-black text-amber-800">
                  Tải lại
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View className="mb-3 flex-row items-center rounded-2xl border border-slate-200 bg-white px-4">
            <Ionicons name="search" size={19} color="#64748b" />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              className="ml-2 flex-1 py-3.5 text-sm font-semibold text-slate-800"
              onChangeText={setQuery}
              placeholder={
                hasAccountPermission
                  ? "Tìm theo tên, email hoặc vai trò"
                  : "Tìm theo tên hoặc mã nhân sự"
              }
              placeholderTextColor="#94a3b8"
              returnKeyType="search"
              value={query}
            />
            {query ? (
              <Pressable
                accessibilityLabel="Xóa từ khóa tìm kiếm"
                className="h-8 w-8 items-center justify-center"
                onPress={() => setQuery("")}
              >
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </Pressable>
            ) : null}
          </View>

          <View className="mb-3 flex-row items-center justify-between px-1">
            <Text className="text-xs font-black uppercase tracking-wide text-slate-500">
              {query ? "Kết quả tìm kiếm" : "Tất cả nhân sự"}
            </Text>
            <Text className="text-xs font-bold text-slate-400">
              {filteredUsers.length}/{users.length}
            </Text>
          </View>
        </>
      }
      refreshControl={
        <RefreshControl
          colors={[area === "admin" ? "#dc2626" : "#2563eb"]}
          onRefresh={() => void loadUsers(true)}
          refreshing={refreshing}
          tintColor={area === "admin" ? "#dc2626" : "#2563eb"}
        />
      }
      renderItem={renderUser}
      showsVerticalScrollIndicator={false}
    />
  );
}
