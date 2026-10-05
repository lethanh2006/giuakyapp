import { formatDateTime } from "@/src/features/canteen/shared/model/presentation";
import UserStarRating from "@/src/features/canteen/user/ui/UserStarRating";
import type { CanteenOrder } from "@/src/services/canteen/constant";
import {
  isReviewWindowOpen,
  REVIEW_COMMENT_MAX_LENGTH,
  REVIEW_WINDOW_DAYS,
  type CanteenReview,
  type UpsertReviewInput,
} from "@/src/services/canteen/review.service";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

type OrderReviewPanelProps = {
  order: CanteenOrder;
  review?: CanteenReview;
  /** Trả về true khi lưu thành công để panel đóng form. */
  onSubmit: (order: CanteenOrder, input: UpsertReviewInput) => Promise<boolean>;
};

/** Đánh giá bữa ăn cho đơn đã thanh toán: xem, tạo hoặc sửa trong thời hạn. */
export default function OrderReviewPanel({
  order,
  review,
  onSubmit,
}: OrderReviewPanelProps) {
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [comment, setComment] = useState(review?.comment ?? "");
  const [submitting, setSubmitting] = useState(false);

  const windowOpen = isReviewWindowOpen(order);
  const canEdit = windowOpen && !review?.replyMessage;
  const showForm = canEdit && (!review || editing);

  if (!review && !windowOpen) return null;

  const startEditing = () => {
    setRating(review?.rating ?? 0);
    setComment(review?.comment ?? "");
    setEditing(true);
  };

  const submit = async () => {
    if (rating < 1) {
      Alert.alert("Chưa chọn số sao", "Hãy chọn từ 1 đến 5 sao.");
      return;
    }
    setSubmitting(true);
    try {
      const saved = await onSubmit(order, {
        rating,
        comment: comment.trim() || undefined,
      });
      if (saved) setEditing(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (showForm)
    return (
      <View>
        <Text className="text-xs font-black text-slate-700">
          {review ? "Sửa đánh giá" : "Bạn thấy bữa ăn thế nào?"}
        </Text>
        <View className="mt-2">
          <UserStarRating
            disabled={submitting}
            onChange={setRating}
            size={30}
            value={rating}
          />
        </View>
        <TextInput
          className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700"
          editable={!submitting}
          maxLength={REVIEW_COMMENT_MAX_LENGTH}
          multiline
          onChangeText={setComment}
          placeholder="Nhận xét thêm (không bắt buộc)"
          placeholderTextColor="#94a3b8"
          style={{ minHeight: 64, textAlignVertical: "top" }}
          value={comment}
        />
        <Text className="mt-1 text-[10px] text-slate-400">
          Có thể đánh giá và sửa trong {REVIEW_WINDOW_DAYS} ngày kể từ khi thanh
          toán, cho đến khi căn tin phản hồi.
        </Text>
        <View className="mt-3 flex-row" style={{ gap: 8 }}>
          {review ? (
            <Pressable
              className="flex-1 items-center rounded-2xl border border-slate-200 bg-white py-2.5"
              disabled={submitting}
              onPress={() => setEditing(false)}
            >
              <Text className="text-xs font-black text-slate-600">Hủy</Text>
            </Pressable>
          ) : null}
          <Pressable
            className="flex-1 flex-row items-center justify-center rounded-2xl bg-rose-600 py-2.5 active:bg-rose-700 disabled:opacity-50"
            disabled={submitting}
            onPress={() => void submit()}
          >
            {submitting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="send" size={14} color="white" />
                <Text className="ml-2 text-xs font-black text-white">
                  Gửi đánh giá
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    );

  if (!review) return null;

  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-black text-slate-700">
          Đánh giá của bạn
        </Text>
        <Text className="text-[10px] font-semibold text-slate-400">
          {formatDateTime(review.updatedAt)}
        </Text>
      </View>
      <View className="mt-2">
        <UserStarRating size={20} value={review.rating} />
      </View>
      {review.comment ? (
        <Text className="mt-2 text-xs leading-5 text-slate-600">
          {review.comment}
        </Text>
      ) : null}
      {review.replyMessage ? (
        <View className="mt-3 rounded-2xl bg-emerald-50 p-3">
          <View className="flex-row items-center">
            <Ionicons name="chatbubble-ellipses" size={14} color="#047857" />
            <Text className="ml-1.5 text-[11px] font-black text-emerald-800">
              Căn tin phản hồi
            </Text>
          </View>
          <Text className="mt-1 text-xs leading-5 text-emerald-900">
            {review.replyMessage}
          </Text>
        </View>
      ) : canEdit ? (
        <Pressable
          className="mt-3 items-center rounded-2xl border border-slate-200 bg-white py-2.5"
          onPress={startEditing}
        >
          <Text className="text-xs font-black text-slate-600">
            Sửa đánh giá
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
