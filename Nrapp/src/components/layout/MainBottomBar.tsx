import type { AppArea } from "@/src/application/access/roles";
import { getAreaRoutes } from "@/src/application/navigation/routes";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MainBottomBarProps = {
  area: AppArea;
  homeActive: boolean;
  profileActive: boolean;
  onOpenScanner: () => void;
};

export function MainBottomBar({
  area,
  homeActive,
  profileActive,
  onOpenScanner,
}: MainBottomBarProps) {
  const insets = useSafeAreaInsets();
  const routes = getAreaRoutes(area);
  const accentColor = area === "admin" ? "#b91c1c" : "#2563eb";

  return (
    <View
      className="flex-row items-center justify-around border-t border-slate-100 bg-white"
      style={{
        paddingBottom: insets.bottom + 6,
        paddingTop: 8,
        minHeight: 64 + insets.bottom,
      }}
    >
      <Pressable
        accessibilityLabel="Mở trang chủ"
        accessibilityRole="button"
        accessibilityState={{ selected: homeActive }}
        hitSlop={8}
        onPress={() => router.replace(routes.home)}
        className="flex-1 items-center justify-center"
      >
        <Ionicons
          name={homeActive ? "home" : "home-outline"}
          size={24}
          color={homeActive ? accentColor : "#94a3b8"}
        />
        <Text
          className="mt-1 text-[10px] font-semibold"
          style={{ color: homeActive ? accentColor : "#64748b" }}
        >
          Trang chủ
        </Text>
      </Pressable>

      <View className="-mt-6 flex-1 items-center justify-center">
        <Pressable
          accessibilityLabel="Quét mã chấm công"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onOpenScanner}
          className="h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
          style={{ backgroundColor: accentColor, elevation: 8 }}
        >
          <Ionicons name="scan" size={28} color="white" />
        </Pressable>
      </View>

      <Pressable
        accessibilityLabel="Mở hồ sơ cá nhân"
        accessibilityRole="button"
        accessibilityState={{ selected: profileActive }}
        hitSlop={8}
        onPress={() => router.replace(routes.profile)}
        className="flex-1 items-center justify-center"
      >
        <Ionicons
          name={profileActive ? "person" : "person-outline"}
          size={24}
          color={profileActive ? accentColor : "#94a3b8"}
        />
        <Text
          className="mt-1 text-[10px] font-semibold"
          style={{ color: profileActive ? accentColor : "#64748b" }}
        >
          Hồ sơ
        </Text>
      </Pressable>
    </View>
  );
}
