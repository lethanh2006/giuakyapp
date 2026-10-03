import { Ionicons } from "@expo/vector-icons";
import { APP_ROUTES } from "@/src/application/navigation/routes";
import { ScreenHeader } from "@/src/shared/ui/ScreenHeader";
import { router, type Href } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

type IconName = ComponentProps<typeof Ionicons>["name"];

type UtilityItem = {
  title: string;
  description: string;
  icon: IconName;
  color: string;
  background: string;
  route: Href;
};

export default function UserWorkscheduleUtilitiesScreen() {
  const utilities: UtilityItem[] = [
    {
      title: "Đăng ký lịch làm",
      description: "Chọn ngày và ca làm trong tháng đang mở đăng ký",
      icon: "calendar-outline",
      color: "#2563eb",
      background: "bg-blue-50",
      route: APP_ROUTES.user.workschedule,
    },
    {
      title: "Lịch làm việc",
      description: "Xem lịch tháng, trạng thái duyệt và lịch sử chấm công",
      icon: "calendar-number-outline",
      color: "#0891b2",
      background: "bg-cyan-50",
      route: "/(main)/user/utilities/calendar" as Href,
    },
    {
      title: "Đơn từ",
      description: "Nghỉ, đi muộn, về sớm, OT, công tác và remote",
      icon: "mail-outline",
      color: "#7c3aed",
      background: "bg-violet-50",
      route: "/(main)/user/utilities/requests" as Href,
    },
    {
      title: "Thống kê tháng",
      description: "Tổng hợp số buổi làm, remote, nghỉ và đơn đã duyệt",
      icon: "stats-chart-outline",
      color: "#059669",
      background: "bg-emerald-50",
      route: "/(main)/user/utilities/overview" as Href,
    },
  ];

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        onBack={() => router.back()}
        subtitle="Lịch làm, đơn từ và báo cáo cá nhân"
        title="Tiện ích nhân sự"
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          {utilities.map((item, index) => (
            <Pressable
              className={`flex-row items-center p-4 active:bg-slate-50 ${
                index < utilities.length - 1 ? "border-b border-slate-100" : ""
              }`}
              key={item.title}
              onPress={() => router.push(item.route)}
            >
              <View className={`h-12 w-12 items-center justify-center rounded-2xl ${item.background}`}>
                <Ionicons name={item.icon} size={23} color={item.color} />
              </View>
              <View className="ml-3 flex-1 pr-2">
                <Text className="text-sm font-black text-slate-800">{item.title}</Text>
                <Text className="mt-1 text-[11px] leading-4 text-slate-500">
                  {item.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
