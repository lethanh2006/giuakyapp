import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import { canAccessArea, getAreaForRole, type AppArea } from "@/src/application/access/roles";
import { APP_ROUTES } from "@/src/application/navigation/routes";
import { Redirect, Slot } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function AreaGuard({ area }: { area: AppArea }) {
  const { isAuth, loading, user } = useAuthSession();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!isAuth || !user) return <Redirect href={APP_ROUTES.auth.login} />;
  if (!canAccessArea(user.role, area)) {
    return <Redirect href={APP_ROUTES[getAreaForRole(user.role)].home} />;
  }

  return <Slot />;
}
