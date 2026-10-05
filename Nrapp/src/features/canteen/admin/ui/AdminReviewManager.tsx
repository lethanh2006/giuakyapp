import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import AdminStarRating from "@/src/features/canteen/admin/ui/AdminStarRating";
import {
  formatDateTime,
  getCanteenErrorMessage,
} from "@/src/features/canteen/shared/model/presentation";
import {
  getCanteenReviewSummary,
  listCanteenReviews,
  REVIEW_COMMENT_MAX_LENGTH,
  REVIEW_STARS,
  replyCanteenReview,
  type CanteenReview,
  type ReviewRangeQuery,
  type ReviewSummary,
} from "@/src/services/canteen/review.service";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

type Props = {
  refreshKey?: number;
};

type Period = "ALL" | "7D" | "30D";
type ReplyFilter = "ALL" | "UNANSWERED" | "ANSWERED";

const PERIOD_OPTIONS: { value: Period; label: string; days?: number }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "7D", label: "7 ngày", days: 7 },
  { value: "30D", label: "30 ngày", days: 30 },
];
const REPLY_OPTIONS: { value: ReplyFilter; label: string }[] = [
  { value: "ALL", label: "Mọi trạng thái" },
  { value: "UNANSWERED", label: "Chưa phản hồi" },
  { value: "ANSWERED", label: "Đã phản hồi" },
];
const PAGE_SIZE = 10;

function periodRange(period: Period): ReviewRangeQuery {
  const days = PERIOD_OPTIONS.find((option) => option.value === period)?.days;
  return days
    ? { from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() }
    : {};
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`rounded-full border px-3 py-2 ${selected ? "border-red-600 bg-red-600" : "border-slate-200 bg-white"}`}
      onPress={onPress}
    >
      <Text
        className={`text-[11px] font-black ${selected ? "text-white" : "text-slate-600"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function AdminReviewManager({ refreshKey = 0 }: Props) {
  const { getToken } = useAuthSession();
  const [period, setPeriod] = useState<Period>("ALL");
  const [rating, setRating] = useState<number | null>(null);
  const [replyFilter, setReplyFilter] = useState<ReplyFilter>("ALL");
  const [page, setPage] = useState(1);
  const [reviews, setReviews] = useState<CanteenReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (showLoading = true) => {
      const current = ++requestId.current;
      try {
        if (showLoading) setLoading(true);
        const token = await getToken();
        if (!token) {
          setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
          return;
        }
        const range = periodRange(period);
        const [list, stats] = await Promise.all([
          listCanteenReviews(token, {
            ...range,
            rating: rating ?? undefined,
            replied:
              replyFilter === "ALL" ? undefined : replyFilter === "ANSWERED",
            page,
            limit: PAGE_SIZE,
          }),
          getCanteenReviewSummary(token, range),
        ]);
        if (current !== requestId.current) return;
        const nextTotalPages = Math.max(list.pagination?.totalPages || 1, 1);
        if (page > nextTotalPages) {
          setPage(nextTotalPages);
          return;
        }
        setReviews(Array.isArray(list.reviews) ? list.reviews : []);
        setTotalPages(nextTotalPages);
        setSummary(stats);
        setError(null);
      } catch (loadError) {
        if (current === requestId.current)
          setError(
            getCanteenErrorMessage(loadError, "Không tải được đánh giá"),
          );
      } finally {
        if (showLoading && current === requestId.current) setLoading(false);
      }
    },
    [getToken, page, period, rating, replyFilter],
  );

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const applyFilter = (change: () => void) => {
    setPage(1);
    change();
  };

  const sendReply = async (review: CanteenReview) => {
    const message = (drafts[review._id] ?? "").trim();
    if (!message) {
      Alert.alert("Thiếu nội dung", "Vui lòng nhập nội dung phản hồi");
      return;
    }
    try {
      setBusyId(review._id);
      const token = await getToken();
      if (!token) return;
      await replyCanteenReview(token, review._id, message);
      setDrafts((current) => {
        const next = { ...current };
        delete next[review._id];
        return next;
      });
      await load(false);
      Alert.alert(
        "Đã phản hồi",
        `Đã gửi phản hồi cho đơn ${review.orderNumber}.`,
      );
    } catch (replyError) {
      Alert.alert(
        "Lỗi",
        getCanteenErrorMessage(replyError, "Không gửi được phản hồi"),
      );
    } finally {
      setBusyId(null);
    }
  };

  const total = summary?.total ?? 0;

  return (
    <View>
      <View className="mb-4 rounded-3xl border border-red-100 bg-white p-4">
        <View className="flex-row items-center">
          <View className="items-center pr-4">
            <Text className="text-4xl font-black text-slate-900">
              {total ? summary?.averageRating.toFixed(1) : "—"}
            </Text>
            <AdminStarRating size={14} value={summary?.averageRating ?? 0} />
            <Text className="mt-1 text-[10px] font-bold text-slate-400">
              {total} đánh giá
            </Text>
          </View>
          <View className="flex-1">
            {[...REVIEW_STARS].reverse().map((star) => {
              const count = summary?.distribution?.[String(star)] ?? 0;
              return (
                <View className="mb-1 flex-row items-center" key={star}>
                  <Text className="w-6 text-[11px] font-black text-slate-500">
                    {star}★
                  </Text>
                  <View className="mx-2 h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <View
                      className="h-2 rounded-full bg-amber-400"
                      style={{ width: `${total ? (count / total) * 100 : 0}%` }}
                    />
                  </View>
                  <Text className="w-7 text-right text-[11px] font-bold text-slate-500">
                    {count}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
        <View className="mt-3 flex-row items-center rounded-2xl bg-amber-50 px-3 py-2">
          <Ionicons name="chatbubble-outline" size={15} color="#b45309" />
          <Text className="ml-2 text-xs font-bold text-amber-800">
            {summary?.unanswered ?? 0} đánh giá chưa được phản hồi
          </Text>
        </View>
      </View>

      <View className="mb-3">
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {PERIOD_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              onPress={() => applyFilter(() => setPeriod(option.value))}
              selected={period === option.value}
            />
          ))}
        </View>
        <View className="mt-2 flex-row flex-wrap" style={{ gap: 8 }}>
          <Chip
            label="Mọi số sao"
            onPress={() => applyFilter(() => setRating(null))}
            selected={rating === null}
          />
          {[...REVIEW_STARS].reverse().map((star) => (
            <Chip
              key={star}
              label={`${star} ★`}
              onPress={() => applyFilter(() => setRating(star))}
              selected={rating === star}
            />
          ))}
        </View>
        <View className="mt-2 flex-row flex-wrap" style={{ gap: 8 }}>
          {REPLY_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              onPress={() => applyFilter(() => setReplyFilter(option.value))}
              selected={replyFilter === option.value}
            />
          ))}
        </View>
      </View>

      {loading ? (
        <View className="items-center py-16">
          <ActivityIndicator color="#dc2626" size="large" />
        </View>
      ) : error ? (
        <View className="items-center rounded-3xl border border-rose-100 bg-white px-5 py-10">
          <Ionicons name="cloud-offline-outline" size={24} color="#e11d48" />
          <Text className="mt-3 text-center text-xs leading-5 text-slate-500">
            {error}
          </Text>
          <Pressable
            className="mt-4 rounded-2xl bg-red-600 px-4 py-3"
            onPress={() => void load()}
          >
            <Text className="text-xs font-black text-white">Thử lại</Text>
          </Pressable>
        </View>
      ) : reviews.length === 0 ? (
        <View className="items-center rounded-3xl border border-slate-100 bg-white px-5 py-14">
          <Ionicons name="star-outline" size={42} color="#cbd5e1" />
          <Text className="mt-3 text-sm font-black text-slate-700">
            Chưa có đánh giá phù hợp
          </Text>
        </View>
      ) : (
        reviews.map((review) => {
          const editing = drafts[review._id] !== undefined;
          const showInput = editing || !review.replyMessage;
          return (
            <View
              className="mb-3 overflow-hidden rounded-3xl border border-slate-100 bg-white p-4"
              key={review._id}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-base font-black text-slate-900">
                    Đơn {review.orderNumber}
                  </Text>
                  <Text className="mt-1 text-[11px] font-semibold text-slate-400">
                    {formatDateTime(review.createdAt)}
                  </Text>
                </View>
                <AdminStarRating size={16} value={review.rating} />
              </View>
              {review.itemNames?.length ? (
                <Text className="mt-2 text-[11px] font-semibold text-slate-500">
                  {review.itemNames.join(" · ")}
                </Text>
              ) : null}
              {review.comment ? (
                <Text className="mt-2 text-xs leading-5 text-slate-700">
                  {review.comment}
                </Text>
              ) : (
                <Text className="mt-2 text-xs italic text-slate-400">
                  Không có nhận xét
                </Text>
              )}
              {review.replyMessage ? (
                <View className="mt-3 rounded-2xl bg-emerald-50 p-3">
                  <Text className="text-[11px] font-black text-emerald-800">
                    Phản hồi · {formatDateTime(review.repliedAt)}
                  </Text>
                  <Text className="mt-1 text-xs leading-5 text-emerald-900">
                    {review.replyMessage}
                  </Text>
                </View>
              ) : null}
              {showInput ? (
                <View className="mt-3">
                  <TextInput
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700"
                    editable={busyId === null}
                    maxLength={REVIEW_COMMENT_MAX_LENGTH}
                    multiline
                    onChangeText={(text) =>
                      setDrafts((current) => ({
                        ...current,
                        [review._id]: text,
                      }))
                    }
                    placeholder="Nhập phản hồi cho nhân viên…"
                    placeholderTextColor="#94a3b8"
                    style={{ minHeight: 56, textAlignVertical: "top" }}
                    value={drafts[review._id] ?? ""}
                  />
                  <View className="mt-2 flex-row" style={{ gap: 8 }}>
                    {editing && review.replyMessage ? (
                      <Pressable
                        className="flex-1 items-center rounded-2xl border border-slate-200 bg-white py-2.5"
                        disabled={busyId !== null}
                        onPress={() =>
                          setDrafts((current) => {
                            const next = { ...current };
                            delete next[review._id];
                            return next;
                          })
                        }
                      >
                        <Text className="text-xs font-black text-slate-600">
                          Hủy
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      className="flex-1 flex-row items-center justify-center rounded-2xl bg-red-600 py-2.5 active:bg-red-700 disabled:opacity-50"
                      disabled={busyId !== null}
                      onPress={() => void sendReply(review)}
                    >
                      {busyId === review._id ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <>
                          <Ionicons name="send" size={14} color="white" />
                          <Text className="ml-2 text-xs font-black text-white">
                            Gửi phản hồi
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  className="mt-3 items-center rounded-2xl border border-slate-200 bg-white py-2.5"
                  onPress={() =>
                    setDrafts((current) => ({
                      ...current,
                      [review._id]: review.replyMessage ?? "",
                    }))
                  }
                >
                  <Text className="text-xs font-black text-slate-600">
                    Sửa phản hồi
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })
      )}

      {!loading && !error && totalPages > 1 ? (
        <View className="mt-2 flex-row">
          <Pressable
            className="mr-2 flex-1 items-center rounded-2xl border border-slate-200 bg-white py-3"
            disabled={page <= 1}
            onPress={() => setPage((current) => Math.max(1, current - 1))}
          >
            <Text className="text-xs font-black text-slate-600">
              Trang trước
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 items-center rounded-2xl bg-red-700 py-3"
            disabled={page >= totalPages}
            onPress={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
          >
            <Text className="text-xs font-black text-white">
              Trang sau · {page}/{totalPages}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
