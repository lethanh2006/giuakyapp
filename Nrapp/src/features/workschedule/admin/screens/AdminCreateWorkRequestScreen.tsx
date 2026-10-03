import { useWorkRequests } from "@/src/features/workschedule/shared/hooks/useWorkRequests";
import { WORK_REQUEST_CONFIG } from "@/src/features/workschedule/shared/config/workRequestConfig";
import type {
  CreateWorkRequestPayload,
  WorkPeriod,
  WorkRequestType,
} from "@/src/services/workschedule/constant";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import { ScreenHeader } from "@/src/shared/ui/ScreenHeader";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

const periodOptions: { value: WorkPeriod; label: string }[] = [
  { value: "full_day", label: "Cả ngày" },
  { value: "morning", label: "Buổi sáng" },
  { value: "afternoon", label: "Buổi chiều" },
];

const toDateInput = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
const toTimeInput = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

type DateTimeFieldProps = {
  label: string;
  value: Date;
  includeTime?: boolean;
  onChange: (value: Date) => void;
};

function DateTimeField({ label, value, includeTime, onChange }: DateTimeFieldProps) {
  const [picker, setPicker] = useState<"date" | "time" | null>(null);

  if (Platform.OS === "web") {
    return (
      <View className="mb-4">
        <Text className="mb-2 text-xs font-black text-slate-700">{label} *</Text>
        <View className="flex-row gap-2">
          <TextInput
            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
            onChangeText={text => {
              const next = new Date(`${text}T${toTimeInput(value)}:00`);
              if (!Number.isNaN(next.getTime())) onChange(next);
            }}
            value={toDateInput(value)}
          />
          {includeTime ? (
            <TextInput
              className="w-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              onChangeText={text => {
                const next = new Date(`${toDateInput(value)}T${text}:00`);
                if (!Number.isNaN(next.getTime())) onChange(next);
              }}
              value={toTimeInput(value)}
            />
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-black text-slate-700">{label} *</Text>
      <View className="flex-row gap-2">
        <Pressable
          className="flex-1 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5"
          onPress={() => setPicker("date")}
        >
          <Text className="text-sm font-semibold text-slate-800">{value.toLocaleDateString("vi-VN")}</Text>
          <Ionicons name="calendar-outline" size={18} color="#94a3b8" />
        </Pressable>
        {includeTime ? (
          <Pressable
            className="w-28 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3.5"
            onPress={() => setPicker("time")}
          >
            <Text className="text-sm font-semibold text-slate-800">{toTimeInput(value)}</Text>
            <Ionicons name="time-outline" size={18} color="#94a3b8" />
          </Pressable>
        ) : null}
      </View>
      {picker ? (
        <DateTimePicker
          mode={picker}
          onChange={(_, date) => {
            setPicker(null);
            if (date) onChange(date);
          }}
          value={value}
        />
      ) : null}
    </View>
  );
}

export default function AdminCreateWorkRequestScreen() {
  const params = useLocalSearchParams<{ type?: WorkRequestType }>();
  const type: WorkRequestType = params.type && WORK_REQUEST_CONFIG[params.type] ? params.type : "leave";
  const config = WORK_REQUEST_CONFIG[type];
  const { submitRequest, loading } = useWorkRequests();
  const initialStart = useMemo(() => {
    const date = new Date();
    date.setSeconds(0, 0);
    return date;
  }, []);
  const [startAt, setStartAt] = useState(initialStart);
  const [endAt, setEndAt] = useState(() => new Date(initialStart.getTime() + 60 * 60 * 1000));
  const [period, setPeriod] = useState<WorkPeriod>("full_day");
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");
  const [project, setProject] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [isSchoolLeave, setIsSchoolLeave] = useState(false);

  const needsRange = type === "overtime" || type === "business_trip";
  const needsTime = type === "late" || type === "early" || needsRange;
  const showPeriod = type === "leave" || type === "late" || type === "early" || type === "remote";

  const submit = async () => {
    if (!reason.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập lý do.");
      return;
    }
    if (type === "business_trip" && !location.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập nơi đi công tác.");
      return;
    }
    if (type === "overtime" && !project.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập dự án làm ngoài giờ.");
      return;
    }
    if (needsRange && endAt <= startAt) {
      Alert.alert("Thời gian chưa đúng", "Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }

    const payload: CreateWorkRequestPayload = {
      type,
      start_at: startAt.toISOString(),
      ...(needsRange ? { end_at: endAt.toISOString() } : {}),
      period: showPeriod ? period : "full_day",
      reason: reason.trim(),
      ...(location.trim() ? { location: location.trim() } : {}),
      ...(project.trim() ? { project: project.trim() } : {}),
      ...(estimatedCost ? { estimated_cost: Number(estimatedCost) } : {}),
      ...(attachmentUrl.trim() ? { attachment_urls: [attachmentUrl.trim()] } : {}),
      ...(type === "leave" ? { is_school_leave: isSchoolLeave } : {}),
    };
    if (await submitRequest(payload)) router.back();
  };

  const reasonLabel =
    type === "overtime"
      ? "Công việc làm thêm"
      : type === "business_trip"
        ? "Lý do đi công tác"
        : `Lý do ${config.shortTitle.toLowerCase()}`;

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        onBack={() => router.back()}
        subtitle="Khu quản trị · Điền đầy đủ các trường có dấu *"
        tone="admin"
        title={config.title}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <View className="mb-4 overflow-hidden rounded-3xl bg-red-900 p-5">
          <View className="absolute -right-6 -top-10 h-28 w-28 rounded-full bg-white/10" />
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <Ionicons name={config.icon} size={23} color="#ffffff" />
          </View>
          <Text className="mt-4 text-[10px] font-black uppercase tracking-[2px] text-red-100">
            Yêu cầu cá nhân · Quản trị
          </Text>
          <Text className="mt-2 text-xs leading-5 text-red-100">{config.description}</Text>
        </View>

        <View className="rounded-3xl border border-slate-200 bg-white p-4">
          <DateTimeField
            includeTime={needsTime}
            label={needsRange ? "Từ" : type === "late" ? "Thời gian đến muộn" : type === "early" ? "Thời gian về sớm" : "Ngày"}
            onChange={setStartAt}
            value={startAt}
          />
          {needsRange ? (
            <DateTimeField includeTime label="Đến" onChange={setEndAt} value={endAt} />
          ) : null}

          {showPeriod ? (
            <View className="mb-4">
              <Text className="mb-2 text-xs font-black text-slate-700">Buổi đăng ký *</Text>
              <View className="flex-row rounded-2xl bg-slate-100 p-1">
                {periodOptions.map(option => (
                  <Pressable
                    className={`flex-1 items-center rounded-xl py-3 ${
                      period === option.value ? "bg-white" : "bg-transparent"
                    }`}
                    key={option.value}
                    onPress={() => setPeriod(option.value)}
                  >
                    <Text className={`text-[11px] font-black ${period === option.value ? "text-red-700" : "text-slate-500"}`}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {type === "leave" ? (
            <Pressable className="mb-4 flex-row items-center" onPress={() => setIsSchoolLeave(value => !value)}>
              <View className={`h-6 w-6 items-center justify-center rounded-md border ${isSchoolLeave ? "border-red-600 bg-red-600" : "border-slate-300 bg-white"}`}>
                {isSchoolLeave ? <Ionicons name="checkmark" size={16} color="white" /> : null}
              </View>
              <Text className="ml-2 text-xs font-semibold text-slate-700">Nghỉ để đi học</Text>
            </Pressable>
          ) : null}

          {type === "business_trip" ? (
            <View className="mb-4">
              <Text className="mb-2 text-xs font-black text-slate-700">Nơi đi công tác *</Text>
              <TextInput
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                onChangeText={setLocation}
                placeholder="Ví dụ: Hà Nội"
                placeholderTextColor="#94a3b8"
                value={location}
              />
            </View>
          ) : null}

          {type === "overtime" ? (
            <View className="mb-4">
              <Text className="mb-2 text-xs font-black text-slate-700">Dự án *</Text>
              <TextInput
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                onChangeText={setProject}
                placeholder="Tên dự án hoặc mã công việc"
                placeholderTextColor="#94a3b8"
                value={project}
              />
            </View>
          ) : null}

          <View className="mb-4">
            <Text className="mb-2 text-xs font-black text-slate-700">{reasonLabel} *</Text>
            <TextInput
              className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              maxLength={1000}
              multiline
              onChangeText={setReason}
              placeholder="Nhập nội dung cụ thể để quản lý dễ phê duyệt"
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
              value={reason}
            />
            <Text className="mt-1 text-right text-[10px] text-slate-400">{reason.length}/1000</Text>
          </View>

          {type === "business_trip" ? (
            <View className="mb-4">
              <Text className="mb-2 text-xs font-black text-slate-700">Chi phí dự kiến</Text>
              <TextInput
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                keyboardType="numeric"
                onChangeText={text => setEstimatedCost(text.replace(/[^0-9]/g, ""))}
                placeholder="0 VNĐ"
                placeholderTextColor="#94a3b8"
                value={estimatedCost}
              />
            </View>
          ) : null}

          <View>
            <Text className="mb-2 text-xs font-black text-slate-700">Ảnh/tài liệu đính kèm</Text>
            <View className="flex-row items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
              <Ionicons name="link-outline" size={19} color="#94a3b8" />
              <TextInput
                autoCapitalize="none"
                className="ml-2 flex-1 text-sm text-slate-900"
                onChangeText={setAttachmentUrl}
                placeholder="Dán đường dẫn tài liệu (không bắt buộc)"
                placeholderTextColor="#94a3b8"
                value={attachmentUrl}
              />
            </View>
          </View>
        </View>

        <Pressable
          className={`mt-5 flex-row items-center justify-center rounded-2xl py-4 ${loading ? "bg-red-300" : "bg-red-600"}`}
          disabled={loading}
          onPress={submit}
        >
          <Text className="mr-2 text-sm font-black text-white">{loading ? "Đang nộp..." : "Nộp đơn"}</Text>
          <Ionicons name="paper-plane" size={17} color="white" />
        </Pressable>
      </ScrollView>
    </View>
  );
}
