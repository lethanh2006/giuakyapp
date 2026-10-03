import { canManageTasks, type AppArea } from "@/src/application/access/roles";
import AdminTodoCreateTaskCard from "@/src/features/todo/admin/ui/AdminTodoCreateTaskCard";
import AdminTodoIntroCard from "@/src/features/todo/admin/ui/AdminTodoIntroCard";
import AdminTodoTaskFilters from "@/src/features/todo/admin/ui/AdminTodoTaskFilters";
import AdminTodoTaskListCard from "@/src/features/todo/admin/ui/AdminTodoTaskListCard";
import type {
  CreateTaskInput,
  TaskItem,
  TaskPagination,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from "@/src/services/todo/constant";
import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import { normalizeUser } from "@/src/shared/model/normalize-user";
import {
  assignTodoTask,
  createTodoTask,
  deleteTodoTask,
  getAdminTasks,
  getMyTasks,
  updateTodoTask,
  updateTodoStatus,
} from "@/src/services/todo/todo.service";
import { getApiErrorMessage } from "@/src/utils/apiHelper";
import { getAllUsers } from "@/src/services/user/user.service";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import type { User } from "@/src/services/user/constant";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";

const TASK_PAGE_LIMIT = 10;

const INITIAL_PAGINATION: TaskPagination = {
  page: 1,
  limit: TASK_PAGE_LIMIT,
  total: 0,
  totalPages: 0,
};

export default function AdminTodoScreen() {
  const { loading: appLoading, isAuth, user, getToken } = useAuthSession();
  const area: AppArea = canManageTasks(user?.role) ? "admin" : "user";
  const isAdminArea = area === "admin";
  const [users, setUsers] = useState<User[]>([]);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [pagination, setPagination] =
    useState<TaskPagination>(INITIAL_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<TaskStatus | null>(null);
  const [priorityFilter, setPriorityFilter] =
    useState<TaskPriority | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const taskRequestRef = useRef(0);
  const initializedRef = useRef(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [createAssignee, setCreateAssignee] = useState<string>("");

  const [assignByTask, setAssignByTask] = useState<Record<string, string>>({});

  const selectableUsers = useMemo(() => {
    const currentUserId = user?._id;
    return (users || []).filter((candidate) => candidate._id !== currentUserId);
  }, [users, user?._id]);

  const loadTasks = useCallback(async () => {
    if (!isAuth) return;

    const requestNumber = ++taskRequestRef.current;
    try {
      setTasksLoading(true);
      const token = await getToken();
      if (!token) return;

      const query = {
        page,
        limit: TASK_PAGE_LIMIT,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(priorityFilter ? { priority: priorityFilter } : {}),
        ...(search ? { search } : {}),
      };
      const result = isAdminArea
        ? await getAdminTasks(token, query)
        : await getMyTasks(token, query);

      if (requestNumber !== taskRequestRef.current) return;
      setTasks(result.tasks);
      setPagination(result.pagination);
    } catch (error: unknown) {
      if (requestNumber !== taskRequestRef.current) return;
      Alert.alert("Lỗi", getApiErrorMessage(error, "Không tải được công việc"));
    } finally {
      if (requestNumber === taskRequestRef.current) setTasksLoading(false);
    }
  }, [
    getToken,
    isAdminArea,
    isAuth,
    page,
    priorityFilter,
    search,
    statusFilter,
  ]);

  const loadUsers = useCallback(async () => {
    if (!isAdminArea || !isAuth) return;
    try {
      const token = await getToken();
      if (!token) return;
      const { data } = await getAllUsers(token);
      setUsers((data.users ?? []).map(normalizeUser));
    } catch (error: unknown) {
      Alert.alert(
        "Lỗi",
        getApiErrorMessage(error, "Không tải được danh sách nhân viên"),
      );
    }
  }, [getToken, isAdminArea, isAuth]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadTasks();
      if (mounted && !initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadTasks]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (pagination.totalPages > 0 && page > pagination.totalPages) {
      setPage(pagination.totalPages);
    }
  }, [page, pagination.totalPages]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadTasks(), loadUsers()]);
    } finally {
      setRefreshing(false);
    }
  };

  const createTask = async () => {
    if (!title.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập tiêu đề");
      return;
    }

    if (createAssignee && createAssignee === user?._id) {
      Alert.alert("Thông báo", "Không thể tự giao việc cho chính mình");
      return;
    }

    try {
      setCreating(true);
      const payload: CreateTaskInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      };

      if (deadline) payload.deadline = deadline.toISOString();
      if (createAssignee) payload.assignedTo = createAssignee;

      const token = await getToken();
      if (!token) return;
      await createTodoTask(token, payload);
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDeadline(null);
      setCreateAssignee("");
      if (page === 1) await loadTasks();
      else setPage(1);
      Alert.alert("Thành công", "Đã tạo công việc");
    } catch (error: unknown) {
      Alert.alert("Lỗi", getApiErrorMessage(error, "Không tạo được công việc"));
    } finally {
      setCreating(false);
    }
  };

  const assignTask = async (taskId: string) => {
    const assignedTo = assignByTask[taskId];
    if (!assignedTo) {
      Alert.alert("Thông báo", "Hãy chọn người được giao");
      return;
    }

    if (assignedTo === user?._id) {
      Alert.alert("Thông báo", "Không thể tự giao việc cho chính mình");
      return;
    }

    try {
      setAssigningTaskId(taskId);
      const token = await getToken();
      if (!token) return;
      await assignTodoTask(token, taskId, assignedTo);
      await loadTasks();
      Alert.alert("Thành công", "Đã giao công việc");
    } catch (error: unknown) {
      Alert.alert("Lỗi", getApiErrorMessage(error, "Không giao được công việc"));
    } finally {
      setAssigningTaskId(null);
    }
  };

  const updateStatus = async (taskId: string, status: TaskStatus) => {
    try {
      setUpdatingTaskId(taskId);
      const token = await getToken();
      if (!token) return;
      await updateTodoStatus(token, taskId, status);
      await loadTasks();
    } catch (error: unknown) {
      Alert.alert(
        "Lỗi",
        getApiErrorMessage(error, "Không cập nhật được trạng thái"),
      );
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const updateTask = async (
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<boolean> => {
    try {
      setSavingTaskId(taskId);
      const token = await getToken();
      if (!token) return false;
      await updateTodoTask(token, taskId, input);
      await loadTasks();
      Alert.alert("Thành công", "Đã cập nhật nội dung công việc");
      return true;
    } catch (error: unknown) {
      Alert.alert(
        "Lỗi",
        getApiErrorMessage(error, "Không cập nhật được công việc"),
      );
      return false;
    } finally {
      setSavingTaskId(null);
    }
  };

  const removeTask = async (taskId: string) => {
    try {
      setDeletingTaskId(taskId);
      const token = await getToken();
      if (!token) return;
      await deleteTodoTask(token, taskId);
      await loadTasks();
      Alert.alert("Thành công", "Đã xoá công việc");
    } catch (error: unknown) {
      Alert.alert("Lỗi", getApiErrorMessage(error, "Không xoá được công việc"));
    } finally {
      setDeletingTaskId(null);
    }
  };

  if (appLoading || loading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          isAdminArea ? "bg-slate-50" : "bg-white"
        }`}
      >
        <ActivityIndicator
          size="large"
          color={isAdminArea ? "#dc2626" : "#2563eb"}
        />
      </View>
    );
  }

  return (
    <ScrollView
      className={`flex-1 ${isAdminArea ? "bg-slate-50" : "bg-white"}`}
      contentContainerStyle={{ padding: 16, gap: 14 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={isAdminArea ? "#dc2626" : "#2563eb"}
        />
      }
    >
      <AdminTodoIntroCard area={area} />

      {isAdminArea ? (
        <AdminTodoCreateTaskCard
          title={title}
          description={description}
          deadline={deadline}
          priority={priority}
          createAssignee={createAssignee}
          users={selectableUsers}
          creating={creating}
          setTitle={setTitle}
          setDescription={setDescription}
          setDeadline={setDeadline}
          setPriority={setPriority}
          setCreateAssignee={setCreateAssignee}
          onCreateTask={createTask}
        />
      ) : null}

      <AdminTodoTaskFilters
        area={area}
        status={statusFilter}
        priority={priorityFilter}
        searchInput={searchInput}
        appliedSearch={search}
        page={page}
        total={pagination.total}
        totalPages={pagination.totalPages}
        loading={tasksLoading}
        onChangeStatus={(value) => {
          setPage(1);
          setStatusFilter(value);
        }}
        onChangePriority={(value) => {
          setPage(1);
          setPriorityFilter(value);
        }}
        onChangeSearchInput={setSearchInput}
        onApplySearch={() => {
          setPage(1);
          setSearch(searchInput.trim());
        }}
        onReset={() => {
          setPage(1);
          setStatusFilter(null);
          setPriorityFilter(null);
          setSearchInput("");
          setSearch("");
        }}
        onChangePage={setPage}
      />

      <AdminTodoTaskListCard
        area={area}
        tasks={tasks}
        loading={tasksLoading}
        users={selectableUsers}
        currentUser={user}
        assignByTask={assignByTask}
        assigningTaskId={assigningTaskId}
        updatingTaskId={updatingTaskId}
        savingTaskId={savingTaskId}
        deletingTaskId={deletingTaskId}
        onSelectAssignUser={(taskId, userId) =>
          setAssignByTask((prev) => ({
            ...prev,
            [taskId]: userId,
          }))
        }
        onAssignTask={assignTask}
        onUpdateStatus={updateStatus}
        onUpdateTask={updateTask}
        onRemoveTask={removeTask}
      />
    </ScrollView>
  );
}
