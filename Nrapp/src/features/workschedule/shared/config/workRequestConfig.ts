import type { WorkRequestType } from "@/src/services/workschedule/constant";
import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

type IconName = ComponentProps<typeof Ionicons>["name"];

export const WORK_REQUEST_CONFIG: Record<
  WorkRequestType,
  {
    title: string;
    shortTitle: string;
    description: string;
    icon: IconName;
    color: string;
    background: string;
  }
> = {
  leave: {
    title: "Đơn xin nghỉ",
    shortTitle: "Xin nghỉ",
    description: "Nghỉ cả ngày, buổi sáng hoặc buổi chiều",
    icon: "document-text-outline",
    color: "#e11d48",
    background: "bg-rose-50",
  },
  late: {
    title: "Đơn xin đến muộn",
    shortTitle: "Đến muộn",
    description: "Báo giờ đến dự kiến và lý do",
    icon: "time-outline",
    color: "#d97706",
    background: "bg-amber-50",
  },
  early: {
    title: "Đơn xin về sớm",
    shortTitle: "Về sớm",
    description: "Báo giờ rời công ty và lý do",
    icon: "exit-outline",
    color: "#ea580c",
    background: "bg-orange-50",
  },
  overtime: {
    title: "Đơn xin làm ngoài giờ",
    shortTitle: "Làm ngoài giờ",
    description: "Đăng ký thời gian, công việc và dự án OT",
    icon: "layers-outline",
    color: "#2563eb",
    background: "bg-blue-50",
  },
  business_trip: {
    title: "Đơn xin đi công tác",
    shortTitle: "Đi công tác",
    description: "Thời gian, địa điểm và chi phí dự kiến",
    icon: "briefcase-outline",
    color: "#0891b2",
    background: "bg-cyan-50",
  },
  remote: {
    title: "Đơn đăng ký làm Remote",
    shortTitle: "Làm Remote",
    description: "Đăng ký làm việc từ xa theo buổi",
    icon: "home-outline",
    color: "#7c3aed",
    background: "bg-violet-50",
  },
};

export const WORK_REQUEST_TYPES = Object.keys(WORK_REQUEST_CONFIG) as WorkRequestType[];
