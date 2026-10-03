import {
  getRoleLabel,
} from "@/src/application/access/roles";
import { APP_ROUTES } from "@/src/application/navigation/routes";
import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import { normalizeUser } from "@/src/shared/model/normalize-user";
import {
  deleteMyAccount,
  updateMyEmail,
} from "@/src/services/auth/auth.service";
import { updateMyDisplayName } from "@/src/services/user/user.service";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import { getApiErrorMessage } from "@/src/utils/apiHelper";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = ComponentProps<typeof Ionicons>["name"];

function InfoRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: IconName;
  label: string;
  value: ReactNode;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center py-4 ${
        last ? "" : "border-b border-slate-100"
      }`}
    >
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
        <Ionicons name={icon} size={19} color="#475569" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </Text>
        <Text className="text-sm font-bold leading-5 text-slate-800">
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { getToken, logoutUser, setUser, user } = useAuthSession();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const accentColor = "#2563eb";
  const displayName = user?.name?.trim() || "Người dùng";
  const initial = displayName.charAt(0).toUpperCase();
  const roleLabel = user ? getRoleLabel(user.role) : "Nhân viên";

  const openEditor = () => {
    setDraftName(displayName);
    setDraftEmail(user?.email || "");
    setEditing(true);
  };

  const cancelEditor = () => {
    if (saving) return;
    setEditing(false);
  };

  const saveProfile = async () => {
    if (!user || saving) return;

    const name = draftName.trim();
    const email = draftEmail.trim().toLowerCase();
    if (!name) {
      Alert.alert("Thông báo", "Tên hiển thị không được để trống.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      Alert.alert("Thông báo", "Email chưa đúng định dạng.");
      return;
    }

    const nameChanged = name !== displayName;
    const emailChanged = email !== user.email.trim().toLowerCase();
    if (!nameChanged && !emailChanged) {
      setEditing(false);
      return;
    }

    try {
      setSaving(true);
      const token = await getToken();
      if (!token) {
        Alert.alert("Lỗi", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        return;
      }

      let nextUser = user;
      if (nameChanged) {
        const { data } = await updateMyDisplayName(token, name);
        const updated = normalizeUser(data.user);
        nextUser = {
          ...nextUser,
          name: updated.name || name,
          username: updated.username || name,
        };
        setUser(nextUser);
      }

      if (emailChanged) {
        const { data } = await updateMyEmail(token, email);
        nextUser = { ...nextUser, email: data.email || email };
        setUser(nextUser);
      }

      setEditing(false);
      Alert.alert("Thành công", "Thông tin tài khoản đã được cập nhật.");
    } catch (error) {
      Alert.alert(
        "Lỗi",
        getApiErrorMessage(error, "Không cập nhật được thông tin tài khoản."),
      );
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      router.replace(APP_ROUTES.auth.login);
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      "Đăng xuất?",
      "Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng WorkSpace.",
      [
        { text: "Ở lại", style: "cancel" },
        { text: "Đăng xuất", style: "destructive", onPress: logout },
      ],
    );
  };

  const removeAccount = async () => {
    if (deleting) return;
    try {
      setDeleting(true);
      const token = await getToken();
      if (!token) {
        Alert.alert("Lỗi", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        return;
      }
      await deleteMyAccount(token);
      await logoutUser();
      router.replace(APP_ROUTES.auth.login);
    } catch (error) {
      Alert.alert(
        "Lỗi",
        getApiErrorMessage(error, "Không thể xóa tài khoản lúc này."),
      );
    } finally {
      setDeleting(false);
    }
  };

  const confirmRemoveAccount = () => {
    Alert.alert(
      "Xóa tài khoản?",
      "Tài khoản và quyền truy cập của bạn sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.",
      [
        { text: "Giữ tài khoản", style: "cancel" },
        {
          text: "Xóa vĩnh viễn",
          style: "destructive",
          onPress: removeAccount,
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar style="light" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground
          source={require("@/assets/images/bg1.png")}
          resizeMode="cover"
          style={{ paddingTop: insets.top + 14, paddingBottom: 58 }}
        >
          <View className="absolute inset-0 bg-blue-950/75" />

          <View className="mb-7 px-5">
            <View>
              <Text className="text-[11px] font-black uppercase tracking-[2px] text-white/60">
                WorkSpace
              </Text>
              <Text className="mt-1 text-2xl font-black tracking-tight text-white">
                Hồ sơ cá nhân
              </Text>
            </View>
          </View>

          <View className="items-center px-5">
            <View className="relative">
              <View className="h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-blue-600 shadow-lg">
                <Text className="text-5xl font-black text-white">{initial}</Text>
              </View>
              <View className="absolute bottom-1 right-1 h-7 w-7 items-center justify-center rounded-full border-[3px] border-white bg-emerald-500">
                <Ionicons name="checkmark" size={13} color="white" />
              </View>
            </View>
            <Text className="mt-4 text-2xl font-black text-white">
              {displayName}
            </Text>
            <View className="mt-2 flex-row items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
              <Ionicons
                name="briefcase-outline"
                size={13}
                color="#bfdbfe"
              />
              <Text className="ml-1.5 text-xs font-bold text-blue-100">
                {roleLabel}
              </Text>
            </View>
          </View>
        </ImageBackground>

        <View className="-mt-7 px-4">
          <View
            className="mb-4 flex-row items-center rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
            style={{ elevation: 3 }}
          >
            <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-black text-slate-800">
                Tài khoản đang hoạt động
              </Text>
              <Text className="mt-0.5 text-xs leading-4 text-slate-400">
                Phiên đăng nhập của bạn đang được bảo vệ
              </Text>
            </View>
          </View>

          <View className="mb-3 ml-1 flex-row items-center justify-between">
            <Text className="text-base font-black text-slate-800">
              Thông tin tài khoản
            </Text>
            {!editing ? (
              <Pressable
                accessibilityLabel="Chỉnh sửa thông tin tài khoản"
                className="flex-row items-center rounded-xl bg-blue-50 px-3 py-2 active:bg-blue-100"
                disabled={deleting}
                onPress={openEditor}
              >
                <Ionicons name="create-outline" size={16} color={accentColor} />
                <Text className="ml-1 text-xs font-black text-blue-600">
                  Chỉnh sửa
                </Text>
              </Pressable>
            ) : null}
          </View>

          {editing ? (
            <View className="mb-4 rounded-3xl border border-blue-100 bg-white p-4">
              <Text className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                Tên hiển thị
              </Text>
              <TextInput
                autoCapitalize="words"
                className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800"
                editable={!saving}
                maxLength={80}
                onChangeText={setDraftName}
                placeholder="Nhập tên hiển thị"
                placeholderTextColor="#94a3b8"
                value={draftName}
              />
              <Text className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                Email tài khoản
              </Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800"
                editable={!saving}
                keyboardType="email-address"
                maxLength={160}
                onChangeText={setDraftEmail}
                placeholder="ten@congty.vn"
                placeholderTextColor="#94a3b8"
                value={draftEmail}
              />
              <View className="mt-4 flex-row">
                <Pressable
                  className="mr-3 flex-1 items-center rounded-2xl bg-slate-100 py-3 active:bg-slate-200"
                  disabled={saving}
                  onPress={cancelEditor}
                >
                  <Text className="text-sm font-black text-slate-600">Hủy</Text>
                </Pressable>
                <Pressable
                  className={`flex-1 flex-row items-center justify-center rounded-2xl py-3 ${
                    saving ? "bg-blue-300" : "bg-blue-600 active:bg-blue-700"
                  }`}
                  disabled={saving}
                  onPress={() => void saveProfile()}
                >
                  {saving ? <ActivityIndicator color="white" size="small" /> : null}
                  <Text className={`${saving ? "ml-2" : ""} text-sm font-black text-white`}>
                    {saving ? "Đang lưu" : "Lưu thay đổi"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View className="mb-4 rounded-3xl border border-slate-100 bg-white px-4">
              <InfoRow
                icon="person-outline"
                label="Tên hiển thị"
                value={displayName}
              />
              <InfoRow
                icon="mail-outline"
                label="Email tài khoản"
                value={user?.email || "Chưa cập nhật"}
              />
              <InfoRow
                icon="id-card-outline"
                label="Mã nhân viên"
                value={user?._id || "Chưa cập nhật"}
                last
              />
            </View>
          )}

          <View className="mb-5 flex-row items-start rounded-2xl bg-blue-50 p-4">
            <Ionicons name="information-circle" size={20} color="#2563eb" />
            <Text className="ml-2 flex-1 text-xs leading-5 text-blue-700">
              Tên hiển thị và email sẽ được đồng bộ với hệ thống sau khi bạn lưu.
              Vai trò tài khoản chỉ quản trị viên mới có thể thay đổi.
            </Text>
          </View>

          <Pressable
            onPress={confirmLogout}
            className="flex-row items-center justify-center rounded-2xl border border-red-100 bg-red-50 py-4 active:bg-red-100"
          >
            <Ionicons name="log-out-outline" size={21} color="#dc2626" />
            <Text className="ml-2 text-sm font-black text-red-600">
              Đăng xuất khỏi hệ thống
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Xóa tài khoản vĩnh viễn"
            className={`mt-3 flex-row items-center justify-center rounded-2xl border py-4 ${
              deleting
                ? "border-slate-200 bg-slate-100"
                : "border-slate-200 bg-white active:bg-red-50"
            }`}
            disabled={deleting || saving}
            onPress={confirmRemoveAccount}
          >
            {deleting ? (
              <ActivityIndicator color="#64748b" size="small" />
            ) : (
              <Ionicons name="trash-outline" size={20} color="#64748b" />
            )}
            <Text className="ml-2 text-sm font-black text-slate-500">
              {deleting ? "Đang xóa tài khoản" : "Xóa tài khoản vĩnh viễn"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
