import { usePersonalWorkschedule } from "@/src/features/workschedule/shared/hooks/usePersonalWorkschedule";
import { WorkDayScheduleEditor } from "@/src/features/workschedule/shared/ui/WorkDayScheduleEditor";
import { WorkMonthCalendar } from "@/src/features/workschedule/shared/ui/WorkMonthCalendar";
import {
  formatDateTimeVi,
  getRegistrationMonth,
  getScheduleDateKey,
  getScheduleToday,
  isRegistrationClosed,
  monthDate,
  toLocalDateKey,
  toMonthKey,
} from "@/src/features/workschedule/shared/utils/date";
import type {
  IScheduleEntry,
  IScheduleRequest,
  IWorkPolicy,
} from "@/src/services/workschedule/constant";
import { AppAlert } from "@/src/shared/ui/AppAlert";
import { ScreenHeader } from "@/src/shared/ui/ScreenHeader";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

type Draft = Partial<IScheduleEntry>;
const STATUS = {
  none: { label: "Chưa đăng ký", box: "bg-slate-100", text: "text-slate-600" },
  pending: { label: "Chờ duyệt", box: "bg-amber-50", text: "text-amber-700" },
  approved: {
    label: "Đã duyệt",
    box: "bg-emerald-50",
    text: "text-emerald-700",
  },
  rejected: {
    label: "Cần chỉnh sửa",
    box: "bg-rose-50",
    text: "text-rose-700",
  },
};

export function MonthlyRegistrationScreen({
  tone = "default",
  onBack,
}: {
  tone?: "default" | "admin";
  onBack: () => void;
}) {
  const { getRegistrationData, sendScheduleRequest, resubmitRejectedSchedule } =
    usePersonalWorkschedule();
  const [schedules, setSchedules] = useState<IScheduleRequest[]>([]);
  const [policy, setPolicy] = useState<IWorkPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => getScheduleToday());
  const [draft, setDraft] = useState<{
    month: string;
    entries: Record<string, Draft>;
  }>({ month: "", entries: {} });
  const [submitting, setSubmitting] = useState(false);
  const requestRef = useRef(0);
  const savingRef = useRef(false);
  const navigation = useNavigation();
  const accent = tone === "admin" ? "#dc2626" : "#2563eb";
  const buttonClass = tone === "admin" ? "bg-red-600" : "bg-blue-600";
  const month = getRegistrationMonth(policy);
  const today = getScheduleToday(now);
  const todayKey = toLocalDateKey(today);
  const visibleMonth = useMemo(
    () => monthDate(month || todayKey.slice(0, 7)),
    [month, todayKey],
  );

  const loadData = useCallback(async () => {
    const requestId = ++requestRef.current;
    const data = await getRegistrationData();
    if (requestId !== requestRef.current) return;
    setLoadError(!data);
    if (data) {
      setSchedules(data.schedules);
      setPolicy(data.policy);
      const nextMonth = getRegistrationMonth(data.policy);
      if (nextMonth) {
        setSelectedDate((previous) =>
          toMonthKey(previous) === nextMonth
            ? previous
            : nextMonth === toMonthKey(getScheduleToday())
              ? getScheduleToday()
              : monthDate(nextMonth),
        );
        setDraft((previous) =>
          previous.month === nextMonth
            ? previous
            : { month: nextMonth, entries: {} },
        );
      }
    }
    setLoading(false);
  }, [getRegistrationData]);

  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
      void loadData();
      return () => {
        requestRef.current += 1;
      };
    }, [loadData]),
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const request = schedules.find((item) => item.month === month) || null;
  const statusKey = request?.status || "none";
  const status = STATUS[statusKey];
  const closed = isRegistrationClosed(policy, now);
  const lockedReason = loadError
    ? "Không tải được dữ liệu. Hãy thử lại trước khi đăng ký."
    : !month
      ? "Chưa có đợt đăng ký theo tháng. Quản lý cần mở một đợt đăng ký."
      : policy?.locked
        ? "Đợt đăng ký đang tạm khóa."
        : closed
          ? policy && now < new Date(policy.registration_start)
            ? `Đăng ký mở lúc ${formatDateTimeVi(policy.registration_start)}.`
            : "Đã hết thời gian đăng ký tháng này."
          : statusKey === "pending"
            ? "Lịch đã gửi và đang chờ quản lý duyệt."
            : statusKey === "approved"
              ? "Lịch tháng này đã được duyệt."
              : null;
  const readOnly = Boolean(lockedReason) || submitting;

  const legacyDates = useMemo(
    () =>
      new Set(
        schedules
          .filter((item) => !item.month && item.status !== "rejected")
          .flatMap((item) =>
            (item.entries || []).map((entry) => getScheduleDateKey(entry.date)),
          )
          .filter((key) => key.slice(0, 7) === month),
      ),
    [schedules, month],
  );
  const savedEntries = useMemo(() => {
    const result: Record<string, IScheduleEntry> = {};
    // Keep weekly history visible without turning it into an editable monthly request.
    for (const item of schedules) {
      if (!item.month && item.status === "rejected") continue;
      for (const entry of item.entries || []) {
        const key = getScheduleDateKey(entry.date);
        if (key.slice(0, 7) === month && (!request || item._id === request._id))
          result[key] = entry;
      }
    }
    return result;
  }, [schedules, month, request]);
  const entriesByDate = useMemo(() => {
    const result: Record<
      string,
      Draft & { request_status?: IScheduleRequest["status"] }
    > = {};
    Object.entries(savedEntries).forEach(([key, entry]) => {
      result[key] = { ...entry, request_status: request?.status };
    });
    if (
      statusKey !== "pending" &&
      statusKey !== "approved" &&
      draft.month === month
    ) {
      Object.entries(draft.entries).forEach(([key, entry]) => {
        if (key >= todayKey) result[key] = entry;
      });
    }
    return result;
  }, [savedEntries, request?.status, statusKey, draft, month, todayKey]);
  const workEntries = Object.entries(entriesByDate).filter(
    ([key, entry]) =>
      !legacyDates.has(key) &&
      entry.type === "office",
  );
  const workDays = workEntries.length;
  const sessions = workEntries.reduce(
    (sum, [, entry]) =>
      sum +
      (entry.period === "morning" || entry.period === "afternoon" ? 1 : 2),
    0,
  );
  const futureWorkDays = workEntries.filter(([key]) => key >= todayKey).length;
  const selectedKey = toLocalDateKey(selectedDate);
  const selectedEntry = entriesByDate[selectedKey] || {};
  const dayReadOnly =
    readOnly || selectedKey < todayKey || legacyDates.has(selectedKey);
  const unsaved =
    draft.month === month &&
    Object.keys(draft.entries).some((key) => key >= todayKey);

  const updateDay = (change: Draft) => {
    if (dayReadOnly || !month) return;
    setDraft((previous) => ({
      month,
      entries: {
        ...previous.entries,
        [selectedKey]: { ...selectedEntry, ...change },
      },
    }));
  };
  const applyWeekdays = () => {
    if (readOnly || !month) return;
    setDraft((previous) => {
      const entries = { ...previous.entries };
      const count = new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth() + 1,
        0,
      ).getDate();
      for (let day = 1; day <= count; day++) {
        const date = new Date(
          visibleMonth.getFullYear(),
          visibleMonth.getMonth(),
          day,
        );
        const key = toLocalDateKey(date);
        if (
          legacyDates.has(key) ||
          key < todayKey ||
          date.getDay() === 0 ||
          date.getDay() === 6
        )
          continue;
        entries[key] = {
          type: "office",
          period: "full_day",
          note: entriesByDate[key]?.note || "",
        };
      }
      return { month, entries };
    });
  };
  const submit = () => {
    if (readOnly || !month || !futureWorkDays || savingRef.current) return;
    const entries: IScheduleEntry[] = Object.entries(entriesByDate)
      .filter(
        ([key, entry]) =>
          !legacyDates.has(key) &&
          Boolean(entry.type) &&
          (key < todayKey || entry.type === "office"),
      )
      .map(([date, entry]) => ({
        date,
        type: entry.type!,
        period: entry.period || "full_day",
        note: entry.note || "",
      }));
    const monthLabel = `${visibleMonth.getMonth() + 1}/${visibleMonth.getFullYear()}`;
    AppAlert.alert(
      statusKey === "rejected"
        ? "Gửi lại lịch tháng?"
        : "Gửi lịch tháng để duyệt?",
      `Tháng ${monthLabel}: ${workDays} ngày làm, ${sessions} buổi. Ngày không chọn là ngày nghỉ. Sau khi gửi, lịch sẽ chờ quản lý duyệt.`,
      [
        { text: "Xem lại", style: "cancel" },
        {
          text: "Gửi duyệt",
          onPress: async () => {
            if (savingRef.current) return;
            savingRef.current = true;
            setSubmitting(true);
            try {
              const sent =
                request?.status === "rejected"
                  ? await resubmitRejectedSchedule(request._id, entries)
                  : await sendScheduleRequest(month, entries);
              if (sent) {
                setDraft({ month, entries: {} });
                await loadData();
              }
            } finally {
              savingRef.current = false;
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };
  usePreventRemove(submitting || (unsaved && !readOnly), ({ data }) => {
    if (savingRef.current) return;
    AppAlert.alert(
      "Rời trang đăng ký?",
      "Những ngày đang chọn chưa được gửi duyệt.",
      [
        { text: "Ở lại", style: "cancel" },
        { text: "Rời trang", onPress: () => navigation.dispatch(data.action) },
      ],
    );
  });

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Đăng ký lịch làm"
        subtitle="Chọn ngày trong tháng và gửi quản lý duyệt"
        tone={tone}
        onBack={onBack}
      />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={accent} />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="mb-4 flex-row items-start rounded-2xl border border-slate-200 bg-white p-3">
              <Ionicons
                name={closed ? "lock-closed-outline" : "calendar-outline"}
                size={20}
                color={accent}
              />
              <View className="ml-2 flex-1">
                <Text className="text-sm font-bold text-slate-900">
                  {month
                    ? `Đăng ký tháng ${visibleMonth.getMonth() + 1}/${visibleMonth.getFullYear()}`
                    : "Chưa mở đăng ký"}
                </Text>
                <Text className="mt-1 text-xs leading-5 text-slate-500">
                  {lockedReason ||
                    `Hạn gửi: ${formatDateTimeVi(policy?.registration_end)}`}
                </Text>
              </View>
              <View className={`ml-2 rounded-full px-2 py-1 ${status.box}`}>
                <Text className={`text-[10px] font-bold ${status.text}`}>
                  {status.label}
                </Text>
              </View>
            </View>
            {loadError || !month ? (
              <Pressable
                accessibilityRole="button"
                className="mb-4 items-center rounded-xl bg-slate-200 p-3"
                onPress={() => {
                  setLoading(true);
                  void loadData();
                }}
              >
                <Text className="font-bold text-slate-700">Tải lại</Text>
              </Pressable>
            ) : null}
            <WorkMonthCalendar
              visibleMonth={visibleMonth}
              selectedDate={selectedDate}
              entriesByDate={entriesByDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
              }}
              onChangeMonth={() => {}}
              minMonth={visibleMonth}
              maxMonth={visibleMonth}
              isDateDisabled={(date) =>
                !month ||
                toLocalDateKey(date) < todayKey ||
                legacyDates.has(toLocalDateKey(date)) ||
                submitting
              }
              tone={tone}
            />
            <Text className="mx-1 mt-3 text-xs leading-5 text-slate-500">
              Chọn ngày trên lịch để chỉnh ca. Ngày để trống là ngày nghỉ.
            </Text>
            <View className="mt-4 rounded-3xl bg-white p-4">
              <WorkDayScheduleEditor
                date={selectedDate}
                entry={selectedEntry}
                readOnly={dayReadOnly}
                readOnlyReason={
                  selectedKey < todayKey
                    ? "Ngày đã qua không thể chỉnh sửa."
                    : lockedReason
                }
                tone={tone}
                onChange={(field, value) => updateDay({ [field]: value })}
                onClear={() =>
                  updateDay({ type: undefined, period: "full_day", note: "" })
                }
              />
              {!readOnly ? (
                <View className="mt-5 border-t border-slate-100 pt-4">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Thao tác nhanh
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Chọn T2 đến T6 cả tháng tại công ty, cả ngày"
                    className="mt-2 min-h-14 flex-row items-center rounded-2xl bg-slate-50 px-3 py-2.5"
                    onPress={applyWeekdays}
                  >
                    <View
                      className={`h-9 w-9 items-center justify-center rounded-xl ${
                        tone === "admin" ? "bg-red-50" : "bg-blue-50"
                      }`}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={accent}
                      />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-xs font-bold text-slate-800">
                        Đi làm cả ngày từ T2 đến T6
                      </Text>
                      <Text className="mt-0.5 text-[10px] text-slate-500">
                        Áp dụng cho các ngày chưa qua trong tháng
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#94a3b8"
                    />
                  </Pressable>
                  {unsaved ? (
                    <View className="mt-3 flex-row items-center">
                      <View className="mr-2 h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <Text className="text-[10px] font-semibold text-amber-700">
                        Có thay đổi chưa gửi duyệt
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
            {legacyDates.size ? (
              <Text className="mx-1 mt-2 text-xs leading-5 text-slate-500">
                Ngày thuộc lịch tuần cũ được giữ nguyên và khóa. Bạn có thể xem
                chi tiết tại Lịch làm việc.
              </Text>
            ) : null}
            {request?.status === "rejected" ? (
              <View className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <Text className="text-sm font-bold text-rose-800">
                  Lý do từ chối
                </Text>
                <Text className="mt-1 text-sm leading-5 text-rose-700">
                  {request.reject_reason?.trim() ||
                    "Quản lý chưa ghi lý do cụ thể."}
                </Text>
              </View>
            ) : null}
          </ScrollView>
          <View className="border-t border-slate-200 bg-white px-4 py-3">
            <View className="mb-2 flex-row justify-between">
              <Text className="text-sm font-bold text-slate-900">
                {workDays} ngày làm · {sessions} buổi
              </Text>
              <Text className="text-xs text-slate-500">Trong tháng</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled: readOnly || !futureWorkDays,
                busy: submitting,
              }}
              disabled={readOnly || !futureWorkDays}
              className={`min-h-12 flex-row items-center justify-center rounded-2xl ${readOnly || !futureWorkDays ? "bg-slate-200" : buttonClass}`}
              onPress={submit}
            >
              {submitting ? (
                <ActivityIndicator color={accent} />
              ) : (
                <Text
                  className={`text-sm font-bold ${readOnly || !futureWorkDays ? "text-slate-500" : "text-white"}`}
                >
                  {statusKey === "pending"
                    ? "Đã gửi · Chờ duyệt"
                    : statusKey === "approved"
                      ? "Lịch đã được duyệt"
                      : statusKey === "rejected"
                        ? "Gửi lại lịch tháng"
                        : "Gửi lịch tháng"}
                </Text>
              )}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
