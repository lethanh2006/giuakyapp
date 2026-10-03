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

export type CanteenTableStatus = "empty" | "occupied" | "reserved";

export interface CanteenTable {
  _id: string;
  name: string;
  capacity: number;
  status: CanteenTableStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCanteenTableInput {
  name: string;
  capacity: number;
}

export type UpdateCanteenTableInput = Partial<CreateCanteenTableInput>;

export async function listCanteenTables(
  token: string,
  params: CanteenAdminQuery = {},
): Promise<CanteenAdminList<CanteenTable>> {
  const { data } = await axios.get<CanteenListResponse<CanteenTable>>(
    `${ipNR}/canteen/tables`,
    { ...getAuthHeader(token), params },
  );
  return normalizeCanteenAdminList(data);
}

export async function createCanteenTable(
  token: string,
  payload: CreateCanteenTableInput,
) {
  const { data } = await axios.post<CanteenDataResponse<CanteenTable>>(
    `${ipNR}/canteen/tables`,
    payload,
    getAuthHeader(token),
  );
  return data.data;
}

export async function updateCanteenTable(
  token: string,
  tableId: string,
  payload: UpdateCanteenTableInput,
) {
  const { data } = await axios.patch<CanteenDataResponse<CanteenTable>>(
    `${ipNR}/canteen/tables/${encodeURIComponent(tableId)}`,
    payload,
    getAuthHeader(token),
  );
  return data.data;
}

export async function deleteCanteenTable(token: string, tableId: string) {
  const { data } = await axios.delete<CanteenDataResponse<CanteenTable>>(
    `${ipNR}/canteen/tables/${encodeURIComponent(tableId)}`,
    getAuthHeader(token),
  );
  return data.data;
}

export async function updateCanteenTableStatus(
  token: string,
  tableId: string,
  status: CanteenTableStatus,
) {
  const { data } = await axios.patch<CanteenTable>(
    `${ipNR}/canteen/tables/${encodeURIComponent(tableId)}/status`,
    { status },
    getAuthHeader(token),
  );
  return data;
}
