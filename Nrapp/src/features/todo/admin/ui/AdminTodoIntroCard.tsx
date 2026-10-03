import type { AppArea } from "@/src/application/access/roles";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

type Props = {
  area: AppArea;
};

export default function AdminTodoIntroCard({ area }: Props) {
  if (area === "admin") {
    return (
      <View className="overflow-hidden rounded-3xl bg-red-950 p-5" style={{ elevation: 2 }}>
        <View
          className="absolute -right-8 -top-10 h-32 w-32 rounded-full"
          style={{ backgroundColor: "rgba(185, 28, 28, 0.4)" }}
        />
        <View
          className="absolute -bottom-12 right-12 h-28 w-28 rounded-full"
          style={{ backgroundColor: "rgba(127, 29, 29, 0.6)" }}
        />
        <View className="flex-row items-center">
          <View
            className="mr-3 h-12 w-12 items-center justify-center rounded-2xl border"
            style={{ borderColor: "rgba(255, 255, 255, 0.15)", backgroundColor: "rgba(255, 255, 255, 0.1)" }}
          >
            <Ionicons name="clipboard-outline" size={24} color="#fecaca" />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-black uppercase tracking-[2px] text-red-200">
              Điều phối công việc
            </Text>
            <Text className="mt-1 text-lg font-black text-white">
              Không gian quản trị
            </Text>
            <Text
              className="mt-1 text-xs leading-relaxed text-white"
              style={{ color: "rgba(255, 255, 255, 0.65)" }}
            >
              Tạo mới, bàn giao và giám sát tiến độ công việc toàn hệ thống.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      className="flex-row items-center rounded-2xl border p-4"
      style={{ backgroundColor: "rgba(239, 246, 255, 0.5)", borderColor: "rgba(219, 234, 254, 0.6)" }}
    >
      <View className="mr-3 rounded-xl p-2.5" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}>
        <Ionicons name="clipboard-outline" size={24} color="#3b82f6" />
      </View>
      <View className="flex-1">
        <Text className="text-lg font-bold text-slate-800">Không gian công việc</Text>
        <Text className="text-xs text-slate-500 mt-0.5 leading-relaxed">
          Chế độ nhân viên: Theo dõi, thực hiện và cập nhật trạng thái công việc
          được giao.
        </Text>
      </View>
    </View>
  );
}
