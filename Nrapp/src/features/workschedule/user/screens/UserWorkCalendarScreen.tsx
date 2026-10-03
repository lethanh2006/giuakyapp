import { usePersonalWorkschedule } from "@/src/features/workschedule/shared/hooks/usePersonalWorkschedule";
import { WorkMonthCalendar, calendarPeriodMeta } from "@/src/features/workschedule/shared/ui/WorkMonthCalendar";
import { getScheduleDateKey, getScheduleToday, toLocalDateKey, toMonthKey } from "@/src/features/workschedule/shared/utils/date";
import type {
  IMonthlyScheduleEntry,
  IMonthlyScheduleOverview,
  PersonalAttendanceRecord,
} from "@/src/services/workschedule/constant";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/src/shared/ui/ScreenHeader";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";

const monthRange = (date: Date) => ({
  from: toLocalDateKey(new Date(date.getFullYear(), date.getMonth(), 1)),
  to: toLocalDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
});

const formatAttendanceDate = (value: string) => {
  const dateKey = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return "Không rõ ngày";
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime())
    ? "Không rõ ngày"
    : date.toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
};

const formatAttendanceTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
};

const statusLabel: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

export default function UserWorkCalendarScreen() {
  const { getMonthlyOverview, getMyAttendance } = usePersonalWorkschedule();
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const value = getScheduleToday();
    value.setDate(1);
    value.setHours(0, 0, 0, 0);
    return value;
  });
  const [overview, setOverview] = useState<IMonthlyScheduleOverview | null>(null);
  const [attendance, setAttendance] = useState<PersonalAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => getScheduleToday());
  const loadRequestRef = useRef(0);

  const loadData = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setAttendance([]);
    setOverview(null);
    const range = monthRange(visibleMonth);
    const [scheduleData, attendanceData] = await Promise.all([
      getMonthlyOverview(toMonthKey(visibleMonth)),
      getMyAttendance(range.from, range.to),
    ]);
    if (requestId !== loadRequestRef.current) return;
    setOverview(scheduleData);
    setAttendance(attendanceData);
    setLoading(false);
  }, [getMonthlyOverview, getMyAttendance, visibleMonth]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
      return () => {
        loadRequestRef.current += 1;
      };
    }, [loadData]),
  );

  const entriesByDate = useMemo(() => {
    const result: Record<string, IMonthlyScheduleEntry> = {};
    (overview?.entries || []).forEach((entry) => {
      result[getScheduleDateKey(entry.date)] = entry;
    });
    return result;
  }, [overview]);

  const selectedEntry = entriesByDate[toLocalDateKey(selectedDate)];
  const selectedMeta = calendarPeriodMeta(selectedEntry);

  const changeMonth = (offset: number) => {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    setVisibleMonth(next);
    setSelectedDate(next);
  };

  const statItems = [
    { label: "Buổi đăng ký", value: overview?.stats.registered_sessions || 0 },
    { label: "Buổi đã duyệt", value: overview?.stats.approved_sessions || 0 },
    { label: "Ngày làm", value: overview?.stats.approved_work_days || 0 },
    { label: "Chờ duyệt", value: overview?.stats.pending_requests || 0 },
  ];

  const physicalAttendance = attendance.filter(record => record.source === "qr");
  const completedAttendance = physicalAttendance.filter(record => record.check_out_at);
  const automaticAttendance = attendance.filter(record => record.source === "schedule");

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        onBack={() => router.back()}
        subtitle="Lịch làm, trạng thái duyệt và chấm công"
        title="Lịch làm việc"
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <WorkMonthCalendar
          visibleMonth={visibleMonth}
          selectedDate={selectedDate}
          entriesByDate={entriesByDate}
          onSelectDate={setSelectedDate}
          onChangeMonth={changeMonth}
          loading={loading}
        />

        <View className="mt-4 flex-row flex-wrap justify-between">
          {statItems.map(item => (
            <View className="mb-3 w-[48.5%] rounded-2xl border border-slate-200 bg-white p-3" key={item.label}>
              <Text className="text-2xl font-black text-slate-900">{item.value}</Text>
              <Text className="mt-1 text-[11px] font-semibold text-slate-500">{item.label}</Text>
            </View>
          ))}
        </View>

        <View className="rounded-3xl border border-slate-200 bg-white p-4">
          <Text className="text-xs font-black uppercase tracking-wider text-slate-400">
            {selectedDate.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" })}
          </Text>
          {selectedEntry ? (
            <View className="mt-3 flex-row items-start">
              <View className={`h-11 w-11 items-center justify-center rounded-2xl ${selectedMeta.background}`}>
                <View className={`h-3 w-3 rounded-full ${selectedMeta.dot}`} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-black text-slate-800">{selectedMeta.label}</Text>
                <Text className="mt-1 text-xs text-slate-500">
                  {selectedEntry.type === "remote" ? "Làm việc từ xa" : selectedEntry.type === "office" ? "Tại công ty" : "Không có ca làm"}
                </Text>
                <Text className="mt-1 text-[11px] font-bold text-slate-600">
                  {statusLabel[selectedEntry.request_status] || selectedEntry.request_status}
                </Text>
                {selectedEntry.note ? (
                  <Text className="mt-2 text-xs leading-5 text-slate-500">{selectedEntry.note}</Text>
                ) : null}
              </View>
            </View>
          ) : (
            <Text className="mt-3 text-sm text-slate-500">Không có lịch làm việc trong ngày này.</Text>
          )}
        </View>

        <View className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
          <View className="flex-row items-start">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
              <Ionicons name="finger-print-outline" size={22} color="#059669" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-black text-slate-900">
                Lịch sử chấm công cá nhân
              </Text>
              <Text className="mt-1 text-xs leading-5 text-slate-500">
                Tháng {visibleMonth.getMonth() + 1}/{visibleMonth.getFullYear()}
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row" style={{ gap: 8 }}>
            {[
              { label: "Quét QR", value: physicalAttendance.length },
              { label: "Đủ vào/ra", value: completedAttendance.length },
              { label: "Remote tự động", value: automaticAttendance.length },
            ].map(item => (
              <View className="flex-1 rounded-2xl bg-slate-50 px-2 py-3" key={item.label}>
                <Text className="text-center text-lg font-black text-slate-900">
                  {item.value}
                </Text>
                <Text className="mt-1 text-center text-[9px] font-bold leading-4 text-slate-500">
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

          <View className="mt-3 flex-row items-start rounded-2xl bg-blue-50 p-3">
            <Ionicons name="information-circle-outline" size={17} color="#2563eb" />
            <Text className="ml-2 flex-1 text-[11px] leading-5 text-blue-700">
              Nguồn QR là chấm công vật lý tại văn phòng. Ngày remote được hệ thống ghi nhận tự động từ lịch đã duyệt và không được tính là lượt quét QR.
            </Text>
          </View>

          {attendance.length === 0 ? (
            <View className="mt-4 items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8">
              <Ionicons name="time-outline" size={30} color="#94a3b8" />
              <Text className="mt-2 text-center text-xs font-semibold text-slate-500">
                Chưa có bản ghi chấm công trong tháng này.
              </Text>
            </View>
          ) : (
            <View className="mt-4" style={{ gap: 10 }}>
              {attendance.map(record => {
                const isPhysical = record.source === "qr";
                const completed = Boolean(record.check_out_at);
                return (
                  <View
                    className={`rounded-2xl border p-3 ${
                      isPhysical
                        ? "border-emerald-100 bg-emerald-50/60"
                        : "border-violet-100 bg-violet-50/60"
                    }`}
                    key={record._id}
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="min-w-0 flex-1 pr-2">
                        <Text className="text-sm font-black capitalize text-slate-800">
                          {formatAttendanceDate(record.date)}
                        </Text>
                        <Text className="mt-1 text-[11px] font-semibold text-slate-500">
                          {record.schedule_type === "remote"
                            ? "Làm việc từ xa"
                            : "Làm việc tại văn phòng"}
                        </Text>
                      </View>
                      <View
                        className={`rounded-full px-2.5 py-1 ${
                          isPhysical ? "bg-emerald-100" : "bg-violet-100"
                        }`}
                      >
                        <Text
                          className={`text-[9px] font-black uppercase ${
                            isPhysical ? "text-emerald-700" : "text-violet-700"
                          }`}
                        >
                          {isPhysical ? "Quét QR" : "Theo lịch"}
                        </Text>
                      </View>
                    </View>

                    {isPhysical ? (
                      <View className="mt-3 flex-row rounded-xl bg-white/80 px-3 py-2.5">
                        <View className="flex-1">
                          <Text className="text-[9px] font-bold uppercase text-slate-400">
                            Check-in
                          </Text>
                          <Text className="mt-1 text-xs font-black text-slate-700">
                            {formatAttendanceTime(record.check_in_at)}
                          </Text>
                        </View>
                        <View className="w-px bg-slate-100" />
                        <View className="flex-1 pl-3">
                          <Text className="text-[9px] font-bold uppercase text-slate-400">
                            Check-out
                          </Text>
                          <Text
                            className={`mt-1 text-xs font-black ${
                              completed ? "text-slate-700" : "text-amber-600"
                            }`}
                          >
                            {completed
                              ? formatAttendanceTime(record.check_out_at)
                              : "Chưa quét"}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <Text className="mt-3 rounded-xl bg-white/80 px-3 py-2.5 text-[11px] leading-5 text-violet-700">
                        Khung giờ tự động: {formatAttendanceTime(record.check_in_at)} - {formatAttendanceTime(record.check_out_at)}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
