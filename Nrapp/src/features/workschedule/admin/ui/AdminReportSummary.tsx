import React from "react";
import { View, Text, Pressable } from "react-native";
import { useAdminData } from "@/src/features/workschedule/admin/model/AdminWorkscheduleContext";
import { AdminStatCard } from "./AdminStatCard";

const entryLabels: Record<string, string> = {
  office: "Lên công ty",
  remote: "Từ xa",
  day_off: "Nghỉ",
  leave: "Phép",
};

const formatEmployee = (employee?: any, fallback = "Không rõ") => {
  if (!employee) return fallback;
  return employee.name || employee.username || employee.email || fallback;
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN");
};

type ReportRange = "7d" | "30d";

export function AdminReportSummary() {
  const {
    todayAttendance,
    missingToday,
    totalTodayExpected,
    totalTodayCheckedIn,
    totalTodayMissing,
    reportRows,
    reportRange,
    setReportRange,
    totalReportEmployees,
    totalReportCompleted,
  } = useAdminData();

  return (
    <View style={{ gap: 16 }}>
      {/* Chấm công hôm nay */}
      <View className="bg-white rounded-3xl p-5 border border-slate-200">
        <View className="flex-row items-center justify-between mb-4 gap-3">
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-900">
              Chấm công hôm nay
            </Text>
            <Text className="text-slate-500 mt-1">
              Đối chiếu người đã check-in với lịch office.
            </Text>
          </View>
          <View className="bg-slate-100 rounded-full px-3 py-1">
            <Text className="text-slate-700 text-xs font-semibold">
              {formatDate(new Date().toISOString())}
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap mb-4" style={{ gap: 10 }}>
          <AdminStatCard
            title="Lịch office"
            value={totalTodayExpected}
            containerStyle="bg-slate-50 border-slate-200"
            titleStyle="text-slate-500"
            valueStyle="text-slate-900"
          />
          <AdminStatCard
            title="Đã check-in"
            value={totalTodayCheckedIn}
            containerStyle="bg-emerald-50 border-emerald-100"
            titleStyle="text-emerald-700"
            valueStyle="text-emerald-900"
          />
          <AdminStatCard
            title="Chưa check-in"
            value={totalTodayMissing}
            containerStyle="bg-rose-50 border-rose-100"
            titleStyle="text-rose-700"
            valueStyle="text-rose-900"
          />
        </View>

        <Text className="text-slate-700 font-semibold mb-3">Đã check-in</Text>
        {todayAttendance.length === 0 ? (
          <Text className="text-slate-500">
            Chưa có bản ghi chấm công hôm nay.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {todayAttendance.map((record) => (
              <View
                key={record._id}
                className="rounded-2xl border border-slate-200 p-4 bg-slate-50 flex-row items-center justify-between gap-3"
              >
                <View className="flex-1">
                  <Text className="text-slate-900 font-semibold">
                    {formatEmployee(record.employee, "Nhân viên")}
                  </Text>
                  <Text className="text-slate-600 mt-1">
                    Check-in: {formatDateTime(record.check_in_at)}
                  </Text>
                  <Text className="text-slate-600">
                    Loại lịch:{" "}
                    {entryLabels[record.schedule_type] || record.schedule_type}
                  </Text>
                </View>
                <View className="bg-emerald-100 rounded-full px-3 py-1">
                  <Text className="text-emerald-800 text-xs font-semibold">
                    Đã vào
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text className="text-slate-700 font-semibold mt-5 mb-3">
          Chưa check-in
        </Text>
        {missingToday.length === 0 ? (
          <Text className="text-slate-500">
            Không còn người nào chờ check-in trong ngày.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {missingToday.map((item) => (
              <View
                key={`${item.requestId}_${item.employeeId}`}
                className="rounded-2xl border border-rose-100 p-4 bg-rose-50 flex-row items-center justify-between gap-3"
              >
                <View className="flex-1">
                  <Text className="text-rose-950 font-semibold">
                    {formatEmployee(item.employee, "Nhân viên")}
                  </Text>
                  <Text className="text-rose-800 mt-1">
                    Ca: {entryLabels[item.entryType] || item.entryType}
                  </Text>
                </View>
                <View className="bg-rose-100 rounded-full px-3 py-1">
                  <Text className="text-rose-800 text-xs font-semibold">
                    Chưa vào
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Báo cáo tổng hợp */}
      <View className="bg-white rounded-3xl p-5 border border-slate-200">
        <View className="flex-row items-center justify-between mb-4 gap-3">
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-900">
              Báo cáo tổng hợp
            </Text>
            <Text className="text-slate-500 mt-1">
              Chỉ tính lượt quét QR tại văn phòng trong {reportRange === "7d" ? "7 ngày" : "30 ngày"} gần nhất.
            </Text>
          </View>
          <View className="flex-row rounded-full bg-slate-100 p-1">
            {(["7d", "30d"] as ReportRange[]).map((range) => (
              <Pressable
                key={range}
                onPress={() => setReportRange(range)}
                className={`px-3 py-2 rounded-full ${reportRange === range ? "bg-red-600" : "bg-transparent"}`}
              >
                <Text
                  className={
                    reportRange === range
                      ? "text-white font-semibold"
                      : "text-slate-700 font-semibold"
                  }
                >
                  {range === "7d" ? "7 ngày" : "30 ngày"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="flex-row flex-wrap mb-4" style={{ gap: 10 }}>
          <AdminStatCard
            title="Tổng bản ghi"
            value={reportRows.length}
            containerStyle="bg-slate-50 border-slate-200"
            titleStyle="text-slate-500"
            valueStyle="text-slate-900"
          />
          <AdminStatCard
            title="Nhân sự"
            value={totalReportEmployees}
            containerStyle="bg-red-50 border-red-100"
            titleStyle="text-red-700"
            valueStyle="text-red-950"
          />
          <AdminStatCard
            title="Đủ check-out"
            value={totalReportCompleted}
            containerStyle="bg-emerald-50 border-emerald-100"
            titleStyle="text-emerald-700"
            valueStyle="text-emerald-950"
          />
        </View>

        {reportRows.length === 0 ? (
          <Text className="text-slate-500">
            Không có dữ liệu trong khoảng thời gian đã chọn.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {reportRows.map((record) => (
              <View
                key={record._id}
                className="rounded-2xl border border-slate-200 p-4 bg-slate-50"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-slate-900 font-semibold">
                      {formatEmployee(record.employee, "Nhân viên")}
                    </Text>
                    <Text className="text-slate-600 mt-1">
                      Ngày: {formatDate(record.date)}
                    </Text>
                    <Text className="text-slate-600">
                      Check-in: {formatDateTime(record.check_in_at)}
                    </Text>
                    {record.check_out_at && (
                      <Text className="text-slate-600">
                        Check-out: {formatDateTime(record.check_out_at)}
                      </Text>
                    )}
                    <Text className="mt-1 text-[11px] font-bold text-emerald-700">
                      Nguồn: Quét QR tại văn phòng
                    </Text>
                  </View>
                  <View
                    className={`rounded-full px-3 py-1 ${record.schedule_type === "remote" ? "bg-violet-100" : "bg-slate-200"}`}
                  >
                    <Text
                      className={`text-xs font-semibold ${record.schedule_type === "remote" ? "text-violet-800" : "text-slate-700"}`}
                    >
                      {entryLabels[record.schedule_type] ||
                        record.schedule_type}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
