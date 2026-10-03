import { Ionicons } from "@expo/vector-icons";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import {
  PRIORITY_MAP,
  PRIORITY_OPTIONS,
  type TaskItem,
  type TaskPriority,
  type UpdateTaskInput,
} from "@/src/services/todo/constant";

type Props = {
  task: TaskItem;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: UpdateTaskInput) => Promise<boolean>;
};

export default function AdminTodoEditTaskForm({
  task,
  saving,
  onCancel,
  onSave,
}: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [deadline, setDeadline] = useState<Date | null>(
    task.deadline ? new Date(task.deadline) : null,
  );

  const openDeadlinePicker = () => {
    const currentValue = deadline ?? new Date();
    if (Platform.OS !== "android") {
      setDeadline(currentValue);
      return;
    }

    DateTimePickerAndroid.open({
      value: currentValue,
      mode: "date",
      is24Hour: true,
      onChange: (_event, selectedDate) => {
        if (!selectedDate) return;
        const baseDate = new Date(selectedDate);

        DateTimePickerAndroid.open({
          value: deadline ?? baseDate,
          mode: "time",
          is24Hour: true,
          onChange: (_timeEvent, selectedTime) => {
            if (!selectedTime) {
              setDeadline(baseDate);
              return;
            }
            baseDate.setHours(selectedTime.getHours());
            baseDate.setMinutes(selectedTime.getMinutes());
            baseDate.setSeconds(0, 0);
            setDeadline(baseDate);
          },
        });
      },
    });
  };

  const submit = async () => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle || saving) return;
    await onSave({
      title: normalizedTitle,
      description: description.trim() || null,
      priority,
      deadline: deadline ? deadline.toISOString() : null,
    });
  };

  return (
    <View className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-3">
      <View className="mb-3 flex-row items-center">
        <Ionicons name="create-outline" size={16} color="#dc2626" />
        <Text className="ml-1.5 text-xs font-bold text-red-700">
          Chỉnh sửa nội dung
        </Text>
      </View>

      <Text className="mb-1 text-[11px] font-semibold text-slate-500">
        Tiêu đề *
      </Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        maxLength={200}
        placeholder="Tiêu đề công việc"
        placeholderTextColor="#94a3b8"
        className="mb-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"
      />

      <Text className="mb-1 text-[11px] font-semibold text-slate-500">Mô tả</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        maxLength={2000}
        multiline
        numberOfLines={3}
        style={{ textAlignVertical: "top" }}
        placeholder="Mô tả công việc"
        placeholderTextColor="#94a3b8"
        className="mb-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"
      />

      <Text className="mb-1 text-[11px] font-semibold text-slate-500">
        Mức ưu tiên
      </Text>
      <View className="mb-3 flex-row flex-wrap" style={{ gap: 7 }}>
        {PRIORITY_OPTIONS.map((value) => {
          const selected = value === priority;
          return (
            <Pressable
              key={value}
              onPress={() => setPriority(value)}
              className={`rounded-xl border px-3 py-2 ${
                selected
                  ? `${PRIORITY_MAP[value].bgClass} ${PRIORITY_MAP[value].borderClass}`
                  : "border-slate-200 bg-white"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  selected ? PRIORITY_MAP[value].textClass : "text-slate-500"
                }`}
              >
                {PRIORITY_MAP[value].label.replace("Ưu tiên ", "")}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="mb-1 text-[11px] font-semibold text-slate-500">
        Hạn chót
      </Text>
      <View className="mb-3 flex-row" style={{ gap: 7 }}>
        <Pressable
          onPress={openDeadlinePicker}
          className="min-w-0 flex-1 flex-row items-center rounded-xl border border-slate-200 bg-white px-3 py-2.5"
        >
          <Ionicons name="calendar-outline" size={15} color="#64748b" />
          <Text className="ml-1.5 flex-1 text-xs font-semibold text-slate-600">
            {deadline ? deadline.toLocaleString() : "Chọn thời hạn"}
          </Text>
        </Pressable>
        {deadline ? (
          <Pressable
            onPress={() => setDeadline(null)}
            className="items-center justify-center rounded-xl border border-rose-100 bg-rose-50 px-3"
          >
            <Ionicons name="close" size={17} color="#e11d48" />
          </Pressable>
        ) : null}
      </View>

      <View className="flex-row" style={{ gap: 8 }}>
        <Pressable
          onPress={onCancel}
          disabled={saving}
          className="flex-1 items-center rounded-xl border border-slate-200 bg-white py-2.5"
          style={saving ? { opacity: 0.5 } : undefined}
        >
          <Text className="text-xs font-bold text-slate-600">Hủy sửa</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={saving || !title.trim()}
          className="flex-1 items-center rounded-xl bg-red-600 py-2.5"
          style={saving || !title.trim() ? { opacity: 0.5 } : undefined}
        >
          <Text className="text-xs font-bold text-white">
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
