import React from "react";
import { View, Text, Pressable } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useAdminData } from "@/src/features/workschedule/admin/model/AdminWorkscheduleContext";

export function AdminAttendanceQR() {
  const { qrBusy, generatedQr, qrRemaining, handleGenerateQr } = useAdminData();

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("vi-VN");
  };

  return (
    <View className="bg-white rounded-3xl p-5 border border-slate-200">
      <View className="flex-row items-center justify-between mb-4 gap-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-900">QR chấm công</Text>
          <Text className="text-slate-500 mt-1">
            Một mã dùng chung cho nhiều nhân viên trong 30 giây.
          </Text>
        </View>
        <Pressable
          onPress={handleGenerateQr}
          disabled={qrBusy}
          className={`rounded-2xl px-4 py-3 ${qrBusy ? "bg-red-200" : "bg-red-600"}`}
        >
          <Text className="text-white font-semibold">
            {qrBusy ? "Đang tạo..." : "Tạo QR"}
          </Text>
        </Pressable>
      </View>

      {generatedQr ? (
        <View className="rounded-3xl border border-red-100 bg-red-50 p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-red-900 font-semibold">Mã đang sử dụng</Text>
            <View
              className={`rounded-full px-3 py-1 ${qrRemaining > 0 ? "bg-red-600" : "bg-slate-400"}`}
            >
              <Text className="text-white text-xs font-semibold">
                {qrRemaining > 0 ? `${qrRemaining}s còn lại` : "Đã hết hạn"}
              </Text>
            </View>
          </View>
          <View className="bg-white rounded-2xl border border-red-100 p-6 items-center">
            <View className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 mb-4">
              <QRCode
                value={generatedQr.token}
                size={180}
                color="#0f172a"
                backgroundColor="white"
              />
            </View>
            <Text className="text-[11px] uppercase tracking-[2px] text-red-700 font-bold mb-1">
              Token chấm công
            </Text>
            <Text className="text-slate-900 font-bold text-lg mb-1">
              {generatedQr.token}
            </Text>
            <Text className="text-slate-500 text-sm">
              Hết hạn lúc: {formatDateTime(generatedQr.expires_at)}
            </Text>
            <Text className="mt-3 text-center text-xs leading-5 text-slate-500">
              Hãy tạo một mã mới cho đợt check-in và một mã khác cho đợt check-out. Trong thời gian hiệu lực, cùng một mã có thể được nhiều nhân viên quét.
            </Text>
          </View>
        </View>
      ) : (
        <View className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <Text className="text-slate-500">Chưa tạo token mới.</Text>
        </View>
      )}
    </View>
  );
}
