import {
  type AdminHeatmapRow,
  type AdminScheduleRequest,
  useWorkscheduleAdmin,
} from "@/src/features/workschedule/admin/hooks/useWorkscheduleAdmin";
import { WorkMonthCalendar, calendarPeriodMeta } from "@/src/features/workschedule/shared/ui/WorkMonthCalendar";
import { getScheduleDateKey, getScheduleToday, toLocalDateKey, toMonthKey } from "@/src/features/workschedule/shared/utils/date";
import { ScreenHeader } from "@/src/shared/ui/ScreenHeader";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

const statusMeta = {
  pending: { label: "Chờ duyệt", box: "bg-amber-50", text: "text-amber-700" },
  approved: { label: "Đã duyệt", box: "bg-emerald-50", text: "text-emerald-700" },
  rejected: { label: "Từ chối", box: "bg-red-50", text: "text-red-700" },
};

export default function AdminWorkCalendarScreen() {
  const { getAllSchedules, getHeatmap } = useWorkscheduleAdmin();
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = getScheduleToday();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => getScheduleToday());
  const [requests, setRequests] = useState<AdminScheduleRequest[]>([]);
  const [heatmap, setHeatmap] = useState<AdminHeatmapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadRequestRef = useRef(0);
  const selectedMonth = toMonthKey(visibleMonth);
  const selectedKey = toLocalDateKey(selectedDate);

  const loadData = useCallback(async (refresh = false) => {
    const requestId = ++loadRequestRef.current;
    if (refresh) setRefreshing(true);
    else {
      setLoading(true);
      setRequests([]);
      setHeatmap([]);
    }
    const [scheduleRows, heatmapRows] = await Promise.all([
      getAllSchedules({ month: selectedMonth, status: "all" }),
      getHeatmap(selectedMonth, true),
    ]);
    if (requestId !== loadRequestRef.current) return;
    setRequests(scheduleRows);
    setHeatmap(heatmapRows);
    setLoading(false);
    setRefreshing(false);
  }, [getAllSchedules, getHeatmap, selectedMonth]);

  useFocusEffect(useCallback(() => {
    void loadData();
    return () => { loadRequestRef.current += 1; };
  }, [loadData]));

  const totals = useMemo(() => heatmap.reduce((result, row) => {
    row.stats.forEach(item => { result[item.type] = (result[item.type] || 0) + item.count; });
    return result;
  }, {} as Record<string, number>), [heatmap]);

  const dayCountsByDate = useMemo(() => Object.fromEntries(heatmap.map(row => [
    getScheduleDateKey(row._id), row.stats.reduce((count, item) => count + item.count, 0),
  ])), [heatmap]);

  const selectedRequests = useMemo(() => requests.flatMap(request => {
    const entry = request.entries?.find(item => getScheduleDateKey(item.date) === selectedKey);
    return entry ? [{ request, entry }] : [];
  }), [requests, selectedKey]);

  const changeMonth = (offset: number) => {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    setVisibleMonth(next);
    setSelectedDate(next);
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader onBack={() => router.back()} subtitle="Lịch đăng ký theo tháng của toàn bộ nhân sự" tone="admin" title="Lịch hệ thống" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData(true)} tintColor="#dc2626" />}
        showsVerticalScrollIndicator={false}
      >
        <WorkMonthCalendar
          visibleMonth={visibleMonth} selectedDate={selectedDate}
          onSelectDate={setSelectedDate} onChangeMonth={changeMonth}
          dayCountsByDate={dayCountsByDate} loading={loading} showLegend={false} tone="admin"
        />
        <Text className="mx-1 mt-3 text-xs leading-5 text-slate-500">
          Số dưới mỗi ngày là số nhân sự có lịch đã duyệt, gồm cả lịch nghỉ. Chạm ngày để xem từng nhân viên và trạng thái duyệt.
        </Text>

        <View className="mb-3 mt-4 flex-row flex-wrap justify-between">
          {[
            ["Tại công ty", totals.office || 0, "business-outline"],
            ["Làm từ xa", totals.remote || 0, "home-outline"],
            ["Nghỉ", totals.day_off || 0, "sunny-outline"],
            ["Nghỉ phép", totals.leave || 0, "cafe-outline"],
          ].map(([label, value, icon]) => (
            <View className="mb-3 w-[48.5%] rounded-2xl border border-slate-200 bg-white p-3" key={String(label)}>
              <View className="flex-row items-center justify-between">
                <Text className="text-2xl font-black text-slate-900">{value}</Text>
                <Ionicons name={icon as never} size={18} color="#64748b" />
              </View>
              <Text className="mt-1 text-xs font-semibold text-slate-600">{label}</Text>
              <Text className="mt-1 text-[10px] text-slate-400">Lượt ngày đã duyệt</Text>
            </View>
          ))}
        </View>

        <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <View className="border-b border-slate-100 p-4">
            <Text className="text-xs font-black uppercase tracking-wider text-slate-400">
              {selectedDate.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" })}
            </Text>
            <Text className="mt-2 text-sm font-bold text-slate-800">
              {loading ? "Đang tải lịch nhân viên..." : `${selectedRequests.length} nhân viên có lịch`}
            </Text>
          </View>
          {!loading && selectedRequests.length === 0 ? (
            <View className="items-center px-5 py-10">
              <Ionicons name="calendar-clear-outline" size={30} color="#94a3b8" />
              <Text className="mt-3 text-center text-sm text-slate-500">Chưa có nhân viên đăng ký lịch trong ngày này.</Text>
            </View>
          ) : selectedRequests.map(({ request, entry }, index) => {
            const status = statusMeta[request.status];
            const meta = calendarPeriodMeta(entry);
            const name = request.employee?.name || request.employee?.username || request.employee?.email || "Nhân viên";
            const location = entry.type === "office" ? "Tại công ty" : entry.type === "remote" ? "Làm từ xa" : "";
            return (
              <View className={`flex-row items-start p-4 ${index < selectedRequests.length - 1 ? "border-b border-slate-100" : ""}`} key={request._id}>
                <View className={`h-10 w-10 items-center justify-center rounded-xl ${meta.background}`}>
                  <View className={`h-3 w-3 rounded-full ${meta.dot}`} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-bold text-slate-800">{name}</Text>
                  <Text className="mt-1 text-xs text-slate-500">{[meta.label, location].filter(Boolean).join(" · ")}</Text>
                  {entry.note ? <Text className="mt-2 text-xs leading-5 text-slate-500">{entry.note}</Text> : null}
                </View>
                <View className={`ml-2 rounded-full px-2 py-1 ${status.box}`}>
                  <Text className={`text-[10px] font-bold ${status.text}`}>{status.label}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
