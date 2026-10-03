import {
  ASSIGNEE_STATUS_TRANSITIONS,
  PRIORITY_MAP,
  STATUS_MAP,
  type RelatedUser,
  type TaskItem,
  type TaskStatus,
} from "@/src/services/todo/constant";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type Props = {
  tasks: TaskItem[];
  loading: boolean;
  updatingTaskId: string | null;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
};

const personName = (person?: string | RelatedUser) => {
  if (!person) return "Chưa rõ";
  if (typeof person === "string") return person;
  return person.name || person.username || person.email || "Chưa rõ";
};

const formatDate = (value?: string) => {
  if (!value) return "Không có hạn";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Không có hạn"
    : date.toLocaleDateString("vi-VN");
};

export default function UserTodoTaskListCard({
  tasks,
  loading,
  updatingTaskId,
  onUpdateStatus,
}: Props) {
  return (
    <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <View className="flex-row items-center justify-between border-b border-slate-100 p-4">
        <View>
          <Text className="text-base font-black text-slate-800">Danh sách công việc</Text>
          <Text className="mt-1 text-xs text-slate-500">Cập nhật theo tiến độ thực tế</Text>
        </View>
        <View className="rounded-full bg-blue-50 px-3 py-1.5">
          <Text className="text-xs font-black text-blue-700">{tasks.length} việc</Text>
        </View>
      </View>

      {loading ? (
        <View className="items-center py-16">
          <ActivityIndicator color="#2563eb" />
          <Text className="mt-2 text-xs text-slate-500">Đang tải công việc...</Text>
        </View>
      ) : tasks.length === 0 ? (
        <View className="items-center px-6 py-14">
          <Ionicons name="checkmark-circle-outline" size={38} color="#94a3b8" />
          <Text className="mt-3 text-sm font-black text-slate-700">Không có công việc phù hợp</Text>
          <Text className="mt-1 text-center text-xs leading-5 text-slate-500">
            Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.
          </Text>
        </View>
      ) : (
        <View className="p-4" style={{ gap: 12 }}>
          {tasks.map((task) => {
            const status = STATUS_MAP[task.status];
            const priority = PRIORITY_MAP[task.priority];
            const transitions = ASSIGNEE_STATUS_TRANSITIONS[task.status];
            const busy = updatingTaskId === task._id;
            return (
              <View className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4" key={task._id}>
                <View className="flex-row items-start">
                  <View className={`h-10 w-10 items-center justify-center rounded-xl ${priority.bgClass}`}>
                    <Ionicons name={priority.icon as never} size={18} color="#475569" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-black leading-5 text-slate-800">{task.title}</Text>
                    {task.description ? (
                      <Text className="mt-1 text-xs leading-5 text-slate-500">{task.description}</Text>
                    ) : null}
                  </View>
                </View>

                <View className="mt-3 flex-row flex-wrap" style={{ gap: 7 }}>
                  <View className={`rounded-full px-2.5 py-1 ${status.bgClass}`}>
                    <Text className={`text-[10px] font-black ${status.textClass}`}>{status.label}</Text>
                  </View>
                  <View className={`rounded-full px-2.5 py-1 ${priority.bgClass}`}>
                    <Text className={`text-[10px] font-black ${priority.textClass}`}>{priority.label}</Text>
                  </View>
                </View>

                <View className="mt-3 rounded-xl bg-white p-3">
                  <Text className="text-[11px] text-slate-500">
                    Người giao: <Text className="font-bold text-slate-700">{personName(task.createdBy)}</Text>
                  </Text>
                  <Text className="mt-1 text-[11px] text-slate-500">
                    Hạn hoàn thành: <Text className="font-bold text-slate-700">{formatDate(task.deadline)}</Text>
                  </Text>
                </View>

                {transitions.length > 0 ? (
                  <View className="mt-3 flex-row" style={{ gap: 8 }}>
                    {transitions.map((nextStatus) => (
                      <Pressable
                        className="flex-1 items-center rounded-xl bg-blue-600 py-3 disabled:opacity-50"
                        disabled={busy}
                        key={nextStatus}
                        onPress={() => onUpdateStatus(task._id, nextStatus)}
                      >
                        <Text className="text-xs font-black text-white">
                          {busy ? "Đang cập nhật..." : STATUS_MAP[nextStatus].label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
