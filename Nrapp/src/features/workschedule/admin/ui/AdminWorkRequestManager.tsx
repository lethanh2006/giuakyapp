import { useWorkscheduleAdmin } from "@/src/features/workschedule/admin/hooks/useWorkscheduleAdmin";
import {
  WORK_REQUEST_CONFIG,
  WORK_REQUEST_TYPES,
} from "@/src/features/workschedule/shared/config/workRequestConfig";
import type {
  IWorkRequest,
  WorkRequestStatus,
  WorkRequestType,
} from "@/src/services/workschedule/constant";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

const statusMeta: Record<WorkRequestStatus, { label: string; box: string; text: string }> = {
  pending: { label: "Chờ duyệt", box: "bg-amber-50", text: "text-amber-700" },
  approved: { label: "Đã duyệt", box: "bg-emerald-50", text: "text-emerald-700" },
  rejected: { label: "Từ chối", box: "bg-red-50", text: "text-red-700" },
  cancelled: { label: "Đã hủy", box: "bg-slate-100", text: "text-slate-600" },
};

const fallbackStatus = { label: "Không xác định", box: "bg-slate-100", text: "text-slate-600" };
const fallbackConfig = {
  shortTitle: "Đơn nhân sự",
  icon: "document-text-outline" as const,
  color: "#64748b",
  background: "bg-slate-100",
};
const periodLabel: Record<string, string> = {
  full_day: "Cả ngày",
  morning: "Buổi sáng",
  afternoon: "Buổi chiều",
};

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("vi-VN");
};

export function AdminWorkRequestManager() {
  const { getEmployeeRequests, approveEmployeeRequest, rejectEmployeeRequest } = useWorkscheduleAdmin();
  const [requests, setRequests] = useState<IWorkRequest[]>([]);
  const [status, setStatus] = useState<WorkRequestStatus | "all">("pending");
  const [type, setType] = useState<WorkRequestType | "all">("all");
  const [month, setMonth] = useState(() => {
    const current = new Date();
    return new Date(current.getFullYear(), current.getMonth(), 1);
  });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const selectedMonth = useMemo(() => monthKey(month), [month]);
  const selectedMonthLabel = useMemo(
    () => `Tháng ${month.getMonth() + 1}/${month.getFullYear()}`,
    [month],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await getEmployeeRequests({ status, type, month: selectedMonth });
    setRequests(result);
    setLoading(false);
  }, [getEmployeeRequests, selectedMonth, status, type]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const changeMonth = (offset: number) => {
    setExpandedId(null);
    setRejectingId(null);
    setMonth((previous) => new Date(previous.getFullYear(), previous.getMonth() + offset, 1));
  };

  const approve = (request: IWorkRequest) => {
    const config = WORK_REQUEST_CONFIG[request.type] || fallbackConfig;
    Alert.alert("Duyệt đơn?", `Xác nhận duyệt ${config.shortTitle.toLowerCase()}.`, [
      { text: "Để sau", style: "cancel" },
      {
        text: "Duyệt đơn",
        onPress: async () => {
          setBusyId(request._id);
          if (await approveEmployeeRequest(request._id)) {
            setExpandedId(null);
            await loadData();
          }
          setBusyId(null);
        },
      },
    ]);
  };

  const reject = async (request: IWorkRequest) => {
    if (!reason.trim()) {
      Alert.alert("Thiếu lý do", "Vui lòng nhập lý do từ chối để nhân viên có thể xem lại.");
      return;
    }
    setBusyId(request._id);
    if (await rejectEmployeeRequest(request._id, reason.trim())) {
      setRejectingId(null);
      setExpandedId(null);
      setReason("");
      await loadData();
    }
    setBusyId(null);
  };

  return (
    <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <View className="border-b border-slate-100 p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-lg font-black text-slate-900">Đơn từ nhân sự</Text>
            <Text className="mt-1 text-xs leading-5 text-slate-500">
              Chạm vào từng đơn để xem đủ thông tin và xử lý.
            </Text>
          </View>
          <View className="rounded-full bg-red-50 px-3 py-1.5">
            <Text className="text-xs font-black text-red-700">{requests.length} đơn</Text>
          </View>
        </View>

        <View className="mt-4 flex-row items-center rounded-2xl bg-slate-50 p-1">
          <Pressable
            accessibilityLabel="Xem tháng trước"
            className="h-10 w-10 items-center justify-center rounded-xl bg-white"
            onPress={() => changeMonth(-1)}
          >
            <Ionicons name="chevron-back" size={18} color="#475569" />
          </Pressable>
          <Text className="flex-1 text-center text-sm font-black text-slate-900">{selectedMonthLabel}</Text>
          <Pressable
            accessibilityLabel="Xem tháng sau"
            className="h-10 w-10 items-center justify-center rounded-xl bg-white"
            onPress={() => changeMonth(1)}
          >
            <Ionicons name="chevron-forward" size={18} color="#475569" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          {(["pending", "all", "approved", "rejected", "cancelled"] as const).map((item) => {
            const active = status === item;
            return (
              <Pressable
                className={`mr-2 rounded-full border px-3 py-2 ${
                  active ? "border-red-600 bg-red-600" : "border-slate-200 bg-white"
                }`}
                key={item}
                onPress={() => setStatus(item)}
              >
                <Text className={`text-[11px] font-black ${active ? "text-white" : "text-slate-600"}`}>
                  {item === "all" ? "Tất cả" : statusMeta[item].label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          <Pressable
            className={`mr-2 rounded-xl px-3 py-2 ${type === "all" ? "bg-red-50" : "bg-slate-100"}`}
            onPress={() => setType("all")}
          >
            <Text className={`text-[11px] font-bold ${type === "all" ? "text-red-700" : "text-slate-500"}`}>
              Mọi loại
            </Text>
          </Pressable>
          {WORK_REQUEST_TYPES.map((item) => (
            <Pressable
              className={`mr-2 rounded-xl px-3 py-2 ${type === item ? "bg-red-50" : "bg-slate-100"}`}
              key={item}
              onPress={() => setType(item)}
            >
              <Text className={`text-[11px] font-bold ${type === item ? "text-red-700" : "text-slate-500"}`}>
                {WORK_REQUEST_CONFIG[item].shortTitle}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View className="p-4">
        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#dc2626" />
            <Text className="mt-2 text-xs text-slate-500">Đang tải đơn từ...</Text>
          </View>
        ) : requests.length === 0 ? (
          <View className="items-center rounded-2xl bg-slate-50 p-8">
            <Ionicons name="file-tray-outline" size={28} color="#94a3b8" />
            <Text className="mt-3 text-sm font-black text-slate-700">Không có đơn phù hợp</Text>
            <Text className="mt-1 text-center text-xs leading-5 text-slate-500">
              Hãy thử đổi tháng, trạng thái hoặc loại đơn.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {requests.map((request) => {
              const config = WORK_REQUEST_CONFIG[request.type] || fallbackConfig;
              const requestStatus = statusMeta[request.status] || fallbackStatus;
              const employeeName =
                request.employee?.name || request.employee?.username || request.employee?.email || "Nhân viên";
              const expanded = expandedId === request._id;
              const rejecting = rejectingId === request._id;
              return (
                <View
                  className={`overflow-hidden rounded-2xl border ${
                    expanded ? "border-red-200 bg-white" : "border-slate-200 bg-slate-50/70"
                  }`}
                  key={request._id}
                >
                  <Pressable
                    className="flex-row items-start p-4"
                    onPress={() => {
                      setExpandedId(expanded ? null : request._id);
                      setRejectingId(null);
                      setReason("");
                    }}
                  >
                    <View className={`h-10 w-10 items-center justify-center rounded-xl ${config.background}`}>
                      <Ionicons name={config.icon} size={19} color={config.color} />
                    </View>
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-start">
                        <View className="flex-1 pr-2">
                          <Text className="text-sm font-black text-slate-800">{config.shortTitle}</Text>
                          <Text className="mt-0.5 text-[11px] font-bold text-red-600">{employeeName}</Text>
                        </View>
                        <View className={`rounded-full px-2.5 py-1 ${requestStatus.box}`}>
                          <Text className={`text-[10px] font-black ${requestStatus.text}`}>
                            {requestStatus.label}
                          </Text>
                        </View>
                        <Ionicons
                          name={expanded ? "chevron-up" : "chevron-down"}
                          size={17}
                          color="#94a3b8"
                          style={{ marginLeft: 8, marginTop: 2 }}
                        />
                      </View>
                      <Text className="mt-2 text-xs text-slate-500">
                        {formatDateTime(request.start_at)} · {periodLabel[request.period] || "Theo thời gian"}
                      </Text>
                    </View>
                  </Pressable>

                  {expanded ? (
                    <View className="border-t border-slate-100 px-4 pb-4 pt-3">
                      <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400">Lý do</Text>
                      <Text className="mt-1 text-xs leading-5 text-slate-700">{request.reason || "Không có nội dung"}</Text>
                      {request.end_at ? (
                        <Text className="mt-2 text-xs text-slate-500">Đến: {formatDateTime(request.end_at)}</Text>
                      ) : null}
                      {request.location ? (
                        <Text className="mt-1 text-xs text-slate-500">Địa điểm: {request.location}</Text>
                      ) : null}
                      {request.project ? (
                        <Text className="mt-1 text-xs text-slate-500">Dự án: {request.project}</Text>
                      ) : null}
                      {typeof request.estimated_cost === "number" ? (
                        <Text className="mt-1 text-xs text-slate-500">
                          Chi phí: {request.estimated_cost.toLocaleString("vi-VN")} VNĐ
                        </Text>
                      ) : null}
                      {request.reject_reason ? (
                        <View className="mt-3 rounded-xl bg-red-50 p-3">
                          <Text className="text-xs font-bold text-red-700">
                            Lý do từ chối: {request.reject_reason}
                          </Text>
                        </View>
                      ) : null}

                      {request.status === "pending" ? (
                        rejecting ? (
                          <View className="mt-3 rounded-2xl bg-red-50 p-3">
                            <TextInput
                              className="min-h-20 rounded-xl border border-red-100 bg-white p-3 text-xs text-slate-700"
                              multiline
                              onChangeText={setReason}
                              placeholder="Lý do từ chối..."
                              placeholderTextColor="#94a3b8"
                              textAlignVertical="top"
                              value={reason}
                            />
                            <View className="mt-2 flex-row gap-2">
                              <Pressable
                                className="flex-1 items-center rounded-xl bg-white py-2.5"
                                onPress={() => {
                                  setRejectingId(null);
                                  setReason("");
                                }}
                              >
                                <Text className="text-xs font-black text-slate-600">Hủy</Text>
                              </Pressable>
                              <Pressable
                                className="flex-1 items-center rounded-xl bg-red-600 py-2.5"
                                disabled={busyId === request._id}
                                onPress={() => void reject(request)}
                              >
                                <Text className="text-xs font-black text-white">Xác nhận từ chối</Text>
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          <View className="mt-3 flex-row gap-2">
                            <Pressable
                              className="flex-1 items-center rounded-xl border border-red-200 py-2.5"
                              onPress={() => setRejectingId(request._id)}
                            >
                              <Text className="text-xs font-black text-red-600">Từ chối</Text>
                            </Pressable>
                            <Pressable
                              className="flex-1 items-center rounded-xl bg-emerald-600 py-2.5"
                              disabled={busyId === request._id}
                              onPress={() => approve(request)}
                            >
                              <Text className="text-xs font-black text-white">
                                {busyId === request._id ? "Đang xử lý..." : "Duyệt đơn"}
                              </Text>
                            </Pressable>
                          </View>
                        )
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}
