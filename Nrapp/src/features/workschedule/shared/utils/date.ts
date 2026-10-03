import type { IWorkPolicy } from "@/src/services/workschedule/constant";

export const toLocalDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Calendar days follow the workplace timezone, including on devices abroad.
export const getScheduleDateKey = (value: string | Date) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (name: string) =>
    parts.find((item) => item.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

export const monthDate = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1);
};

export const toMonthKey = (date: Date) => toLocalDateKey(date).slice(0, 7);

export const getScheduleToday = (now = new Date()) => {
  const [year, month, day] = getScheduleDateKey(now).split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const getRegistrationMonth = (policy: IWorkPolicy | null) => {
  if (!policy) return null;
  const start = getScheduleDateKey(policy.registration_start).slice(0, 7);
  const end = getScheduleDateKey(policy.registration_end).slice(0, 7);
  if (
    !start ||
    start !== end ||
    (policy.schedule_month && policy.schedule_month !== start)
  ) {
    return null;
  }
  return start;
};

export const isRegistrationClosed = (
  policy: IWorkPolicy | null,
  now = new Date(),
) => {
  if (!policy || !getRegistrationMonth(policy)) return true;
  if (policy.locked) return true;
  const registrationStart = new Date(policy.registration_start);
  const registrationEnd = new Date(policy.registration_end);
  if (
    Number.isNaN(registrationStart.getTime()) ||
    Number.isNaN(registrationEnd.getTime()) ||
    registrationStart >= registrationEnd
  ) {
    return true;
  }
  return now < registrationStart || now > registrationEnd;
};

export const formatDateVi = (value: string | Date | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
};

export const formatDateTimeVi = (value: string | Date | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  })} - ${date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`;
};
