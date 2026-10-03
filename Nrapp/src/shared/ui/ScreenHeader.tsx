import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
  tone?: "default" | "admin";
};

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightSlot,
  tone = "default",
}: ScreenHeaderProps) {
  const isAdmin = tone === "admin";

  return (
    <View
      className={`min-h-16 flex-row items-center border-b px-4 py-3 ${
        isAdmin
          ? "border-red-800 bg-red-900"
          : "border-slate-100 bg-white"
      }`}
    >
      {isAdmin ? (
        <View className="absolute -right-8 -top-12 h-28 w-28 rounded-full bg-red-500/20" />
      ) : null}
      {onBack ? (
        <Pressable
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          className={`mr-3 h-10 w-10 items-center justify-center rounded-xl ${
            isAdmin
              ? "border border-white/15 bg-white/10 active:bg-white/20"
              : "bg-slate-100 active:bg-slate-200"
          }`}
          hitSlop={8}
          onPress={onBack}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={isAdmin ? "#ffffff" : "#334155"}
          />
        </Pressable>
      ) : null}

      <View className="min-w-0 flex-1">
        <Text
          className={`text-lg font-black tracking-tight ${
            isAdmin ? "text-white" : "text-slate-900"
          }`}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            className={`mt-0.5 text-[11px] leading-4 ${
              isAdmin ? "text-red-100/75" : "text-slate-500"
            }`}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightSlot ? <View className="ml-3">{rightSlot}</View> : null}
    </View>
  );
}
