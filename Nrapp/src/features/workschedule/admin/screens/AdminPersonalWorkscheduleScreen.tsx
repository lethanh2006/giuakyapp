import { APP_ROUTES } from "@/src/application/navigation/routes";
import { MonthlyRegistrationScreen } from "@/src/features/workschedule/shared/screens/MonthlyRegistrationScreen";
import { router } from "expo-router";

export default function AdminPersonalWorkscheduleScreen() {
  return <MonthlyRegistrationScreen tone="admin" onBack={() => router.replace(APP_ROUTES.admin.utilities)} />;
}
