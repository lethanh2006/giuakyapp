import axios from "@/src/utils/axios";
import { getAuthHeader } from "@/src/utils/apiHelper";
import { ipNR } from "@/src/utils/ip";
import type {
  AdminTaskQuery,
  CreateTaskInput,
  MyTaskQuery,
  TaskItem,
  TaskPage,
  TaskStatus,
  UpdateTaskInput,
} from "@/src/services/todo/constant";

const EMPTY_PAGE = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
} as const;

const normalizeTaskPage = (data: Partial<TaskPage>): TaskPage => ({
  tasks: Array.isArray(data.tasks) ? data.tasks : [],
  pagination: data.pagination ?? EMPTY_PAGE,
});

export async function getAdminTasks(
  token: string,
  query: AdminTaskQuery = {},
) {
  const { data } = await axios.get<TaskPage>(
    `${ipNR}/todo/`,
    { ...getAuthHeader(token), params: query },
  );
  return normalizeTaskPage(data);
}

export async function getMyTasks(token: string, query: MyTaskQuery = {}) {
  const { data } = await axios.get<TaskPage>(
    `${ipNR}/todo/my-tasks`,
    { ...getAuthHeader(token), params: query },
  );
  return normalizeTaskPage(data);
}

export async function createTodoTask(token: string, input: CreateTaskInput) {
  return axios.post(`${ipNR}/todo/`, input, getAuthHeader(token));
}

export async function assignTodoTask(
  token: string,
  taskId: string,
  assignedTo: string,
) {
  return axios.patch(
    `${ipNR}/todo/${encodeURIComponent(taskId)}/assign`,
    { assignedTo },
    getAuthHeader(token),
  );
}

export async function updateTodoTask(
  token: string,
  taskId: string,
  input: UpdateTaskInput,
) {
  return axios.patch<{ task: TaskItem }>(
    `${ipNR}/todo/${encodeURIComponent(taskId)}`,
    input,
    getAuthHeader(token),
  );
}

export async function updateTodoStatus(
  token: string,
  taskId: string,
  status: TaskStatus,
) {
  return axios.patch(
    `${ipNR}/todo/${encodeURIComponent(taskId)}/status`,
    { status },
    getAuthHeader(token),
  );
}

export async function deleteTodoTask(token: string, taskId: string) {
  return axios.delete(
    `${ipNR}/todo/${encodeURIComponent(taskId)}`,
    getAuthHeader(token),
  );
}
