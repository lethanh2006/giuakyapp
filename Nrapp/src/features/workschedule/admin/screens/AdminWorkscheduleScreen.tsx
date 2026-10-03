import {
  canManageWorkSchedule,
  getRoleLabel,
} from "@/src/application/access/roles";
import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import {
  AdminProvider,
  useAdminData,
} from "@/src/features/workschedule/admin/model/AdminWorkscheduleContext";
import { AdminAttendanceQR } from "@/src/features/workschedule/admin/ui/AdminAttendanceQR";
import { AdminPolicySection } from "@/src/features/workschedule/admin/ui/AdminPolicySection";
import { AdminReportSummary } from "@/src/features/workschedule/admin/ui/AdminReportSummary";
import { AdminRequestManager } from "@/src/features/workschedule/admin/ui/AdminRequestManager";
import { AdminStatCard } from "@/src/features/workschedule/admin/ui/AdminStatCard";
import { AdminWorkRequestManager } from "@/src/features/workschedule/admin/ui/AdminWorkRequestManager";
import AdminPersonalWorkscheduleScreen from "@/src/features/workschedule/admin/screens/AdminPersonalWorkscheduleScreen";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

type TabType = "requests" | "forms" | "system" | "reports";
type IconName = React.ComponentProps<typeof Ionicons>["name"];

const TABS: { key: TabType; label: string; icon: IconName }[] = [
  { key: "requests", label: "Duyệt lịch", icon: "calendar-outline" },
  { key: "forms", label: "Đơn từ", icon: "document-text-outline" },
  { key: "system", label: "Vận hành", icon: "qr-code-outline" },
  { key: "reports", label: "Báo cáo", icon: "bar-chart-outline" },
];

function AdminDashboardContent() {
  const {
    appLoading,
    initialLoading,
    user,
    refreshing,
    loadAdminData,
    pendingSchedules,
    totalTodayCheckedIn,
    totalTodayMissing,
    reportRows,
  } = useAdminData();
  const [activeTab, setActiveTab] = useState<TabType>("requests");
  const normalizedRole = String(user?.role || "admin").toLowerCase();
  const canEditPolicy = normalizedRole === "admin";

  useFocusEffect(
    React.useCallback(() => {
      void loadAdminData();
    }, [loadAdminData]),
  );

  if (appLoading || initialLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#dc2626" />
        <Text className="mt-3 text-xs font-semibold text-slate-500">Đang tải dữ liệu quản lý...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadAdminData(true)}
            tintColor="#dc2626"
          />
        }
      >
        <View className="overflow-hidden bg-red-900 px-5 pb-7 pt-5">
          <View className="absolute -right-10 -top-14 h-40 w-40 rounded-full bg-red-500/20" />
          <View className="absolute -bottom-20 left-12 h-40 w-40 rounded-full bg-white/5" />
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-[11px] font-black uppercase tracking-[2px] text-red-100">
                Khu vực quản lý
              </Text>
              <Text className="mt-1 text-2xl font-black text-white">Lịch làm & chấm công</Text>
              <Text className="mt-1 text-xs leading-5 text-red-100">
                Theo dõi các yêu cầu cần xử lý trong ngày.
              </Text>
            </View>
            <View className="items-center rounded-2xl bg-white/15 px-3 py-2">
              <Ionicons name="person-circle-outline" size={22} color="#fff" />
              <Text className="mt-1 text-[10px] font-bold text-white">
                {getRoleLabel(normalizedRole)}
              </Text>
            </View>
          </View>
        </View>

        <View className="-mt-3 px-4">
          <View className="flex-row flex-wrap rounded-3xl border border-slate-100 bg-white p-3 shadow-sm shadow-slate-200" style={{ gap: 8 }}>
            <AdminStatCard
              containerStyle="bg-red-50 border-red-100"
              title="Lịch chờ duyệt"
              titleStyle="text-red-600"
              value={pendingSchedules.length}
              valueStyle="text-red-800"
            />
            <AdminStatCard
              containerStyle="bg-emerald-50 border-emerald-100"
              title="Đã check-in"
              titleStyle="text-emerald-600"
              value={totalTodayCheckedIn}
              valueStyle="text-emerald-800"
            />
            <AdminStatCard
              containerStyle="bg-amber-50 border-amber-100"
              title="Chưa check-in"
              titleStyle="text-amber-700"
              value={totalTodayMissing}
              valueStyle="text-amber-900"
            />
            <AdminStatCard title="Bản ghi báo cáo" value={reportRows.length} />
          </View>

          <View className="my-4 flex-row rounded-2xl border border-slate-200 bg-white p-1">
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  className={`flex-1 items-center rounded-xl py-2.5 ${active ? "bg-red-50" : "bg-white"}`}
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Ionicons name={tab.icon} size={18} color={active ? "#dc2626" : "#94a3b8"} />
                  <Text className={`mt-1 text-[10px] font-black ${active ? "text-red-700" : "text-slate-500"}`}>
                    {tab.label}
                  </Text>
                  {tab.key === "requests" && pendingSchedules.length > 0 ? (
                    <View className="absolute right-2 top-1 h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1">
                      <Text className="text-[9px] font-black text-white">{pendingSchedules.length}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {activeTab === "requests" ? <AdminRequestManager /> : null}
          {activeTab === "forms" ? <AdminWorkRequestManager /> : null}
          {activeTab === "system" ? (
            <View style={{ gap: 16 }}>
              {canEditPolicy ? <AdminPolicySection /> : null}
              <AdminAttendanceQR />
            </View>
          ) : null}
          {activeTab === "reports" ? <AdminReportSummary /> : null}
        </View>
      </ScrollView>
    </View>
  );
}

export default function AdminWorkscheduleScreen() {
  const { user } = useAuthSession();

  if (!canManageWorkSchedule(user?.role)) {
    return <AdminPersonalWorkscheduleScreen />;
  }

  return (
    <AdminProvider>
      <AdminDashboardContent />
    </AdminProvider>
  );
}
