import { WorkMonthCalendar } from "@/src/features/workschedule/shared/ui/WorkMonthCalendar";
import {
  getScheduleDateKey,
  getScheduleToday,
  monthDate,
  toLocalDateKey,
} from "@/src/features/workschedule/shared/utils/date";
import type {
  EntryType,
  IScheduleEntry,
  WorkPeriod,
} from "@/src/services/workschedule/constant";
import React, { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

interface Props {
  month: string;
  entries: IScheduleEntry[];
  onChangeEntry: (
    date: string,
    field: "type" | "period" | "note",
    value: string,
  ) => void;
  readOnly?: boolean;
}

const typeOptions: { value: EntryType; label: string }[] = [
  { value: "office", label: "Tại công ty" },
  { value: "day_off", label: "Ngày nghỉ" },
  { value: "leave", label: "Nghỉ phép" },
];
const periodOptions: { value: WorkPeriod; label: string }[] = [
  { value: "full_day", label: "Cả ngày" },
  { value: "morning", label: "Buổi sáng" },
  { value: "afternoon", label: "Buổi chiều" },
];

export default function AdminScheduleForm({
  month,
  entries,
  onChangeEntry,
  readOnly = false,
}: Props) {
  const today = getScheduleToday();
  const todayKey = toLocalDateKey(today);
  const [selectedDate, setSelectedDate] = useState(() =>
    todayKey.startsWith(month) ? today : monthDate(month),
  );
  const selectedKey = toLocalDateKey(selectedDate);
  const entriesByDate = useMemo(
    () =>
      Object.fromEntries(
        entries.map((entry) => [getScheduleDateKey(entry.date), entry]),
      ),
    [entries],
  );
  const entry: Partial<IScheduleEntry> = entriesByDate[selectedKey] || {
    type: "day_off",
    period: "full_day",
    note: "",
  };
  const past = selectedKey < todayKey;
  const disabled = readOnly || past;

  return (
    <View>
      <WorkMonthCalendar
        visibleMonth={monthDate(month)}
        selectedDate={selectedDate}
        entriesByDate={entriesByDate}
        tone="admin"
        onSelectDate={setSelectedDate}
        onChangeMonth={() => undefined}
        minMonth={monthDate(month)}
        maxMonth={monthDate(month)}
        isDateDisabled={(date) => toLocalDateKey(date) < todayKey}
      />
      <View className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <Text className="text-sm font-bold capitalize text-slate-900">
          {selectedDate.toLocaleDateString("vi-VN", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
          })}
        </Text>
        <Text className="mb-3 mt-1 text-xs leading-5 text-slate-500">
          {past
            ? "Ngày đã qua được giữ nguyên, không thể điều chỉnh."
            : readOnly
              ? "Chọn Điều chỉnh để cập nhật lịch tháng này."
              : "Chạm ngày trên bảng để thay đổi nơi làm và ca làm."}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {typeOptions.map((option) => {
            const selected = entry.type === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled }}
                disabled={disabled}
                onPress={() => onChangeEntry(selectedKey, "type", option.value)}
                className={`rounded-xl border px-3 py-2.5 ${selected ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"} ${disabled ? "opacity-60" : ""}`}
              >
                <Text
                  className={`text-xs font-bold ${selected ? "text-red-700" : "text-slate-600"}`}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {entry.type !== "day_off" ? (
          <View className="mt-3 flex-row" style={{ gap: 8 }}>
            {periodOptions.map((option) => {
              const selected = (entry.period || "full_day") === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() =>
                    onChangeEntry(selectedKey, "period", option.value)
                  }
                  className={`min-h-12 flex-1 items-center justify-center rounded-xl border px-2 py-2.5 ${selected ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"} ${disabled ? "opacity-60" : ""}`}
                >
                  <Text
                    className={`text-[11px] font-bold ${selected ? "text-red-700" : "text-slate-500"}`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <TextInput
          className={`mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 ${disabled ? "opacity-60" : ""}`}
          placeholder="Ghi chú (không bắt buộc)"
          placeholderTextColor="#94a3b8"
          maxLength={200}
          value={entry.note || ""}
          editable={!disabled}
          onChangeText={(text) => onChangeEntry(selectedKey, "note", text)}
        />
      </View>
    </View>
  );
}
