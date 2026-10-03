import { getScheduleToday, toLocalDateKey } from "@/src/features/workschedule/shared/utils/date";
import type { IScheduleEntry, RequestStatus } from "@/src/services/workschedule/constant";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

export type CalendarEntry = Partial<IScheduleEntry> & { request_status?: RequestStatus };

export const calendarPeriodMeta = (entry?: CalendarEntry) => {
  if (!entry?.type) return { background: "bg-white", dot: "bg-transparent", label: "Chưa có lịch" };
  if (entry.type === "leave") return { background: "bg-violet-100", dot: "bg-violet-500", label: "Nghỉ phép" };
  if (entry.type === "day_off") return { background: "bg-slate-100", dot: "bg-slate-400", label: "Nghỉ" };
  if (entry.period === "morning") return { background: "bg-yellow-100", dot: "bg-yellow-500", label: "Buổi sáng" };
  if (entry.period === "afternoon") return { background: "bg-orange-100", dot: "bg-orange-500", label: "Buổi chiều" };
  return { background: "bg-sky-100", dot: "bg-sky-500", label: "Cả ngày" };
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối",
};
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth();

export interface WorkMonthCalendarProps {
  visibleMonth: Date;
  selectedDate: Date;
  entriesByDate?: Record<string, CalendarEntry>;
  onSelectDate: (date: Date) => void;
  onChangeMonth: (offset: number) => void;
  minMonth?: Date;
  maxMonth?: Date;
  isDateDisabled?: (date: Date) => boolean;
  highlightedDates?: string[];
  dayCountsByDate?: Record<string, number>;
  tone?: "default" | "admin";
  showLegend?: boolean;
  loading?: boolean;
  readOnly?: boolean;
}

/** One month grid for registration, policy selection and calendar overviews. */
export function WorkMonthCalendar({
  visibleMonth, selectedDate, entriesByDate = {}, onSelectDate, onChangeMonth,
  minMonth, maxMonth, isDateDisabled, highlightedDates = [], dayCountsByDate,
  tone = "default", showLegend = true, loading = false, readOnly = false,
}: WorkMonthCalendarProps) {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const selectedKey = toLocalDateKey(selectedDate);
  const todayKey = toLocalDateKey(getScheduleToday());
  const currentMonth = monthIndex(visibleMonth);
  const previousDisabled = Boolean(minMonth && currentMonth <= monthIndex(minMonth));
  const nextDisabled = Boolean(maxMonth && currentMonth >= monthIndex(maxMonth));
  const accent = tone === "admin" ? "#dc2626" : "#2563eb";
  const highlighted = new Set(highlightedDates);
  const days = useMemo(() => {
    const count = new Date(year, month + 1, 0).getDate();
    const leading = (new Date(year, month, 1).getDay() + 6) % 7;
    const cellCount = Math.ceil((leading + count) / 7) * 7;
    return Array.from({ length: cellCount }, (_, index) => {
      const day = index - leading + 1;
      return day >= 1 && day <= count ? new Date(year, month, day) : null;
    });
  }, [year, month]);

  return (
    <View className="rounded-3xl border border-slate-200 bg-white p-4">
      <View className="mb-4 flex-row items-center justify-between">
        <Pressable
          accessibilityLabel="Xem tháng trước" accessibilityRole="button"
          accessibilityState={{ disabled: previousDisabled }} disabled={previousDisabled}
          className={`h-11 w-11 items-center justify-center rounded-xl bg-slate-50 ${previousDisabled ? "opacity-30" : ""}`}
          onPress={() => onChangeMonth(-1)}
        ><Ionicons name="chevron-back" size={20} color="#475569" /></Pressable>
        <Text accessibilityRole="header" className="text-base font-black text-slate-900">
          Tháng {month + 1}/{year}
        </Text>
        <Pressable
          accessibilityLabel="Xem tháng sau" accessibilityRole="button"
          accessibilityState={{ disabled: nextDisabled }} disabled={nextDisabled}
          className={`h-11 w-11 items-center justify-center rounded-xl bg-slate-50 ${nextDisabled ? "opacity-30" : ""}`}
          onPress={() => onChangeMonth(1)}
        ><Ionicons name="chevron-forward" size={20} color="#475569" /></Pressable>
      </View>
      <View className="mb-2 flex-row" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {WEEKDAYS.map(day => <Text className="flex-1 text-center text-[11px] font-bold text-slate-400" key={day}>{day}</Text>)}
      </View>
      {loading ? (
        <View accessibilityLabel="Đang tải lịch tháng" accessibilityState={{ busy: true }} style={{ height: days.length / 7 * 48 }} className="items-center justify-center">
          <ActivityIndicator color={accent} />
        </View>
      ) : (
        <View className="flex-row flex-wrap">
          {days.map((date, index) => {
            if (!date) return <View accessible={false} className="h-12 w-[14.285%]" key={`blank-${index}`} />;
            const dateKey = toLocalDateKey(date);
            const entry = entriesByDate[dateKey];
            const meta = calendarPeriodMeta(entry);
            const selected = selectedKey === dateKey;
            const today = todayKey === dateKey;
            const disabled = Boolean(isDateDisabled?.(date));
            const inRange = highlighted.has(dateKey);
            const count = dayCountsByDate?.[dateKey];
            const location = entry?.type === "office" ? "Tại công ty" : entry?.type === "remote" ? "Làm từ xa" : "";
            const label = [
              date.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric", year: "numeric" }),
              today ? "Hôm nay" : "", count !== undefined ? `${count} người có lịch` : meta.label,
              location, entry?.request_status ? STATUS_LABELS[entry.request_status] : "",
              inRange ? "Trong khoảng đã chọn" : "", disabled || readOnly ? "Không thể chọn ngày này" : "",
            ].filter(Boolean).join(", ");
            return (
              <Pressable key={dateKey} accessibilityRole="button" accessibilityLabel={label}
                accessibilityState={{ selected, disabled: disabled || readOnly }} disabled={disabled || readOnly}
                className="h-12 w-[14.285%] items-center justify-center"
                onPress={() => onSelectDate(date)}
              >
                <View className={`h-11 w-full max-w-11 items-center justify-center rounded-full ${
                  disabled ? "bg-slate-100" : inRange ? tone === "admin" ? "bg-red-100" : "bg-blue-100" : meta.background
                } ${selected ? "border-2 border-slate-900" : "border border-transparent"} ${entry?.request_status === "rejected" ? "opacity-60" : ""}`}>
                  <Text className={`text-xs font-bold ${disabled ? "text-slate-400" : today ? tone === "admin" ? "text-red-600" : "text-blue-600" : "text-slate-800"}`}>
                    {date.getDate()}
                  </Text>
                  {count ? <Text className="text-[9px] font-semibold text-slate-500">{count}</Text>
                    : entry?.type ? <View className={`mt-0.5 h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    : today ? <View className="mt-0.5 h-1 w-1 rounded-full" style={{ backgroundColor: accent }} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      {showLegend ? (
        <View className="mt-4 flex-row flex-wrap border-t border-slate-100 pt-3">
          {[
            ["bg-sky-500", "Cả ngày"], ["bg-yellow-500", "Sáng"], ["bg-orange-500", "Chiều"],
            ["bg-violet-500", "Nghỉ phép"], ["bg-slate-400", "Nghỉ"],
          ].map(([color, label]) => (
            <View className="mb-2 w-1/2 flex-row items-center" key={label}>
              <View className={`mr-2 h-2.5 w-2.5 rounded-full ${color}`} /><Text className="text-[11px] text-slate-600">{label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
