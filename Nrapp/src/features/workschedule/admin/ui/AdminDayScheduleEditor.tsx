import { WorkDayScheduleEditor } from "@/src/features/workschedule/shared/ui/WorkDayScheduleEditor";
import type { ComponentProps } from "react";

export function AdminDayScheduleEditor(props: ComponentProps<typeof WorkDayScheduleEditor>) {
  return <WorkDayScheduleEditor {...props} tone="admin" />;
}
