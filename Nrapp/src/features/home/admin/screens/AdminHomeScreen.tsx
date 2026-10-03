import {
  canManageAccounts,
  canManageTasks,
  canManageWorkSchedule,
  getRoleLabel,
} from "@/src/application/access/roles";
import { APP_ROUTES } from "@/src/application/navigation/routes";
import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import { useWorkscheduleAdmin } from "@/src/features/workschedule/admin/hooks/useWorkscheduleAdmin";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = ComponentProps<typeof Ionicons>["name"];

export default function AdminHomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthSession();
  const { getPendingSchedules, getTodayAttendance } = useWorkscheduleAdmin();
  const [pendingSchedules, setPendingSchedules] = useState(0);
  const [attendanceToday, setAttendanceToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const managesSchedule = canManageWorkSchedule(user?.role);

  const loadOverview = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      if (managesSchedule) {
        const [pending, attendance] = await Promise.all([
          getPendingSchedules(undefined, true),
          getTodayAttendance(true),
        ]);
        setPendingSchedules(pending.length);
        setAttendanceToday(attendance.length);
      }
      setLoading(false);
      setRefreshing(false);
    },
    [getPendingSchedules, getTodayAttendance, managesSchedule],
  );

  useFocusEffect(
    useCallback(() => {
      void loadOverview();
    }, [loadOverview]),
  );

  const tools = useMemo<
    { title: string; subtitle: string; icon: IconName; route: Href }[]
  >(
    () => [
      {
        title: "Lịch & chấm công",
        subtitle: managesSchedule
          ? `${pendingSchedules} lịch đang chờ duyệt`
          : "Theo dõi lịch làm cá nhân",
        icon: "calendar-outline",
        route: APP_ROUTES.admin.workschedule,
      },
      {
        title: "Điều phối công việc",
        subtitle: canManageTasks(user?.role)
          ? "Tạo, giao và theo dõi tiến độ"
          : "Xem công việc được phân công",
        icon: "checkbox-outline",
        route: APP_ROUTES.admin.todo,
      },
      {
        title: "Vận hành căn tin",
        subtitle: "Thực đơn, kho, bàn và báo cáo",
        icon: "restaurant-outline",
        route: APP_ROUTES.admin.canteen,
      },
      {
        title: "Danh bạ nhân sự",
        subtitle: canManageAccounts(user?.role)
          ? "Quản lý tài khoản và phân quyền"
          : "Tra cứu thông tin nội bộ",
        icon: "people-outline",
        route: APP_ROUTES.admin.directory,
      },
    ],
    [managesSchedule, pendingSchedules, user?.role],
  );

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar style="light" />
      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadOverview(true)}
            tintColor="#dc2626"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground
          source={require("@/assets/images/bg1.png")}
          resizeMode="cover"
          style={{ paddingTop: insets.top + 18, paddingBottom: 46 }}
        >
          <View className="absolute inset-0 bg-red-950/75" />
          <View className="flex-row items-center justify-between px-5">
            <Pressable
              accessibilityLabel="Mở hồ sơ cá nhân"
              accessibilityRole="button"
              className="flex-1 flex-row items-center active:opacity-80"
              onPress={() => router.push(APP_ROUTES.admin.profile)}
            >
              <View className="h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-red-600">
                <Text className="text-xl font-black text-white">
                  {(user?.name || "A").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[10px] font-black uppercase tracking-[2px] text-red-200">
                  Bảng điều hành
                </Text>
                <Text className="mt-1 text-xl font-black text-white" numberOfLines={1}>
                  {user?.name || "Quản trị viên"}
                </Text>
                <Text className="mt-1 text-xs font-semibold text-white/65">
                  {getRoleLabel(user?.role)}
                </Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityLabel="Mở trò chuyện"
              accessibilityRole="button"
              className="h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 active:bg-white/20"
              onPress={() => router.push(APP_ROUTES.admin.chat)}
            >
              <Ionicons name="chatbubbles-outline" size={21} color="#fecaca" />
            </Pressable>
          </View>
        </ImageBackground>

        <View className="-mt-5 px-4">
          <View className="mb-5 flex-row" style={{ gap: 10 }}>
            <View
              className="flex-1 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
              style={{ elevation: 2 }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-[10px] font-bold uppercase text-slate-500">
                  Chấm công hôm nay
                </Text>
                <View className="h-7 w-7 items-center justify-center rounded-xl bg-emerald-50">
                  <Ionicons name="checkmark-circle-outline" size={16} color="#10b981" />
                </View>
              </View>
              {loading ? (
                <ActivityIndicator className="mt-3 self-start" color="#dc2626" />
              ) : (
                <Text className="mt-2 text-3xl font-black text-slate-900">
                  {attendanceToday}
                </Text>
              )}
              <Text className="mt-1 text-[11px] text-slate-400">Nhân sự đã ghi nhận</Text>
            </View>
            <View
              className="flex-1 rounded-3xl border border-red-100 bg-white p-4 shadow-sm"
              style={{ elevation: 2 }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-[10px] font-bold uppercase text-red-600">Cần xử lý</Text>
                <View className="h-7 w-7 items-center justify-center rounded-xl bg-red-50">
                  <Ionicons name="time-outline" size={16} color="#dc2626" />
                </View>
              </View>
              {loading ? (
                <ActivityIndicator className="mt-3 self-start" color="#dc2626" />
              ) : (
                <Text className="mt-2 text-3xl font-black text-red-600">
                  {pendingSchedules}
                </Text>
              )}
              <Text className="mt-1 text-[11px] text-slate-400">Yêu cầu lịch chờ duyệt</Text>
            </View>
          </View>

          <View className="mb-3 ml-1 flex-row items-center justify-between">
            <Text className="text-base font-black text-slate-800">Công cụ quản trị</Text>
            <Pressable
              accessibilityLabel="Xem tất cả tiện ích quản trị"
              accessibilityRole="button"
              className="rounded-xl bg-red-50 px-3 py-2 active:bg-red-100"
              onPress={() => router.push(APP_ROUTES.admin.utilities)}
            >
              <Text className="text-xs font-black text-red-600">Xem tiện ích</Text>
            </Pressable>
          </View>

          <View style={{ gap: 10 }}>
            {tools.map((tool, index) => (
              <Pressable
                accessibilityRole="button"
                className="flex-row items-center rounded-3xl border border-slate-100 bg-white p-4 shadow-sm active:bg-red-50"
                key={tool.title}
                onPress={() => router.push(tool.route)}
                style={{ elevation: 1 }}
              >
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                  <Ionicons name={tool.icon} size={22} color="#dc2626" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-black text-slate-800">{tool.title}</Text>
                  <Text className="mt-1 text-[11px] leading-4 text-slate-400">
                    {tool.subtitle}
                  </Text>
                </View>
                <Text className="mr-2 text-[10px] font-black text-slate-300">
                  {String(index + 1).padStart(2, "0")}
                </Text>
                <Ionicons name="chevron-forward" size={17} color="#94a3b8" />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
