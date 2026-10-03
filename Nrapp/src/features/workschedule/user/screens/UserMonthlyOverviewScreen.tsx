import { usePersonalWorkschedule } from "@/src/features/workschedule/shared/hooks/usePersonalWorkschedule";
import { useWorkRequests } from "@/src/features/workschedule/shared/hooks/useWorkRequests";
import type {
  IMonthlyScheduleOverview,
  IWorkRequestStats,
} from "@/src/services/workschedule/constant";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/src/shared/ui/ScreenHeader";
import { router, useFocusEffect } from "expo-router";
import type { ComponentProps } from "react";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

type IconName = ComponentProps<typeof Ionicons>["name"];

const getMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export default function UserMonthlyOverviewScreen() {
  const { getMonthlyOverview } = usePersonalWorkschedule();
  const { getStats } = useWorkRequests();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [schedule, setSchedule] = useState<IMonthlyScheduleOverview | null>(null);
  const [requests, setRequests] = useState<IWorkRequestStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const key = getMonthKey(month);
    const [scheduleData, requestData] = await Promise.all([
      getMonthlyOverview(key),
      getStats(key),
    ]);
    setSchedule(scheduleData);
    setRequests(requestData);
    setLoading(false);
  }, [getMonthlyOverview, getStats, month]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const changeMonth = (offset: number) =>
    setMonth(previous => new Date(previous.getFullYear(), previous.getMonth() + offset, 1));

  const metrics: { label: string; value: number | string; icon: IconName }[] = [
    {
      label: "Buổi đăng ký làm",
      value: schedule?.stats.registered_sessions || 0,
      icon: "calendar-outline",
    },
    {
      label: "Buổi đã duyệt",
      value: schedule?.stats.approved_sessions || 0,
      icon: "checkmark-circle-outline",
    },
    {
      label: "Xin nghỉ đã duyệt",
      value: requests?.approved_by_type.leave || 0,
      icon: "bed-outline",
    },
    {
      label: "Đi muộn đã duyệt",
      value: requests?.approved_by_type.late || 0,
      icon: "time-outline",
    },
    {
      label: "Về sớm đã duyệt",
      value: requests?.approved_by_type.early || 0,
      icon: "exit-outline",
    },
    {
      label: "Giờ OT đã duyệt",
      value: requests?.approved_overtime_hours || 0,
      icon: "flash-outline",
    },
  ];

  const distribution = [
    { label: "Tại công ty", value: schedule?.stats.office_sessions || 0 },
    {
      label: "Làm từ xa",
      value: (schedule?.stats.remote_sessions || 0) + (requests?.approved_by_type.remote || 0),
    },
    { label: "Nghỉ phép", value: schedule?.stats.leave_sessions || 0 },
  ];
  const maxDistribution = Math.max(1, ...distribution.map(item => item.value));

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        onBack={() => router.back()}
        subtitle="Lịch làm và đơn từ đã được xử lý"
        title="Thống kê tháng"
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="mb-4 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white p-2">
          <Pressable className="h-10 w-10 items-center justify-center" onPress={() => changeMonth(-1)}>
            <Ionicons name="chevron-back" size={20} color="#475569" />
          </Pressable>
          <Text className="text-sm font-black text-slate-800">
            Tháng {month.getMonth() + 1}/{month.getFullYear()}
          </Text>
          <Pressable className="h-10 w-10 items-center justify-center" onPress={() => changeMonth(1)}>
            <Ionicons name="chevron-forward" size={20} color="#475569" />
          </Pressable>
        </View>

        {loading ? (
          <View className="items-center py-24">
            <ActivityIndicator color="#2563eb" />
            <Text className="mt-3 text-xs text-slate-400">Đang tổng hợp dữ liệu...</Text>
          </View>
        ) : (
          <>
            <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <View className="flex-row flex-wrap">
                {metrics.map((metric, index) => (
                  <View
                    className={`w-1/2 p-4 ${
                      index % 2 === 0 ? "border-r border-slate-100" : ""
                    } ${index < metrics.length - 2 ? "border-b border-slate-100" : ""}`}
                    key={metric.label}
                  >
                    <View className="h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                      <Ionicons name={metric.icon} size={17} color="#2563eb" />
                    </View>
                    <Text className="mt-3 text-xl font-black text-slate-900">
                      {metric.value}
                    </Text>
                    <Text className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">
                      {metric.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
              <Text className="text-sm font-black text-slate-800">Phân bổ buổi đã duyệt</Text>
              <Text className="mt-1 text-[11px] text-slate-500">Theo hình thức làm việc trong tháng</Text>
              <View className="mt-5 gap-4">
                {distribution.map(item => (
                  <View key={item.label}>
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="text-xs font-bold text-slate-600">{item.label}</Text>
                      <Text className="text-xs font-black text-slate-800">{item.value}</Text>
                    </View>
                    <View className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <View
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${(item.value / maxDistribution) * 100}%` }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-black text-slate-800">
                  Đơn trong tháng
                </Text>
                <Text className="text-2xl font-black text-blue-600">
                  {requests?.total || 0}
                </Text>
              </View>
              <View className="mt-4 flex-row border-t border-slate-100 pt-4">
                {[
                  ["Chờ duyệt", requests?.pending || 0],
                  ["Đã duyệt", requests?.approved || 0],
                  ["Từ chối", requests?.rejected || 0],
                ].map(([label, value], index) => (
                  <View
                    className={`flex-1 items-center ${index ? "border-l border-slate-100" : ""}`}
                    key={String(label)}
                  >
                    <Text className="text-lg font-black text-slate-900">
                      {value}
                    </Text>
                    <Text className="mt-1 text-[10px] font-semibold text-slate-500">
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
