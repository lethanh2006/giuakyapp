import {
  type AdminAttendanceRecord,
  type AdminScheduleRequest,
  useWorkscheduleAdmin,
} from "@/src/features/workschedule/admin/hooks/useWorkscheduleAdmin";
import { toLocalDateKey } from "@/src/features/workschedule/shared/utils/date";
import { ScreenHeader } from "@/src/shared/ui/ScreenHeader";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

const employeeName = (record: AdminAttendanceRecord) =>
  record.employee?.name ||
  record.employee?.username ||
  record.employee?.email ||
  "Nhân viên";

export default function AdminMonthlyOverviewScreen() {
  const { getAllSchedules, getReport } = useWorkscheduleAdmin();
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [attendance, setAttendance] = useState<AdminAttendanceRecord[]>([]);
  const [schedules, setSchedules] = useState<AdminScheduleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const range = useMemo(() => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    return { from: toLocalDateKey(from), to: toLocalDateKey(to) };
  }, [month]);

  const loadData = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const [attendanceRows, scheduleRows] = await Promise.all([
        getReport(range, true),
        getAllSchedules({ ...range, status: "all" }, true),
      ]);
      setAttendance(attendanceRows);
      setSchedules(scheduleRows);
      setLoading(false);
      setRefreshing(false);
    },
    [getAllSchedules, getReport, range],
  );

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const stats = useMemo(() => {
    const employees = new Set(
      attendance.map((item) => String(item.employee?._id || item.employee_id)),
    ).size;
    return {
      employees,
      completed: attendance.filter((item) => item.check_out_at).length,
      pending: schedules.filter((item) => item.status === "pending").length,
      approved: schedules.filter((item) => item.status === "approved").length,
    };
  }, [attendance, schedules]);

  const recentAttendance = useMemo(
    () =>
      [...attendance]
        .sort(
          (left, right) =>
            new Date(right.date).getTime() - new Date(left.date).getTime(),
        )
        .slice(0, 8),
    [attendance],
  );

  const changeMonth = (offset: number) =>
    setMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        onBack={() => router.back()}
        subtitle="Dữ liệu tổng hợp của toàn bộ nhân sự"
        tone="admin"
        title="Báo cáo vận hành"
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadData(true)}
            tintColor="#ef4444"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 flex-row items-center rounded-2xl border border-slate-200 bg-white p-2">
          <Pressable
            accessibilityLabel="Xem tháng trước"
            className="h-10 w-10 items-center justify-center rounded-xl bg-red-50"
            onPress={() => changeMonth(-1)}
          >
            <Ionicons name="chevron-back" size={18} color="#dc2626" />
          </Pressable>
          <View className="flex-1 items-center">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Kỳ báo cáo
            </Text>
            <Text className="mt-0.5 text-sm font-black text-slate-900">
              Tháng {month.getMonth() + 1}/{month.getFullYear()}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Xem tháng sau"
            className="h-10 w-10 items-center justify-center rounded-xl bg-red-50"
            onPress={() => changeMonth(1)}
          >
            <Ionicons name="chevron-forward" size={18} color="#dc2626" />
          </Pressable>
        </View>

        {loading ? (
          <View className="items-center py-24">
            <ActivityIndicator color="#ef4444" />
            <Text className="mt-3 text-xs text-slate-400">Đang tổng hợp dữ liệu...</Text>
          </View>
        ) : (
          <>
            <View className="mb-4 flex-row flex-wrap" style={{ gap: 10 }}>
              {[
                ["Nhân sự chấm công", stats.employees, "people-outline"],
                ["Lượt hoàn tất", stats.completed, "checkmark-done-outline"],
                ["Lịch chờ duyệt", stats.pending, "time-outline"],
                ["Lịch đã duyệt", stats.approved, "shield-checkmark-outline"],
              ].map(([label, value, icon]) => (
                <View
                  className="min-w-[46%] flex-1 rounded-2xl border border-red-100 bg-white p-4"
                  key={String(label)}
                >
                  <Ionicons name={icon as never} size={19} color="#dc2626" />
                  <Text className="mt-3 text-2xl font-black text-slate-900">{value}</Text>
                  <Text className="mt-1 text-[10px] font-bold uppercase text-slate-500">
                    {label}
                  </Text>
                </View>
              ))}
            </View>

            <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <View className="border-b border-slate-100 p-4">
                <Text className="text-base font-black text-slate-900">Chấm công gần nhất</Text>
                <Text className="mt-1 text-xs text-slate-500">
                  {attendance.length} bản ghi trong kỳ đã chọn
                </Text>
              </View>
              {recentAttendance.length === 0 ? (
                <View className="items-center px-5 py-10">
                  <Ionicons name="file-tray-outline" size={28} color="#64748b" />
                  <Text className="mt-3 text-sm font-bold text-slate-400">
                    Chưa có dữ liệu chấm công
                  </Text>
                </View>
              ) : (
                recentAttendance.map((record, index) => (
                  <View
                    className={`flex-row items-center p-4 ${
                      index < recentAttendance.length - 1
                        ? "border-b border-slate-100"
                        : ""
                    }`}
                    key={record._id}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                      <Ionicons name="person-outline" size={18} color="#dc2626" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-black text-slate-800">
                        {employeeName(record)}
                      </Text>
                      <Text className="mt-1 text-[11px] text-slate-500">
                        {new Date(record.date).toLocaleDateString("vi-VN")} · {record.schedule_type}
                      </Text>
                    </View>
                    <View className={`rounded-full px-2.5 py-1 ${record.check_out_at ? "bg-emerald-500/15" : "bg-amber-500/15"}`}>
                      <Text className={`text-[10px] font-black ${record.check_out_at ? "text-emerald-400" : "text-amber-400"}`}>
                        {record.check_out_at ? "Hoàn tất" : "Đang làm"}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
