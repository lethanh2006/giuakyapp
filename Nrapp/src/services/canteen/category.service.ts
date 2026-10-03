import type {
  CanteenAdminList,
  CanteenAdminQuery,
  CanteenDataResponse,
  CanteenListResponse,
} from "@/src/services/canteen/admin-resource";
import { normalizeCanteenAdminList } from "@/src/services/canteen/admin-resource";
import { getAuthHeader } from "@/src/utils/apiHelper";
import axios from "@/src/utils/axios";
import { ipNR } from "@/src/utils/ip";

export interface CanteenCategory {
  _id: string;
  name: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCanteenCategoryInput {
  name: string;
  description: string;
  displayOrder?: number;
  isActive?: boolean;
}

export type UpdateCanteenCategoryInput =
  Partial<CreateCanteenCategoryInput>;

export async function listCanteenCategories(
  params: CanteenAdminQuery = {},
): Promise<CanteenAdminList<CanteenCategory>> {
  const { data } = await axios.get<CanteenListResponse<CanteenCategory>>(
    `${ipNR}/canteen/categories`,
    { params },
  );
  return normalizeCanteenAdminList(data);
}

export async function createCanteenCategory(
  token: string,
  payload: CreateCanteenCategoryInput,
) {
  const { data } = await axios.post<CanteenDataResponse<CanteenCategory>>(
    `${ipNR}/canteen/categories`,
    payload,
    getAuthHeader(token),
  );
  return data.data;
}

export async function updateCanteenCategory(
  token: string,
  categoryId: string,
  payload: UpdateCanteenCategoryInput,
) {
  const { data } = await axios.patch<CanteenDataResponse<CanteenCategory>>(
    `${ipNR}/canteen/categories/${encodeURIComponent(categoryId)}`,
    payload,
    getAuthHeader(token),
  );
  return data.data;
}

export async function deleteCanteenCategory(
  token: string,
  categoryId: string,
) {
  const { data } = await axios.delete<CanteenDataResponse<CanteenCategory>>(
    `${ipNR}/canteen/categories/${encodeURIComponent(categoryId)}`,
    getAuthHeader(token),
  );
  return data.data;
}
