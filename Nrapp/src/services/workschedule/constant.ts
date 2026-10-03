export type EntryType = "office" | "remote" | "day_off" | "leave";
export type WorkPeriod = "full_day" | "morning" | "afternoon";
export type RequestStatus = "pending" | "approved" | "rejected";
export type WorkRequestType =
  | "leave"
  | "late"
  | "early"
  | "overtime"
  | "business_trip"
  | "remote";
export type WorkRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface IScheduleEntry {
  _id?: string;
  date: string;
  type: EntryType;
  period?: WorkPeriod;
  note?: string;
}

export interface IScheduleRequest {
  _id: string;
  employee_id: unknown;
  month?: string;
  week_start?: string;
  status: RequestStatus;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  reject_reason?: string;
  entries?: IScheduleEntry[];
}

export interface IWorkPolicy {
  schedule_month?: string | null;
  registration_start: string;
  registration_end: string;
  locked?: boolean;
}

export interface IMonthlyScheduleEntry extends IScheduleEntry {
  schedule_request_id: string;
  month?: string;
  week_start?: string;
  request_status: RequestStatus;
  reject_reason?: string;
}

export interface IMonthlyScheduleStats {
  registered_sessions: number;
  approved_sessions: number;
  office_sessions: number;
  remote_sessions: number;
  leave_sessions: number;
  day_off_sessions: number;
  approved_work_days: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
}

export interface IMonthlyScheduleOverview {
  month: string;
  entries: IMonthlyScheduleEntry[];
  stats: IMonthlyScheduleStats;
}

export interface IWorkRequest {
  _id: string;
  employee_id: string;
  type: WorkRequestType;
  status: WorkRequestStatus;
  start_at: string;
  end_at?: string;
  period: WorkPeriod;
  reason: string;
  location?: string;
  project?: string;
  estimated_cost?: number;
  manager_id?: string;
  attachment_urls?: string[];
  is_school_leave?: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  reject_reason?: string;
  createdAt?: string;
  employee?: AdminEmployeeProfile | null;
}

export interface CreateWorkRequestPayload {
  type: WorkRequestType;
  start_at: string;
  end_at?: string;
  period: WorkPeriod;
  reason: string;
  location?: string;
  project?: string;
  estimated_cost?: number;
  manager_id?: string;
  attachment_urls?: string[];
  is_school_leave?: boolean;
}

export interface IWorkRequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  approved_overtime_hours: number;
  by_type: Partial<Record<WorkRequestType, number>>;
  approved_by_type: Partial<Record<WorkRequestType, number>>;
}

export interface WorkRequestQuery {
  month?: string;
  type?: WorkRequestType | "all";
  status?: WorkRequestStatus | "all";
}

export interface AdminEmployeeProfile {
  _id?: string;
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
}

export interface AdminScheduleRequest {
  _id: string;
  employee_id: string;
  month?: string;
  week_start?: string;
  status: RequestStatus;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  reject_reason?: string;
  employee?: AdminEmployeeProfile | null;
  entries?: IScheduleEntry[];
}

export interface AdminAttendanceRecord {
  _id: string;
  employee_id: string;
  date: string;
  schedule_type: "office" | "remote";
  check_in_at?: string;
  check_out_at?: string;
  source: "qr" | "schedule";
  employee?: AdminEmployeeProfile | null;
}

export type PersonalAttendanceRecord = AdminAttendanceRecord;

export interface AttendanceHistoryQuery {
  from?: string;
  to?: string;
}

export interface AdminHeatmapRow {
  _id: string;
  stats: {
    type: EntryType;
    count: number;
  }[];
}

export interface WorkscheduleQuery {
  month?: string;
  week?: string;
  status?: string;
  from?: string;
  to?: string;
  employee_id?: string;
}

export interface AttendanceScanResponse {
  success: boolean;
  message?: string;
  data?: {
    check_in_at?: string;
    check_out_at?: string;
    date: string;
    schedule_type: string;
  };
}

export const SCHEDULE_TYPE_OPTIONS: {
  value: EntryType;
  label: string;
  textClassName: string;
  backgroundClassName: string;
  borderClassName: string;
  icon: "business" | "home" | "sunny" | "cafe";
}[] = [
  {
    value: "office",
    label: "Lên cty",
    textClassName: "text-blue-700",
    backgroundClassName: "bg-blue-50/80",
    borderClassName: "border-blue-200",
    icon: "business",
  },
  {
    value: "remote",
    label: "Từ xa",
    textClassName: "text-purple-700",
    backgroundClassName: "bg-purple-50/80",
    borderClassName: "border-purple-200",
    icon: "home",
  },
  {
    value: "day_off",
    label: "Nghỉ",
    textClassName: "text-slate-500",
    backgroundClassName: "bg-slate-50/80",
    borderClassName: "border-slate-200",
    icon: "sunny",
  },
  {
    value: "leave",
    label: "Phép",
    textClassName: "text-orange-700",
    backgroundClassName: "bg-orange-50/80",
    borderClassName: "border-orange-200",
    icon: "cafe",
  },
];

export const WEEKDAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
