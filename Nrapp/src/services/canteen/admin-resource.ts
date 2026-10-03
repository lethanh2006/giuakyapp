export interface CanteenAdminQuery {
  page?: number;
  limit?: number;
  q?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CanteenAdminPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CanteenAdminList<T> {
  data: T[];
  meta: CanteenAdminPagination;
}

export interface CanteenDataResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface CanteenListResponse<T> extends CanteenDataResponse<T[]> {
  meta: CanteenAdminPagination;
}

export const EMPTY_CANTEEN_PAGINATION: CanteenAdminPagination = {
  page: 1,
  limit: 100,
  total: 0,
  totalPages: 0,
};

export function normalizeCanteenAdminList<T>(
  response: CanteenListResponse<T>,
): CanteenAdminList<T> {
  return {
    data: Array.isArray(response.data) ? response.data : [],
    meta: response.meta ?? EMPTY_CANTEEN_PAGINATION,
  };
}
