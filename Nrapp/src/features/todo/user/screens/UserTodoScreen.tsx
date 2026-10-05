import UserTodoIntroCard from "@/src/features/todo/user/ui/UserTodoIntroCard";
import UserTodoTaskFilters from "@/src/features/todo/user/ui/UserTodoTaskFilters";
import UserTodoTaskListCard from "@/src/features/todo/user/ui/UserTodoTaskListCard";
import {
  SORT_OPTIONS,
  type SpecialDeadlineFilter,
  type TaskItem,
  type TaskPagination,
  type TaskPriority,
  type TaskSortOption,
  type TaskStatus,
} from "@/src/services/todo/constant";
import {
  getMyTasks,
  getOverdueTasks,
  getUpcomingDeadlineTasks,
  updateTodoProgress,
  updateTodoStatus,
} from "@/src/services/todo/todo.service";
import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import { getApiErrorMessage } from "@/src/utils/apiHelper";
import { useCallback, useEffect, useRef, useState } from "react";
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

export default function UserTodoScreen() {
  const { getToken, isAuth, loading: sessionLoading } = useAuthSession();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | null>(null);
  const [sortOption, setSortOption] = useState<TaskSortOption>(SORT_OPTIONS[0]);
  const [specialFilter, setSpecialFilter] = useState<SpecialDeadlineFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const requestRef = useRef(0);

  const loadTasks = useCallback(async () => {
    if (!isAuth) return;
    const requestNumber = ++requestRef.current;
    setTasksLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      if (specialFilter === "overdue") {
        const result = await getOverdueTasks(token);
        if (requestNumber !== requestRef.current) return;
        setTasks(result.tasks);
        setPagination({
          page: 1,
          limit: result.total,
          total: result.total,
          totalPages: 1,
        });
      } else if (specialFilter === "upcoming") {
        const result = await getUpcomingDeadlineTasks(token, 3);
        if (requestNumber !== requestRef.current) return;
        setTasks(result.tasks);
        setPagination({
          page: 1,
          limit: result.total,
          total: result.total,
          totalPages: 1,
        });
      } else {
        const result = await getMyTasks(token, {
          page,
          limit: TASK_PAGE_LIMIT,
          sortBy: sortOption.field,
          order: sortOption.order,
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(priorityFilter ? { priority: priorityFilter } : {}),
          ...(search ? { search } : {}),
        });
        if (requestNumber !== requestRef.current) return;
        setTasks(result.tasks);
        setPagination(result.pagination);
      }
    } catch (error) {
      if (requestNumber === requestRef.current) {
        Alert.alert("Lỗi", getApiErrorMessage(error, "Không tải được công việc"));
      }
    } finally {
      if (requestNumber === requestRef.current) {
        setTasksLoading(false);
        setInitialLoading(false);
      }
    }
  }, [
    getToken,
    isAuth,
    page,
    priorityFilter,
    search,
    sortOption,
    specialFilter,
    statusFilter,
  ]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (pagination.totalPages > 0 && page > pagination.totalPages) {
      setPage(pagination.totalPages);
    }
  }, [page, pagination.totalPages]);

  const refresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const updateStatus = async (taskId: string, status: TaskStatus) => {
    setUpdatingTaskId(taskId);
    try {
      const token = await getToken();
      if (!token) return;
      await updateTodoStatus(token, taskId, status);
      await loadTasks();
    } catch (error) {
      Alert.alert(
        "Lỗi",
        getApiErrorMessage(error, "Không cập nhật được trạng thái"),
      );
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const updateProgress = async (taskId: string, progress: number) => {
    setUpdatingTaskId(taskId);
    try {
      const token = await getToken();
      if (!token) return;
      await updateTodoProgress(token, taskId, progress);
      await loadTasks();
    } catch (error) {
      Alert.alert(
        "Lỗi",
        getApiErrorMessage(error, "Không cập nhật được tiến độ"),
      );
    } finally {
      setUpdatingTaskId(null);
    }
  };

  if (sessionLoading || initialLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          tintColor="#2563eb"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <UserTodoIntroCard />
      <UserTodoTaskFilters
        status={statusFilter}
        priority={priorityFilter}
        sortOption={sortOption}
        specialFilter={specialFilter}
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
        onSelectSort={(opt) => {
          setPage(1);
          setSortOption(opt);
        }}
        onChangeSpecialFilter={(tab) => {
          setPage(1);
          setSpecialFilter(tab);
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
          setSortOption(SORT_OPTIONS[0]);
          setSpecialFilter("all");
          setSearchInput("");
          setSearch("");
        }}
        onChangePage={setPage}
      />
      <UserTodoTaskListCard
        tasks={tasks}
        loading={tasksLoading}
        updatingTaskId={updatingTaskId}
        onUpdateStatus={(taskId, status) => void updateStatus(taskId, status)}
        onUpdateProgress={(taskId, progress) => void updateProgress(taskId, progress)}
      />
    </ScrollView>
  );
}
