import type { AppArea } from "@/src/application/access/roles";
import AdminTodoEditTaskForm from "@/src/features/todo/admin/ui/AdminTodoEditTaskForm";
import type { User } from "@/src/services/user/constant";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  ASSIGNEE_STATUS_TRANSITIONS,
  MANAGEMENT_STATUS_TRANSITIONS,
  PRIORITY_MAP,
  STATUS_MAP,
  type RelatedUser,
  type TaskItem,
  type TaskStatus,
  type UpdateTaskInput,
} from "@/src/services/todo/constant";

type Props = {
  area: AppArea;
  tasks: TaskItem[];
  loading: boolean;
  users: User[];
  currentUser?: User | null;
  assignByTask: Record<string, string>;
  assigningTaskId: string | null;
  updatingTaskId: string | null;
  savingTaskId: string | null;
  deletingTaskId: string | null;
  onSelectAssignUser: (taskId: string, userId: string) => void;
  onAssignTask: (taskId: string) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onUpdateTask: (taskId: string, input: UpdateTaskInput) => Promise<boolean>;
  onRemoveTask: (taskId: string) => void;
};

const displayName = (
  value?: string | RelatedUser,
  users: User[] = [],
  currentUser?: User | null,
) => {
  if (!value) return "Chưa phân công";
  const targetId = typeof value === "string" ? value : value._id;

  if (currentUser && targetId === currentUser._id) {
    return (currentUser.username || currentUser.name || "Tôi") + " (Bạn)";
  }

  if (typeof value === "string") {
    const matchedUser = users.find((user) => user._id === value);
    return matchedUser ? matchedUser.username || matchedUser.name : value;
  }
  return value.username || value.name || value.email || value._id;
};

export default function AdminTodoTaskListCard({
  area,
  tasks,
  loading,
  users,
  currentUser,
  assignByTask,
  assigningTaskId,
  updatingTaskId,
  savingTaskId,
  deletingTaskId,
  onSelectAssignUser,
  onAssignTask,
  onUpdateStatus,
  onUpdateTask,
  onRemoveTask,
}: Props) {
  const isAdminArea = area === "admin";
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (editingTaskId && !tasks.some((task) => task._id === editingTaskId)) {
      setEditingTaskId(null);
    }
  }, [editingTaskId, tasks]);

  return (
    <View className="rounded-2xl border border-slate-100 bg-white p-4" style={{ elevation: 2 }}>
      <View className="flex-row items-center justify-between mb-4 pb-2 border-b border-slate-50">
        <View className="flex-row items-center">
          <View
            className={`mr-2 rounded-lg p-1.5 ${
              isAdminArea ? "bg-red-50" : "bg-blue-50"
            }`}
          >
            <Ionicons
              name="list-outline"
              size={20}
              color={isAdminArea ? "#dc2626" : "#3b82f6"}
            />
          </View>
          <Text className="text-base font-bold text-slate-800">
            {isAdminArea ? "Tất cả công việc" : "Công việc của tôi"}
          </Text>
        </View>
        <View className="bg-slate-100 px-2.5 py-1 rounded-full">
          <Text className="text-xs font-bold text-slate-600">
            {tasks.length} việc
          </Text>
        </View>
      </View>

      {loading ? (
        <View className="items-center justify-center py-10">
          <ActivityIndicator
            size="small"
            color={isAdminArea ? "#dc2626" : "#2563eb"}
          />
          <Text className="mt-2 text-xs font-medium text-slate-400">
            Đang tải danh sách...
          </Text>
        </View>
      ) : tasks.length === 0 ? (
        <View className="items-center justify-center py-8">
          <Ionicons name="file-tray-outline" size={40} color="#cbd5e1" />
          <Text className="text-slate-400 text-sm font-medium mt-2">
            Chưa có công việc nào được phân công
          </Text>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {tasks.map((task) => {
            const isOverdue =
              task.deadline &&
              new Date(task.deadline) < new Date() &&
              task.status !== "done" &&
              task.status !== "cancelled";
            const priorityInfo = PRIORITY_MAP[task.priority];
            const statusInfo = STATUS_MAP[task.status];
            const allowedStatuses = isAdminArea
              ? MANAGEMENT_STATUS_TRANSITIONS[task.status]
              : ASSIGNEE_STATUS_TRANSITIONS[task.status];
            const canAssign =
              task.status !== "done" && task.status !== "cancelled";

            return (
              <View
                key={task._id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                {/* Header: Title and Priority Badge */}
                <View className="flex-row items-start justify-between">
                  <Text className="text-sm font-bold text-slate-800 flex-1 mr-2 leading-relaxed">
                    {task.title}
                  </Text>
                  <View
                    className={`px-2 py-0.5 rounded-lg border flex-row items-center ${priorityInfo.bgClass} ${priorityInfo.borderClass}`}
                  >
                    <Ionicons
                      name={priorityInfo.icon as any}
                      size={10}
                      color={
                        task.priority === "high"
                          ? "#f43f5e"
                          : task.priority === "medium"
                          ? "#d97706"
                          : "#64748b"
                      }
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      className={`text-[10px] font-bold ${priorityInfo.textClass}`}
                    >
                      {priorityInfo.label}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                {!!task.description && (
                  <Text className="mt-2 rounded-xl border border-slate-100 bg-white p-2.5 text-xs leading-relaxed text-slate-500">
                    {task.description}
                  </Text>
                )}

                {/* Workflow Path: Handoff and Assignee */}
                <View className="mt-3 flex-row items-center rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <View className="flex-1 flex-row items-center">
                    <Ionicons
                      name="paper-plane-outline"
                      size={13}
                      color="#64748b"
                    />
                    <View className="ml-1.5">
                      <Text className="text-[10px] text-slate-400 font-medium leading-none">
                        Giao bởi
                      </Text>
                      <Text className="text-[11px] text-slate-700 font-bold mt-0.5">
                        {displayName(task.createdBy, users, currentUser)}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="arrow-forward"
                    size={12}
                    color="#cbd5e1"
                    style={{ marginHorizontal: 8 }}
                  />
                  <View className="flex-1 flex-row items-center">
                    <Ionicons name="person-outline" size={13} color="#64748b" />
                    <View className="ml-1.5">
                      <Text className="text-[10px] text-slate-400 font-medium leading-none">
                        Người nhận
                      </Text>
                      <Text className="text-[11px] text-slate-700 font-bold mt-0.5">
                        {displayName(task.assignedTo, users, currentUser)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Deadline */}
                {task.deadline ? (
                  <View
                    className={`flex-row items-center mt-2.5 px-3 py-2 rounded-xl border ${
                      isOverdue
                        ? "bg-rose-50 border-rose-100"
                        : "bg-slate-50 border-slate-100"
                    }`}
                  >
                    <Ionicons
                      name={
                        isOverdue
                          ? "alert-circle-outline"
                          : "calendar-outline"
                      }
                      size={14}
                      color={isOverdue ? "#f43f5e" : "#64748b"}
                    />
                    <Text
                      className={`text-xs ml-1.5 font-medium ${
                        isOverdue ? "text-rose-600 font-semibold" : "text-slate-600"
                      }`}
                    >
                      Hạn chót: {new Date(task.deadline).toLocaleString()}
                      {isOverdue ? " (Đã quá hạn!)" : ""}
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center mt-2.5 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color="#64748b"
                    />
                    <Text className="text-xs text-slate-500 ml-1.5 font-medium">
                      Không có thời hạn cụ thể
                    </Text>
                  </View>
                )}

                {/* Current Status Badge */}
                <View className="flex-row items-center mt-3">
                  <Text className="text-xs font-semibold text-slate-400 mr-2">
                    Trạng thái hiện tại:
                  </Text>
                  <View
                    className={`px-2.5 py-0.5 rounded-full border flex-row items-center ${statusInfo.bgClass} ${statusInfo.borderClass}`}
                  >
                    <Ionicons
                      name={statusInfo.icon as any}
                      size={11}
                      color={
                        task.status === "todo"
                          ? "#2563eb"
                          : task.status === "in_progress"
                          ? "#d97706"
                          : task.status === "done"
                          ? "#16a34a"
                          : "#6b7280"
                      }
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      className={`text-xs font-semibold ${statusInfo.textClass}`}
                    >
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>

                {/* Update Status Actions */}
                {allowedStatuses.length > 0 ? (
                  <>
                    <Text className="mb-2 mt-4 text-xs font-bold text-slate-700">
                      Chuyển sang trạng thái
                    </Text>
                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                      {allowedStatuses.map((nextStatus) => {
                        const statusConfig = STATUS_MAP[nextStatus];
                        return (
                          <Pressable
                            key={nextStatus}
                            onPress={() =>
                              onUpdateStatus(task._id, nextStatus)
                            }
                            disabled={updatingTaskId === task._id}
                            className={`flex-row items-center rounded-xl border px-3 py-2 ${statusConfig.bgClass} ${statusConfig.borderClass}`}
                            style={updatingTaskId === task._id ? { opacity: 0.5 } : undefined}
                          >
                            <Ionicons
                              name={statusConfig.icon as any}
                              size={12}
                              color={
                                nextStatus === "todo"
                                  ? "#2563eb"
                                  : nextStatus === "in_progress"
                                    ? "#d97706"
                                    : nextStatus === "done"
                                      ? "#16a34a"
                                      : "#6b7280"
                              }
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              className={`text-xs font-semibold ${statusConfig.textClass}`}
                            >
                              {updatingTaskId === task._id
                                ? "Đang cập nhật..."
                                : statusConfig.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : (
                  <Text className="mt-3 text-xs font-medium text-slate-400">
                    Công việc đã ở trạng thái kết thúc.
                  </Text>
                )}

                {/* Admin Actions */}
                {isAdminArea ? (
                  <View className="mt-4 pt-3 border-t border-slate-100">
                    {editingTaskId === task._id ? (
                      <AdminTodoEditTaskForm
                        task={task}
                        saving={savingTaskId === task._id}
                        onCancel={() => setEditingTaskId(null)}
                        onSave={async (input) => {
                          const saved = await onUpdateTask(task._id, input);
                          if (saved) setEditingTaskId(null);
                          return saved;
                        }}
                      />
                    ) : (
                      <Pressable
                        onPress={() => setEditingTaskId(task._id)}
                        className="mb-3 flex-row items-center justify-center rounded-xl border border-red-100 bg-red-50 py-2.5"
                      >
                        <Ionicons
                          name="create-outline"
                          size={14}
                          color="#dc2626"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-xs font-bold text-red-600">
                          Chỉnh sửa công việc
                        </Text>
                      </Pressable>
                    )}

                    {canAssign ? (
                      <View>
                        <Text className="mb-2 text-xs font-bold text-slate-700">
                          Bàn giao cho nhân viên khác
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          <View className="flex-row py-0.5" style={{ gap: 8 }}>
                            {users.map((candidate) => {
                              const isSelected =
                                assignByTask[task._id] === candidate._id;
                              return (
                                <Pressable
                                  key={`${task._id}_${candidate._id}`}
                                  onPress={() =>
                                    onSelectAssignUser(
                                      task._id,
                                      candidate._id,
                                    )
                                  }
                                  className={`flex-row items-center rounded-xl border px-3 py-1.5 ${
                                    isSelected
                                      ? "border-red-600 bg-red-600"
                                      : "border-slate-200 bg-white"
                                  }`}
                                >
                                  <Ionicons
                                    name="person-outline"
                                    size={12}
                                    color={
                                      isSelected ? "#ffffff" : "#64748b"
                                    }
                                    style={{ marginRight: 4 }}
                                  />
                                  <Text
                                    className={`text-xs font-semibold ${
                                      isSelected
                                        ? "text-white"
                                        : "text-slate-600"
                                    }`}
                                  >
                                    {candidate.username || candidate.name}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </ScrollView>
                        <Pressable
                          onPress={() => onAssignTask(task._id)}
                          disabled={assigningTaskId === task._id}
                          className={`mt-3 flex-row items-center justify-center rounded-xl py-3 ${
                            assigningTaskId === task._id
                              ? "bg-red-300"
                              : "bg-red-600"
                          }`}
                          style={assigningTaskId !== task._id ? { elevation: 2 } : undefined}
                        >
                          <Ionicons
                            name="person-add-outline"
                            size={14}
                            color="#ffffff"
                            style={{ marginRight: 6 }}
                          />
                          <Text className="text-xs font-bold text-white">
                            {assigningTaskId === task._id
                              ? "Đang giao..."
                              : "Bàn giao"}
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text className="text-xs font-medium text-slate-400">
                        Hãy mở lại công việc trước khi bàn giao cho người khác.
                      </Text>
                    )}

                    <View className="mt-3">
                      <Pressable
                        onPress={() => onRemoveTask(task._id)}
                        disabled={deletingTaskId === task._id}
                        className={`items-center flex-row justify-center rounded-xl border border-rose-100 py-3 ${
                          deletingTaskId === task._id
                            ? "bg-rose-100"
                            : "bg-rose-50"
                          }`}
                          style={deletingTaskId === task._id ? { opacity: 0.6 } : undefined}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={14}
                          color="#ef4444"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-rose-600 font-bold text-xs">
                          {deletingTaskId === task._id
                            ? "Đang xóa..."
                            : "Xóa việc"}
                        </Text>
                      </Pressable>
                    </View>
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
