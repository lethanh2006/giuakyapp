import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import {
  scanAttendance,
} from "@/src/services/workschedule/workschedule.service";
import type { AttendanceScanResponse } from "@/src/services/workschedule/constant";
import { getApiErrorMessage } from "@/src/utils/apiHelper";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AttendanceScannerModalProps = {
  visible: boolean;
  onClose: () => void;
};

const scheduleTypeLabel = (scheduleType: string) => {
  if (scheduleType === "office") return "Lên văn phòng (Office)";
  if (scheduleType === "remote") return "Làm việc từ xa (Remote)";
  return scheduleType;
};

export function AttendanceScannerModal({
  visible,
  onClose,
}: AttendanceScannerModalProps) {
  const { getToken } = useAuthSession();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AttendanceScanResponse | null>(null);

  useEffect(() => {
    if (!visible) return;
    setScanned(false);
    setResult(null);
    if (!permission?.granted) void requestPermission();
  }, [permission?.granted, requestPermission, visible]);

  const scan = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Không tìm thấy phiên đăng nhập");
      const response = await scanAttendance(token, data);
      setResult(response.data);
    } catch (error: unknown) {
      setResult({
        success: false,
        message: getApiErrorMessage(
          error,
          "Không thể chấm công. Vui lòng thử lại.",
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    setScanned(false);
    setResult(null);
  };

  return (
    <Modal
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-slate-950">
        <View
          className="flex-row items-center justify-between border-b border-slate-900 px-4 pb-4"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Text className="text-lg font-extrabold tracking-wide text-white">
            QUÉT MÃ CHẤM CÔNG
          </Text>
          <Pressable
            onPress={onClose}
            className="h-8 w-8 items-center justify-center rounded-full bg-slate-800"
          >
            <Ionicons name="close" size={20} color="white" />
          </Pressable>
        </View>

        <View className="relative flex-1 items-center justify-center">
          {!permission?.granted ? (
            <View className="items-center justify-center p-6">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-red-950">
                <Ionicons name="camera-outline" size={32} color="#ef4444" />
              </View>
              <Text className="mb-2 text-center text-lg font-bold text-white">
                Yêu cầu quyền truy cập Camera
              </Text>
              <Text className="mb-6 max-w-xs text-center text-sm text-slate-400">
                Ứng dụng cần camera để quét mã QR chấm công.
              </Text>
              <Pressable
                onPress={requestPermission}
                className="rounded-xl bg-red-600 px-6 py-3"
              >
                <Text className="font-bold text-white">Cấp quyền camera</Text>
              </Pressable>
            </View>
          ) : (
            <View className="h-full w-full items-center justify-center">
              {!scanned && (
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
                  onBarcodeScanned={scan}
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                />
              )}

              {!scanned && (
                <View className="absolute items-center justify-center">
                  <View className="h-64 w-64 items-center justify-center rounded-3xl border-2 border-red-500">
                    <View className="h-60 w-60 rounded-2xl border border-dashed border-red-500/20" />
                  </View>
                  <Text className="mt-6 overflow-hidden rounded-full bg-slate-900/80 px-4 py-2 text-center text-xs font-medium text-white">
                    Di chuyển mã QR vào giữa khung hình để quét
                  </Text>
                </View>
              )}

              {loading && (
                <View className="absolute inset-0 items-center justify-center bg-slate-950/80">
                  <ActivityIndicator size="large" color="#ef4444" />
                  <Text className="mt-4 text-sm font-semibold text-white">
                    Đang xử lý thông tin chấm công...
                  </Text>
                </View>
              )}

              {result && (
                <View className="absolute w-full max-w-sm items-center rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
                  <Ionicons
                    name={result.success ? "checkmark-circle" : "alert-circle"}
                    size={56}
                    color={result.success ? "#10b981" : "#f43f5e"}
                  />
                  <Text className="mb-1 mt-3 text-center text-lg font-bold text-white">
                    {result.success
                      ? "Chấm Công Thành Công"
                      : "Chấm Công Thất Bại"}
                  </Text>
                  <Text className="mb-6 text-center text-sm text-slate-300">
                    {result.message}
                  </Text>

                  {result.success && result.data && (
                    <View className="mb-6 w-full rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <View className="mb-2 flex-row justify-between">
                        <Text className="text-xs text-slate-400">Loại lịch</Text>
                        <Text className="text-xs font-bold uppercase text-white">
                          {scheduleTypeLabel(result.data.schedule_type)}
                        </Text>
                      </View>
                      {result.data.check_in_at && (
                        <View className="mb-2 flex-row justify-between">
                          <Text className="text-xs text-slate-400">
                            Giờ Check-in
                          </Text>
                          <Text className="text-xs font-bold text-emerald-400">
                            {new Date(
                              result.data.check_in_at,
                            ).toLocaleTimeString("vi-VN")}
                          </Text>
                        </View>
                      )}
                      {result.data.check_out_at && (
                        <View className="flex-row justify-between">
                          <Text className="text-xs text-slate-400">
                            Giờ Check-out
                          </Text>
                          <Text className="text-xs font-bold text-blue-400">
                            {new Date(
                              result.data.check_out_at,
                            ).toLocaleTimeString("vi-VN")}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  <View className="w-full flex-row gap-3">
                    {!result.success && (
                      <Pressable
                        onPress={retry}
                        className="flex-1 items-center rounded-xl bg-slate-800 py-3.5"
                      >
                        <Text className="text-sm font-bold text-white">
                          Quét lại
                        </Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={onClose}
                      className={`flex-1 items-center rounded-xl py-3.5 ${
                        result.success ? "bg-emerald-600" : "bg-rose-600"
                      }`}
                    >
                      <Text className="text-sm font-bold text-white">Đóng</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
