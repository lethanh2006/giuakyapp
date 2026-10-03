import React from "react";
import { Text, View } from "react-native";

interface AdminStatCardProps {
  title: string;
  value: string | number;
  containerStyle?: string;
  titleStyle?: string;
  valueStyle?: string;
}

export function AdminStatCard({ title, value, containerStyle = "bg-slate-50 border-slate-200", titleStyle = "text-slate-500", valueStyle = "text-slate-900" }: AdminStatCardProps) {
  return (
    <View className={`flex-1 min-w-[100px] rounded-2xl border p-4 ${containerStyle}`}>
      <Text className={`text-xs ${titleStyle}`}>{title}</Text>
      <Text className={`text-2xl font-bold mt-1 ${valueStyle}`}>{value}</Text>
    </View>
  );
}
