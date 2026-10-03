import { WorkDayScheduleEditor } from "@/src/features/workschedule/shared/ui/WorkDayScheduleEditor";
import type { ComponentProps } from "react";

export function UserDayScheduleEditor(props: ComponentProps<typeof WorkDayScheduleEditor>) {
  return <WorkDayScheduleEditor {...props} tone="default" />;
}
