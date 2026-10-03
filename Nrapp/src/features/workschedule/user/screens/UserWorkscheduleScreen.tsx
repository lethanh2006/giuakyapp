import { APP_ROUTES } from "@/src/application/navigation/routes";
import { MonthlyRegistrationScreen } from "@/src/features/workschedule/shared/screens/MonthlyRegistrationScreen";
import { router } from "expo-router";

export default function UserWorkscheduleScreen() {
  return <MonthlyRegistrationScreen tone="default" onBack={() => router.replace(APP_ROUTES.user.utilities)} />;
}
