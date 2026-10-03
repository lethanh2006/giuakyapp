import type { User } from "@/src/services/user/constant";
import { Ionicons } from "@expo/vector-icons";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  PRIORITY_MAP,
  PRIORITY_OPTIONS,
  type TaskPriority,
} from "@/src/services/todo/constant";

type Props = {
  title: string;
  description: string;
  deadline: Date | null;
  priority: TaskPriority;
  createAssignee: string;
  users: User[];
  creating: boolean;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setDeadline: (value: Date | null) => void;
  setPriority: (value: TaskPriority) => void;
  setCreateAssignee: (value: string) => void;
  onCreateTask: () => void;
};

export default function AdminTodoCreateTaskCard({
  title,
  description,
  deadline,
  priority,
  createAssignee,
  users,
  creating,
  setTitle,
  setDescription,
  setDeadline,
  setPriority,
  setCreateAssignee,
  onCreateTask,
}: Props) {
  const [showPriorityOptions, setShowPriorityOptions] = React.useState(false);

  const openDeadlinePicker = () => {
    const currentValue = deadline ?? new Date();

    if (Platform.OS === "android") {
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

              const finalDate = new Date(baseDate);
              finalDate.setHours(selectedTime.getHours());
              finalDate.setMinutes(selectedTime.getMinutes());
              finalDate.setSeconds(0);
              finalDate.setMilliseconds(0);
              setDeadline(finalDate);
            },
          });
        },
      });
      return;
    }

    setDeadline(currentValue);
  };

  return (
    <View className="rounded-2xl border border-slate-100 bg-white p-5" style={{ elevation: 2 }}>
      <View className="flex-row items-center mb-4">
        <View className="mr-2 rounded-lg bg-red-50 p-1.5">
          <Ionicons name="add-circle-outline" size={20} color="#dc2626" />
        </View>
        <Text className="text-base font-bold text-slate-800">
          Tạo công việc mới
        </Text>
      </View>

      <Text className="text-xs font-semibold text-slate-500 mb-1.5 ml-0.5">Tiêu đề công việc *</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Nhập tiêu đề công việc..."
        placeholderTextColor="#94a3b8"
        className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800"
      />

      <Text className="text-xs font-semibold text-slate-500 mb-1.5 ml-0.5">Mô tả công việc</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Nhập mô tả chi tiết (tùy chọn)..."
        placeholderTextColor="#94a3b8"
        className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800"
        multiline
        numberOfLines={3}
        style={{ textAlignVertical: "top" }}
      />

      <View className="mb-4" style={{ gap: 6 }}>
        <Text className="text-xs font-semibold text-slate-500 ml-0.5">Hạn chót (Deadline)</Text>
        <Pressable
          onPress={openDeadlinePicker}
          className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
        >
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={18} color="#64748b" />
            <Text className={`ml-2 text-sm font-medium ${deadline ? "text-slate-800" : "text-slate-400"}`}>
              {deadline ? deadline.toLocaleString() : "Chọn thời hạn hoàn thành"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
        </Pressable>
        {deadline ? (
          <Pressable
            onPress={() => setDeadline(null)}
            className="self-start flex-row items-center mt-1 px-3 py-1.5 rounded-lg border border-rose-100 bg-rose-50"
          >
            <Ionicons name="trash-outline" size={14} color="#f43f5e" />
            <Text className="text-rose-600 text-xs font-semibold ml-1">Xóa thời hạn</Text>
          </Pressable>
        ) : null}
      </View>

      <Text className="text-xs font-semibold text-slate-500 mb-1.5 ml-0.5">Mức độ ưu tiên</Text>
      <View className="mb-4" style={{ gap: 8 }}>
        <Pressable
          onPress={() => setShowPriorityOptions((value) => !value)}
          className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
        >
          <View className="flex-row items-center">
            <Ionicons
              name={PRIORITY_MAP[priority].icon as any}
              size={18}
              color={
                priority === "high"
                  ? "#f43f5e"
                  : priority === "medium"
                  ? "#d97706"
                  : "#64748b"
              }
            />
            <Text className={`ml-2 text-sm font-semibold ${PRIORITY_MAP[priority].textClass}`}>
              {PRIORITY_MAP[priority].label}
            </Text>
          </View>
          <Ionicons name={showPriorityOptions ? "chevron-up" : "chevron-down"} size={16} color="#94a3b8" />
        </Pressable>

        {showPriorityOptions ? (
          <View className="overflow-hidden rounded-xl border border-slate-100 bg-white" style={{ elevation: 2 }}>
            {PRIORITY_OPTIONS.map((p) => {
              const isSelected = priority === p;
              const mapInfo = PRIORITY_MAP[p];

              return (
                <Pressable
                  key={p}
                  onPress={() => {
                    setPriority(p);
                    setShowPriorityOptions(false);
                  }}
                  className={`flex-row items-center justify-between border-b border-slate-50 px-4 py-3 ${isSelected ? "bg-slate-50" : "bg-white"}`}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name={mapInfo.icon as any}
                      size={18}
                      color={
                        p === "high"
                          ? "#f43f5e"
                          : p === "medium"
                          ? "#d97706"
                          : "#64748b"
                      }
                    />
                    <Text
                      className={`ml-2 text-sm font-medium ${isSelected ? mapInfo.textClass : "text-slate-700"}`}
                    >
                      {mapInfo.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color="#dc2626" />
                  )}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      <Text className="text-xs font-semibold text-slate-500 mb-1.5 ml-0.5">
        Người thực hiện (tùy chọn)
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-5"
      >
        <View className="flex-row py-0.5" style={{ gap: 8 }}>
          <Pressable
            onPress={() => setCreateAssignee("")}
              className={`flex-row items-center rounded-xl border px-3 py-2 ${
              createAssignee === ""
                ? "border-red-600 bg-red-600"
                : "bg-white border-slate-200"
            }`}
          >
            <Ionicons
              name="person-remove-outline"
              size={14}
              color={createAssignee === "" ? "#ffffff" : "#64748b"}
              style={{ marginRight: 4 }}
            />
            <Text
              className={`text-xs font-semibold ml-1 ${
                createAssignee === "" ? "text-white" : "text-slate-600"
              }`}
            >
              Không giao ngay
            </Text>
          </Pressable>
          {users.map((u) => {
            const isSelected = createAssignee === u._id;
            return (
              <Pressable
                key={u._id}
                onPress={() => setCreateAssignee(u._id)}
                className={`flex-row items-center rounded-xl border px-3 py-2 ${
                  isSelected
                    ? "border-red-600 bg-red-600"
                    : "bg-white border-slate-200"
                }`}
              >
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={isSelected ? "#ffffff" : "#64748b"}
                  style={{ marginRight: 4 }}
                />
                <Text
                  className={`text-xs font-semibold ml-1 ${
                    isSelected ? "text-white" : "text-slate-600"
                  }`}
                >
                  {u.username || u.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Pressable
        onPress={onCreateTask}
        disabled={creating}
        className={`flex-row items-center justify-center rounded-xl py-3.5 ${
          creating
            ? "bg-red-300"
            : "bg-red-600"
        }`}
        style={!creating ? { elevation: 2 } : undefined}
      >
        {creating ? (
          <Text className="text-white font-bold text-sm">Đang tạo...</Text>
        ) : (
          <View className="flex-row items-center">
            <Ionicons name="paper-plane-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text className="text-white font-bold text-sm ml-1.5">Tạo công việc</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
