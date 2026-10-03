import type {
  IScheduleEntry,
  WorkPeriod,
} from "@/src/services/workschedule/constant";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";

type WorkDayScheduleEditorProps = {
  date: Date;
  entry: Partial<IScheduleEntry>;
  readOnly: boolean;
  readOnlyReason?: string | null;
  onChange: (field: "type" | "period" | "note", value: string) => void;
  onClear: () => void;
  tone?: "default" | "admin";
};

const PERIOD_OPTIONS: { value: WorkPeriod; label: string; hint: string }[] = [
  { value: "full_day", label: "Cả ngày", hint: "2 buổi" },
  { value: "morning", label: "Buổi sáng", hint: "1 buổi" },
  { value: "afternoon", label: "Buổi chiều", hint: "1 buổi" },
];

export function WorkDayScheduleEditor({
  date,
  entry,
  readOnly,
  readOnlyReason,
  onChange,
  onClear,
  tone = "default",
}: WorkDayScheduleEditorProps) {
  const hasWorkSelection = entry.type === "office";
  const accent = tone === "admin" ? "#dc2626" : "#2563eb";

  return (
    <View>
      <View className="mb-4 flex-row items-center">
        <View
          className={`h-10 w-10 items-center justify-center rounded-xl ${
            tone === "admin" ? "bg-red-50" : "bg-blue-50"
          }`}
        >
          <Ionicons name="calendar-outline" size={20} color={accent} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Lịch ngày
          </Text>
          <Text className="mt-0.5 text-base font-black capitalize text-slate-900">
            {date.toLocaleDateString("vi-VN", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
            })}
          </Text>
        </View>
      </View>

      {readOnlyReason ? (
        <View className="mb-4 flex-row items-start rounded-2xl bg-slate-100 p-3">
          <Ionicons
            name="information-circle-outline"
            size={16}
            color="#64748b"
          />
          <Text className="ml-2 flex-1 text-xs font-semibold leading-5 text-slate-600">
            {readOnlyReason}
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityLabel="Làm việc tại công ty"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: hasWorkSelection, disabled: readOnly }}
        className={`mb-5 min-h-14 flex-row items-center rounded-2xl px-3 py-3 ${
          hasWorkSelection
            ? tone === "admin"
              ? "bg-red-50"
              : "bg-blue-50"
            : "bg-slate-50"
        } ${readOnly ? "opacity-60" : ""}`}
        disabled={readOnly}
        onPress={() =>
          hasWorkSelection ? onClear() : onChange("type", "office")
        }
      >
        <View
          className={`h-6 w-6 items-center justify-center rounded-md border ${
            hasWorkSelection
              ? tone === "admin"
                ? "border-red-600 bg-red-600"
                : "border-blue-600 bg-blue-600"
              : "border-slate-300 bg-white"
          }`}
        >
          {hasWorkSelection ? (
            <Ionicons name="checkmark" size={16} color="#fff" />
          ) : null}
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-sm font-bold text-slate-800">
            Đi làm tại công ty
          </Text>
          <Text className="mt-0.5 text-[10px] text-slate-500">
            Bỏ tích chọn nếu ngày này nghỉ
          </Text>
        </View>
      </Pressable>

      {hasWorkSelection ? (
        <View>
          <Text className="mb-2 text-xs font-bold text-slate-700">Ca làm</Text>
          <View className="flex-row" style={{ gap: 8 }}>
            {PERIOD_OPTIONS.map((option) => {
              const selected = (entry.period || "full_day") === option.value;
              return (
                <Pressable
                  className={`min-h-14 flex-1 items-center justify-center rounded-xl border px-2 py-2.5 ${
                    selected
                      ? tone === "admin"
                        ? "border-red-200 bg-red-50"
                        : "border-blue-200 bg-blue-50"
                      : "border-transparent bg-slate-50"
                  }`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: readOnly }}
                  disabled={readOnly}
                  key={option.value}
                  onPress={() => onChange("period", option.value)}
                  style={readOnly ? { opacity: 0.6 } : undefined}
                >
                  <Text
                    className={`text-[11px] font-black ${
                      selected
                        ? tone === "admin"
                          ? "text-red-700"
                          : "text-blue-600"
                        : "text-slate-500"
                    }`}
                  >
                    {option.label}
                  </Text>
                  <Text className="mt-0.5 text-[9px] text-slate-400">
                    {option.hint}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-5">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xs font-bold text-slate-700">Ghi chú</Text>
              <Text className="text-[10px] text-slate-400">Không bắt buộc</Text>
            </View>
            <TextInput
              className="min-h-12 rounded-xl border border-transparent bg-slate-50 px-4 py-3 text-sm text-slate-800"
              editable={!readOnly}
              maxLength={200}
              onChangeText={(text) => onChange("note", text)}
              placeholder="Ví dụ: họp với khách hàng lúc 9:00"
              placeholderTextColor="#94a3b8"
              style={readOnly ? { opacity: 0.6 } : undefined}
              value={entry.note || ""}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
