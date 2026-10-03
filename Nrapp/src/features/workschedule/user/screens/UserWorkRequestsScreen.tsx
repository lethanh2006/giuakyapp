import { useWorkRequests } from "@/src/features/workschedule/shared/hooks/useWorkRequests";
import {
  WORK_REQUEST_CONFIG,
  WORK_REQUEST_TYPES,
} from "@/src/features/workschedule/shared/config/workRequestConfig";
import type {
  IWorkRequest,
  WorkRequestStatus,
} from "@/src/services/workschedule/constant";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import { ScreenHeader } from "@/src/shared/ui/ScreenHeader";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

const statusMeta: Record<
  WorkRequestStatus,
  { label: string; box: string; text: string }
> = {
  pending: { label: "Chờ duyệt", box: "bg-amber-50", text: "text-amber-700" },
  approved: { label: "Đã duyệt", box: "bg-emerald-50", text: "text-emerald-700" },
  rejected: { label: "Từ chối", box: "bg-rose-50", text: "text-rose-700" },
  cancelled: { label: "Đã hủy", box: "bg-slate-100", text: "text-slate-600" },
};

const periodLabel = { full_day: "Cả ngày", morning: "Buổi sáng", afternoon: "Buổi chiều" };

export default function UserWorkRequestsScreen() {
  const { getRequests, cancelRequest, loading } = useWorkRequests();
  const [activeTab, setActiveTab] = useState<"types" | "history">("types");
  const [statusFilter, setStatusFilter] = useState<WorkRequestStatus | "all">("all");
  const [requests, setRequests] = useState<IWorkRequest[]>([]);

  const loadData = useCallback(async () => {
    setRequests(await getRequests());
  }, [getRequests]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const filteredRequests = useMemo(
    () =>
      statusFilter === "all"
        ? requests
        : requests.filter(request => request.status === statusFilter),
    [requests, statusFilter],
  );

  const handleCancel = (request: IWorkRequest) => {
    Alert.alert("Hủy đơn?", "Đơn đang chờ duyệt sẽ được chuyển sang trạng thái đã hủy.", [
      { text: "Giữ lại", style: "cancel" },
      {
        text: "Hủy đơn",
        style: "destructive",
        onPress: async () => {
          if (await cancelRequest(request._id)) await loadData();
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        onBack={() => router.back()}
        subtitle="Tạo đơn và theo dõi lịch sử xử lý"
        title="Đơn từ"
      />

      <View className="flex-row border-b border-slate-200 bg-white px-4">
        {[
          ["types", "Danh sách đơn"],
          ["history", `Lịch sử gửi đơn (${requests.length})`],
        ].map(([value, label]) => (
          <Pressable
            className={`flex-1 items-center border-b-2 py-3 ${
              activeTab === value ? "border-blue-600" : "border-transparent"
            }`}
            key={value}
            onPress={() => setActiveTab(value as "types" | "history")}
          >
            <Text
              className={`text-xs font-black ${
                activeTab === value ? "text-blue-600" : "text-slate-500"
              }`}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {activeTab === "types" ? (
          <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            {WORK_REQUEST_TYPES.map((type, index) => {
              const config = WORK_REQUEST_CONFIG[type];
              return (
                <Pressable
                  className={`flex-row items-center p-4 active:bg-slate-50 ${
                    index < WORK_REQUEST_TYPES.length - 1 ? "border-b border-slate-100" : ""
                  }`}
                  key={type}
                  onPress={() =>
                    router.push({
                      pathname: "/(main)/user/utilities/requests/create",
                      params: { type },
                    } as never)
                  }
                >
                  <View className={`h-12 w-12 items-center justify-center rounded-2xl ${config.background}`}>
                    <Ionicons name={config.icon} size={23} color={config.color} />
                  </View>
                  <View className="ml-3 flex-1 pr-2">
                    <Text className="text-sm font-black text-slate-800">{config.title}</Text>
                    <Text className="mt-1 text-[11px] leading-4 text-slate-500">
                      {config.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                </Pressable>
              );
            })}
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {(["all", "pending", "approved", "rejected", "cancelled"] as const).map(status => (
                <Pressable
                  className={`mr-2 rounded-full border px-3 py-2 ${
                    statusFilter === status
                      ? "border-slate-900 bg-slate-900"
                      : "border-slate-200 bg-white"
                  }`}
                  key={status}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text
                    className={`text-[11px] font-black ${
                      statusFilter === status ? "text-white" : "text-slate-600"
                    }`}
                  >
                    {status === "all" ? "Tất cả" : statusMeta[status].label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {loading && requests.length === 0 ? (
              <View className="items-center py-16">
                <ActivityIndicator color="#2563eb" />
              </View>
            ) : filteredRequests.length === 0 ? (
              <View className="items-center rounded-3xl border border-dashed border-slate-200 bg-white p-8">
                <Ionicons name="file-tray-outline" size={28} color="#94a3b8" />
                <Text className="mt-3 text-sm font-black text-slate-700">Chưa có đơn phù hợp</Text>
                <Text className="mt-1 text-center text-xs text-slate-400">
                  Chọn “Danh sách đơn” để tạo yêu cầu mới.
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {filteredRequests.map(request => {
                  const config = WORK_REQUEST_CONFIG[request.type];
                  const status = statusMeta[request.status];
                  return (
                    <View className="rounded-3xl border border-slate-200 bg-white p-4" key={request._id}>
                      <View className="flex-row items-start">
                        <View className={`h-11 w-11 items-center justify-center rounded-2xl ${config.background}`}>
                          <Ionicons name={config.icon} size={21} color={config.color} />
                        </View>
                        <View className="ml-3 flex-1">
                          <View className="flex-row items-start justify-between">
                            <Text className="flex-1 pr-2 text-sm font-black text-slate-800">
                              {config.shortTitle}
                            </Text>
                            <View className={`rounded-full px-2.5 py-1 ${status.box}`}>
                              <Text className={`text-[10px] font-black ${status.text}`}>{status.label}</Text>
                            </View>
                          </View>
                          <Text className="mt-1 text-xs text-slate-500">
                            {new Date(request.start_at).toLocaleString("vi-VN")} · {periodLabel[request.period]}
                          </Text>
                          <Text className="mt-2 text-xs leading-5 text-slate-600" numberOfLines={3}>
                            {request.reason}
                          </Text>
                          {request.reject_reason ? (
                            <View className="mt-2 rounded-xl bg-rose-50 p-2.5">
                              <Text className="text-[11px] font-semibold leading-4 text-rose-700">
                                Lý do từ chối: {request.reject_reason}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      {request.status === "pending" ? (
                        <Pressable
                          className="mt-3 items-center rounded-xl border border-rose-100 py-2.5"
                          onPress={() => handleCancel(request)}
                        >
                          <Text className="text-xs font-black text-rose-600">Hủy đơn</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
