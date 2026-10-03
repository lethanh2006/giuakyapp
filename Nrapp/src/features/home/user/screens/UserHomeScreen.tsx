import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePersonalWorkschedule } from "@/src/features/workschedule/shared/hooks/usePersonalWorkschedule";
import type {
  IScheduleEntry,
} from "@/src/services/workschedule/constant";
import { getScheduleDateKey, getScheduleToday, toLocalDateKey } from "@/src/features/workschedule/shared/utils/date";
import { APP_ROUTES } from "@/src/application/navigation/routes";

export default function UserHomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthSession();
  const areaRoutes = APP_ROUTES.user;
  const [todayDate, setTodayDate] = useState(new Date());

  const { getMySchedules, loading } = usePersonalWorkschedule();
  const [scheduleEntries, setScheduleEntries] = useState<IScheduleEntry[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTodayDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadSchedule = async () => {
        const schedules = await getMySchedules();
        if (!isActive) return;

        setScheduleEntries(schedules
          .filter(schedule => schedule.status === "approved")
          .flatMap(schedule => schedule.entries || []));
        setHasLoaded(true);
      };

      loadSchedule();
      return () => {
        isActive = false;
      };
    }, [getMySchedules])
  );

  const getVietnameseDayName = (date: Date) => {
    const days = [
      "CHỦ NHẬT",
      "THỨ HAI",
      "THỨ BA",
      "THỨ TƯ",
      "THỨ NĂM",
      "THỨ SÁU",
      "THỨ BẢY",
    ];
    return days[date.getDay()];
  };

  const getVietnameseFullDate = (date: Date) => {
    const dayName = getVietnameseDayName(date);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${dayName}, ${day} THÁNG ${month < 10 ? "0" + month : month}`;
  };

  const today = getScheduleToday(todayDate);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const renderScheduleBox = (entry: IScheduleEntry | undefined) => {
    if (!entry) {
      return (
        <View className="bg-slate-50 border border-slate-100 rounded-xl p-2">
          <Text className="text-slate-500 text-[11px] font-extrabold leading-tight">
            Nghỉ ngơi
          </Text>
          <Text className="text-slate-400 text-[9px] font-semibold mt-1">
            Không có lịch làm việc
          </Text>
        </View>
      );
    }

    const periodTime =
      entry.period === "morning"
        ? "08:30 - 12:00"
        : entry.period === "afternoon"
          ? "13:30 - 17:30"
          : "08:30 - 17:30";

    switch (entry.type) {
      case "office":
        return (
          <View className="bg-blue-50/70 border-l-4 border-blue-500 rounded-r-xl p-2">
            <Text className="text-blue-900 text-[11px] font-extrabold leading-tight">
              Lên công ty
            </Text>
            <Text className="text-blue-700 text-[9px] font-bold mt-1">
              {periodTime}
            </Text>
            <Text className="text-blue-500 text-[9px] font-semibold mt-0.5" numberOfLines={1}>
              {entry.note || "Gaming Studio 1"}
            </Text>
          </View>
        );
      case "remote":
        return (
          <View className="bg-purple-50/70 border-l-4 border-purple-500 rounded-r-xl p-2">
            <Text className="text-purple-900 text-[11px] font-extrabold leading-tight">
              Làm việc từ xa
            </Text>
            <Text className="text-purple-700 text-[9px] font-bold mt-1">
              {periodTime}
            </Text>
            <Text className="text-purple-500 text-[9px] font-semibold mt-0.5" numberOfLines={1}>
              {entry.note || "Online qua Slack/Meet"}
            </Text>
          </View>
        );
      case "day_off":
        return (
          <View className="bg-slate-50 border border-slate-200 rounded-xl p-2">
            <Text className="text-slate-700 text-[11px] font-extrabold leading-tight">
              Ngày nghỉ
            </Text>
            <Text className="text-slate-500 text-[9px] font-bold mt-1">
              Cả ngày
            </Text>
            <Text className="text-slate-400 text-[9px] font-semibold mt-0.5" numberOfLines={1}>
              {entry.note || "Nghỉ tuần"}
            </Text>
          </View>
        );
      case "leave":
        return (
          <View className="bg-orange-50 border border-orange-200 rounded-xl p-2">
            <Text className="text-orange-800 text-[11px] font-extrabold leading-tight">
              Nghỉ phép
            </Text>
            <Text className="text-orange-600 text-[9px] font-bold mt-1">
              Cả ngày
            </Text>
            <Text className="text-orange-500 text-[9px] font-semibold mt-0.5" numberOfLines={1}>
              {entry.note || "Đã đăng ký phép"}
            </Text>
          </View>
        );
      default:
        return (
          <View className="bg-slate-50 border border-slate-100 rounded-xl p-2">
            <Text className="text-slate-500 text-[11px] font-extrabold leading-tight">
              Nghỉ ngơi
            </Text>
            <Text className="text-slate-400 text-[9px] font-semibold mt-1">
              Không có lịch làm việc
            </Text>
          </View>
        );
    }
  };

  const todayEntry = scheduleEntries.find(e => getScheduleDateKey(e.date) === getScheduleDateKey(todayDate));
  const tomorrowEntry = scheduleEntries.find(e => getScheduleDateKey(e.date) === toLocalDateKey(tomorrow));

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <ImageBackground
        source={require("@/assets/images/bg1.png")}
        className="w-full relative overflow-hidden"
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 48,
        }}
        resizeMode="cover"
      >
        <View
          className="absolute inset-0 bg-blue-950/30"
        />

        <View className="flex-row items-center justify-between px-4 z-10">
          <Pressable
            onPress={() => router.push(areaRoutes.profile)}
            className="mr-3 flex-1 flex-row items-center active:opacity-80"
          >
            <View
              className="h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-blue-700/80"
            >
              <Text className="text-white text-xl font-black">
                {user?.name ? user.name.charAt(0).toUpperCase() : "H"}
              </Text>
            </View>

            <View className="ml-3 flex-1 justify-center">
              <Text
                className="text-white text-lg font-black tracking-wide"
                numberOfLines={1}
              >
                {user?.name}
              </Text>
              <Text className="mt-0.5 text-[10px] font-semibold text-white/70">
                Xem hồ sơ cá nhân
              </Text>
            </View>
          </Pressable>

          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Pressable
              accessibilityLabel="Mở danh bạ nhân sự"
              onPress={() => router.push(areaRoutes.directory)}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/15 active:opacity-80"
            >
              <Ionicons name="search" size={20} color="white" />
            </Pressable>

            <Pressable
              onPress={() =>
                router.push(areaRoutes.utilities)
              }
              accessibilityLabel="Mở tiện ích lịch làm"
              className="h-10 w-10 items-center justify-center rounded-full bg-white/15 active:opacity-80"
            >
              <Ionicons name="calendar" size={20} color="white" />
            </Pressable>
          </View>
        </View>
      </ImageBackground>

      {!todayEntry && !tomorrowEntry && hasLoaded ? (
        <View
          className="mx-4 bg-white rounded-3xl p-5 -mt-8 shadow-md border border-slate-100 items-center justify-center min-h-[110px]"
          style={{
            elevation: 4,
          }}
        >
          <Ionicons name="calendar-outline" size={28} color="#94a3b8" className="mb-1.5" />
          <Text className="text-slate-500 text-xs font-bold text-center">
            Chưa có lịch đã duyệt cho hôm nay và ngày mai
          </Text>
          <Pressable
            onPress={() => router.push(areaRoutes.workschedule)}
            className="mt-2 flex-row items-center rounded-full bg-blue-50 px-4 py-1.5 active:opacity-80"
          >
            <Ionicons name="add-circle" size={14} color="#2563eb" />
            <Text className="text-blue-600 text-[10px] font-extrabold uppercase tracking-wider ml-0.5">
              Đăng ký lịch ngay
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() =>
            router.push(
              areaRoutes.workschedule
            )
          }
          className="mx-4 bg-white rounded-3xl p-5 -mt-8 shadow-md border border-slate-100 flex-row justify-between min-h-[110px] active:opacity-90"
          style={{
            elevation: 4,
          }}
        >
          {loading && !hasLoaded ? (
            <View className="flex-1 items-center justify-center py-4">
              <ActivityIndicator size="small" color="#3b82f6" />
            </View>
          ) : (
            <>
              <View className="flex-1 pr-4 border-r border-slate-100">
                <Text className="text-rose-600 text-xs font-black tracking-wider uppercase mb-1">
                  {getVietnameseDayName(todayDate)}
                </Text>
                <Text className="text-slate-800 text-4xl font-black tracking-tighter mb-3">
                  {todayDate.getDate()}
                </Text>
                {renderScheduleBox(todayEntry)}
              </View>
              <View className="flex-1 pl-4 justify-between">
                <Text className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider mb-2">
                  {getVietnameseFullDate(tomorrow)}
                </Text>
                {renderScheduleBox(tomorrowEntry)}
              </View>
            </>
          )}
        </Pressable>
      )}

      <View className="p-4" style={{ gap: 20 }}>
        <View className="mt-2">
          <View className="flex-row items-center justify-between mb-3.5">
            <Text className="text-base font-black text-slate-800 tracking-tight">
              Chức năng
            </Text>
          </View>

          <View className="flex-row items-center justify-between rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <Pressable
              onPress={() => router.push(areaRoutes.chat)}
              className="flex-1 items-center justify-center active:opacity-70"
            >
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                <Ionicons name="chatbubbles" size={24} color="#3b82f6" />
              </View>
              <Text className="text-[11px] text-slate-700 font-extrabold text-center mt-2.5">
                Trò chuyện
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push(areaRoutes.todo)}
              className="flex-1 items-center justify-center active:opacity-70"
            >
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                <Ionicons name="checkbox" size={24} color="#10b981" />
              </View>
              <Text className="text-[11px] text-slate-700 font-extrabold text-center mt-2.5">
                Nhiệm vụ
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push(areaRoutes.canteen)}
              className="flex-1 items-center justify-center active:opacity-70"
            >
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
                <Ionicons name="restaurant" size={24} color="#f97316" />
              </View>
              <Text className="text-[11px] text-slate-700 font-extrabold text-center mt-2.5">
                Căn tin
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                router.push(areaRoutes.utilities)
              }
              className="flex-1 items-center justify-center active:opacity-70"
            >
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-purple-50">
                <Ionicons name="calendar-sharp" size={24} color="#a855f7" />
              </View>
              <Text className="text-[11px] text-slate-700 font-extrabold text-center mt-2.5">
                Lịch làm
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="mt-1">
          <View className="flex-row items-center justify-between mb-3.5">
            <Text className="text-base font-black text-slate-800 tracking-tight">
              Tin tức
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <Pressable
              onPress={() =>
                Alert.alert(
                  "Công bố Game mới RPG Thần Thoại",
                  "Dự án game nhập vai 'Thần Thoại Việt' sử dụng công nghệ đồ họa Unreal Engine 5 đỉnh cao đã chính thức công bố thử nghiệm bản Alpha Test cho nhân viên nội bộ trải nghiệm. Hãy cùng tải game và đóng góp ý kiến để hoàn thiện siêu phẩm nhé!"
                )
              }
              className="flex-row items-center rounded-3xl border border-slate-100 bg-white p-3 shadow-sm active:opacity-80"
            >
              <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-rose-500">
                <Ionicons name="game-controller" size={32} color="white" />
              </View>

              <View className="flex-1 ml-3.5 justify-center">
                <Text
                  className="text-[12px] font-black text-slate-800 leading-tight mb-1"
                  numberOfLines={2}
                >
                  HDG Studio công bố thử nghiệm Alpha Test dự án Game RPG mới!
                </Text>
                <Text
                  className="text-[10px] text-slate-400 font-bold leading-normal"
                  numberOfLines={2}
                >
                  Đội ngũ Game Dev của HDG vừa hé lộ các hình ảnh đồ họa cực khủng của game nhập vai đỉnh cao...
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() =>
                Alert.alert(
                  "Đăng ký Teambuilding 2026",
                  "Chào hè rực rỡ, HDG Studio tổ chức chuyến teambuilding 4 ngày 3 đêm hoành tráng tại Nha Trang cho toàn thể anh em nhân viên từ ngày 15/06 - 18/06. Vui lòng đăng ký tham gia với phòng Nhân sự trước thứ Sáu để ban tổ chức chuẩn bị xe và phòng khách sạn chu đáo nhất!"
                )
              }
              className="flex-row items-center rounded-3xl border border-slate-100 bg-white p-3 shadow-sm active:opacity-80"
            >
              <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-cyan-500">
                <Ionicons name="sunny" size={32} color="white" />
              </View>

              <View className="flex-1 ml-3.5 justify-center">
                <Text
                  className="text-[12px] font-black text-slate-800 leading-tight mb-1"
                  numberOfLines={2}
                >
                  Đăng ký ngay Teambuilding Hè 2026 tại Nha Trang hoành tráng!
                </Text>
                <Text
                  className="text-[10px] text-slate-400 font-bold leading-normal"
                  numberOfLines={2}
                >
                  Chương trình du lịch gắn kết, giao lưu âm nhạc và các thử thách đồng đội hấp dẫn đang chờ đón...
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() =>
                Alert.alert(
                  "HDG Marathon 2026",
                  "Phát động giải chạy bộ HDG Marathon 2026 cự ly 5km - 10km - 21km dành cho tất cả thành viên công ty. Hoạt động nhằm cổ vũ lối sống lành mạnh, rèn luyện sức bền bỉ kiên trì. Cơ cấu giải thưởng siêu lớn với huy chương thiết kế độc quyền từ HDG!"
                )
              }
              className="flex-row items-center rounded-3xl border border-slate-100 bg-white p-3 shadow-sm active:opacity-80"
            >
              <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-amber-500">
                <Ionicons name="footsteps" size={32} color="white" />
              </View>

              <View className="flex-1 ml-3.5 justify-center">
                <Text
                  className="text-[12px] font-black text-slate-800 leading-tight mb-1"
                  numberOfLines={2}
                >
                  Phát động giải chạy marathon HDG Run 2026 - Rèn luyện sức khỏe!
                </Text>
                <Text
                  className="text-[10px] text-slate-400 font-bold leading-normal"
                  numberOfLines={2}
                >
                  Cự ly linh hoạt dành cho nam nữ, tặng áo thun chạy bộ cao cấp cùng huy chương lưu niệm hoàn thành...
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}
