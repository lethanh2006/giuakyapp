import type { CanteenOrder } from "@/src/services/canteen/constant";
import { getAuthHeader } from "@/src/utils/apiHelper";
import axios from "@/src/utils/axios";
import { ipNR } from "@/src/utils/ip";

/** Khớp quy tắc server: chỉ đánh giá/sửa trong 7 ngày kể từ lúc thu tiền. */
export const REVIEW_WINDOW_DAYS = 7;
export const REVIEW_COMMENT_MAX_LENGTH = 500;
export const REVIEW_STARS = [1, 2, 3, 4, 5] as const;

export interface CanteenReview {
  _id: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  itemNames: string[];
  rating: number;
  comment?: string;
  replyMessage?: string;
  repliedAt?: string | null;
  repliedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertReviewInput {
  rating: number;
  comment?: string;
}

export interface ReviewRangeQuery {
  from?: string;
  to?: string;
}

export interface ReviewListQuery extends ReviewRangeQuery {
  rating?: number;
  replied?: boolean;
  page?: number;
  limit?: number;
}

export interface ReviewSummary {
  total: number;
  averageRating: number;
  /** Khóa "1".."5" theo JSON của server. */
  distribution: Record<string, number>;
  unanswered: number;
}

export interface PaginatedReviews {
  reviews: CanteenReview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Đơn còn trong thời hạn đánh giá hay không; server vẫn là nơi quyết định. */
export function isReviewWindowOpen(
  order: Pick<CanteenOrder, "paidAt" | "updatedAt">,
  now = Date.now(),
) {
  const settledAt = Date.parse(order.paidAt ?? order.updatedAt);
  return (
    Number.isFinite(settledAt) &&
    now - settledAt <= REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );
}

export async function upsertCanteenReview(
  token: string,
  orderId: string,
  payload: UpsertReviewInput,
) {
  const { data } = await axios.put<CanteenReview>(
    `${ipNR}/canteen/orders/${encodeURIComponent(orderId)}/review`,
    payload,
    getAuthHeader(token),
  );
  return data;
}

export async function getMyCanteenReviews(token: string) {
  const { data } = await axios.get<CanteenReview[]>(
    `${ipNR}/canteen/reviews/my`,
    getAuthHeader(token),
  );
  return Array.isArray(data) ? data : [];
}

export async function listCanteenReviews(
  token: string,
  params: ReviewListQuery = {},
) {
  const { data } = await axios.get<PaginatedReviews>(
    `${ipNR}/canteen/reviews`,
    { ...getAuthHeader(token), params },
  );
  return data;
}

export async function getCanteenReviewSummary(
  token: string,
  params: ReviewRangeQuery = {},
) {
  const { data } = await axios.get<ReviewSummary>(
    `${ipNR}/canteen/reviews/summary`,
    { ...getAuthHeader(token), params },
  );
  return data;
}

export async function replyCanteenReview(
  token: string,
  reviewId: string,
  message: string,
) {
  const { data } = await axios.patch<CanteenReview>(
    `${ipNR}/canteen/reviews/${encodeURIComponent(reviewId)}/reply`,
    { message },
    getAuthHeader(token),
  );
  return data;
}
