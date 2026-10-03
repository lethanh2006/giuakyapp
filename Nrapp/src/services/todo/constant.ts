export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high";

export interface RelatedUser {
  _id: string;
  username?: string;
  name?: string;
  email?: string;
}

export interface TaskItem {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdBy?: string | RelatedUser;
  assignedTo?: string | RelatedUser;
  deadline?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority: TaskPriority;
  deadline?: string;
  assignedTo?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  deadline?: string | null;
}

export interface MyTaskQuery {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminTaskQuery extends MyTaskQuery {
  assignedTo?: string;
  createdBy?: string;
}

export interface TaskPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TaskPage {
  tasks: TaskItem[];
  pagination: TaskPagination;
}

export const STATUS_OPTIONS: TaskStatus[] = [
  "todo",
  "in_progress",
  "done",
  "cancelled",
];

export const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high"];

export const ASSIGNEE_STATUS_TRANSITIONS: Readonly<
  Record<TaskStatus, readonly TaskStatus[]>
> = {
  todo: ["in_progress"],
  in_progress: ["done"],
  done: [],
  cancelled: [],
};

export const MANAGEMENT_STATUS_TRANSITIONS: Readonly<
  Record<TaskStatus, readonly TaskStatus[]>
> = {
  todo: ["in_progress", "cancelled"],
  in_progress: ["todo", "done", "cancelled"],
  done: ["in_progress"],
  cancelled: ["todo"],
};

export const STATUS_MAP: Record<
  TaskStatus,
  {
    label: string;
    textClass: string;
    bgClass: string;
    borderClass: string;
    icon: string;
  }
> = {
  todo: {
    label: "Chờ thực hiện",
    textClass: "text-blue-600",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-200",
    icon: "hourglass-outline",
  },
  in_progress: {
    label: "Đang tiến hành",
    textClass: "text-amber-600",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
    icon: "trending-up-outline",
  },
  done: {
    label: "Hoàn thành",
    textClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-200",
    icon: "checkmark-circle-outline",
  },
  cancelled: {
    label: "Đã hủy",
    textClass: "text-gray-500",
    bgClass: "bg-gray-100",
    borderClass: "border-gray-200",
    icon: "close-circle-outline",
  },
};

export const PRIORITY_MAP: Record<
  TaskPriority,
  {
    label: string;
    textClass: string;
    bgClass: string;
    borderClass: string;
    icon: string;
  }
> = {
  low: {
    label: "Ưu tiên Thấp",
    textClass: "text-slate-600",
    bgClass: "bg-slate-50",
    borderClass: "border-slate-200",
    icon: "arrow-down-outline",
  },
  medium: {
    label: "Ưu tiên Vừa",
    textClass: "text-amber-600",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
    icon: "remove-outline",
  },
  high: {
    label: "Ưu tiên Cao",
    textClass: "text-rose-600",
    bgClass: "bg-rose-50",
    borderClass: "border-rose-200",
    icon: "arrow-up-outline",
  },
};
