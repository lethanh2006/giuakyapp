import { APP_ROUTES } from "@/src/application/navigation/routes";
import { ScreenHeader } from "@/src/shared/ui/ScreenHeader";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

type IconName = ComponentProps<typeof Ionicons>["name"];

const ADMIN_TOOLS: {
  title: string;
  description: string;
  icon: IconName;
  route: Href;
  badge: string;
}[] = [
  {
    title: "Điều hành lịch làm",
    description: "Duyệt đăng ký tháng, thiết lập chính sách và phát mã chấm công.",
    icon: "shield-checkmark-outline",
    route: APP_ROUTES.admin.workschedule,
    badge: "Vận hành",
  },
  {
    title: "Lịch toàn hệ thống",
    description: "Theo dõi lịch đăng ký của nhân viên theo tháng và trạng thái.",
    icon: "calendar-number-outline",
    route: "/(main)/admin/utilities/calendar" as Href,
    badge: "Nhân sự",
  },
  {
    title: "Duyệt đơn nhân sự",
    description: "Xử lý đơn nghỉ, đi muộn, tăng ca, công tác và làm từ xa.",
    icon: "documents-outline",
    route: "/(main)/admin/utilities/requests" as Href,
    badge: "Chờ xử lý",
  },
  {
    title: "Báo cáo vận hành",
    description: "Tổng hợp chấm công và mức độ hoàn thành theo nhân viên.",
    icon: "analytics-outline",
    route: "/(main)/admin/utilities/overview" as Href,
    badge: "Báo cáo",
  },
];

export default function AdminWorkscheduleUtilitiesScreen() {
  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        onBack={() => router.back()}
        subtitle="Công cụ dành riêng cho khối quản trị"
        tone="admin"
        title="Trung tâm vận hành"
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 overflow-hidden rounded-3xl bg-red-900 p-5">
          <View className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
          <View className="absolute -bottom-14 left-10 h-28 w-28 rounded-full bg-red-800/40" />
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
            <Ionicons name="settings-outline" size={23} color="#fff" />
          </View>
          <Text className="mt-4 text-xl font-black text-white">
            Quản lý nguồn lực tập trung
          </Text>
          <Text className="mt-2 max-w-[320px] text-xs leading-5 text-red-100">
            Theo dõi lịch, đơn từ và chấm công của toàn bộ nhân sự từ một khu vực.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          {ADMIN_TOOLS.map((item, index) => (
            <Pressable
              accessibilityLabel={item.title}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 active:bg-red-50"
              key={item.title}
              onPress={() => router.push(item.route)}
            >
              <View className="flex-row items-start">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                  <Ionicons name={item.icon} size={23} color="#dc2626" />
                </View>
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 pr-2 text-sm font-black text-slate-900">
                      {item.title}
                    </Text>
                    <View className="rounded-full bg-red-50 px-2.5 py-1">
                      <Text className="text-[9px] font-black uppercase text-red-700">
                        {item.badge}
                      </Text>
                    </View>
                  </View>
                  <Text className="mt-2 text-xs leading-5 text-slate-500">
                    {item.description}
                  </Text>
                </View>
              </View>
              <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                  Mở công cụ {String(index + 1).padStart(2, "0")}
                </Text>
                <Ionicons name="arrow-forward" size={17} color="#dc2626" />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
