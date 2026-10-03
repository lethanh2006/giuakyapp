import type {
  AdminMenuCatalog,
  CanteenOrder,
  CreateMenuItemInput,
  CreateOrderInput,
  MenuGroup,
  MenuItem,
  OrderListQuery,
  PaginatedOrders,
  UpdateMenuItemInput,
} from "@/src/services/canteen/constant";
import { getAuthHeader } from "@/src/utils/apiHelper";
import axios from "@/src/utils/axios";
import { ipNR } from "@/src/utils/ip";

export async function getCanteenMenu() {
  const { data } = await axios.get<MenuGroup[]>(`${ipNR}/canteen/menu`);
  return Array.isArray(data) ? data : [];
}

export async function searchCanteenMenu(query: string) {
  const { data } = await axios.get<MenuItem[]>(`${ipNR}/canteen/menu/search`, {
    params: { q: query.trim() },
  });
  return Array.isArray(data) ? data : [];
}

export async function getAdminCanteenMenu(token: string) {
  const { data } = await axios.get<AdminMenuCatalog>(
    `${ipNR}/canteen/admin/menu`,
    getAuthHeader(token),
  );
  return {
    categories: Array.isArray(data.categories) ? data.categories : [],
    items: Array.isArray(data.items) ? data.items : [],
  };
}

export async function createCanteenMenuItem(
  token: string,
  payload: CreateMenuItemInput,
) {
  const { data } = await axios.post<MenuItem>(
    `${ipNR}/canteen/admin/menu`,
    payload,
    getAuthHeader(token),
  );
  return data;
}

export async function updateCanteenMenuItem(
  token: string,
  itemId: string,
  payload: UpdateMenuItemInput,
) {
  const { data } = await axios.put<MenuItem>(
    `${ipNR}/canteen/admin/menu/${encodeURIComponent(itemId)}`,
    payload,
    getAuthHeader(token),
  );
  return data;
}

export async function deleteCanteenMenuItem(token: string, itemId: string) {
  const { data } = await axios.delete<MenuItem>(
    `${ipNR}/canteen/admin/menu/${encodeURIComponent(itemId)}`,
    getAuthHeader(token),
  );
  return data;
}

export async function undoCanteenMenuChange(token: string) {
  const { data } = await axios.post<unknown>(
    `${ipNR}/canteen/admin/menu/undo`,
    {},
    getAuthHeader(token),
  );
  return data;
}

export async function redoCanteenMenuChange(token: string) {
  const { data } = await axios.post<unknown>(
    `${ipNR}/canteen/admin/menu/redo`,
    {},
    getAuthHeader(token),
  );
  return data;
}

export async function createCanteenOrder(
  token: string,
  payload: CreateOrderInput,
) {
  const { data } = await axios.post<CanteenOrder>(
    `${ipNR}/canteen/orders`,
    payload,
    getAuthHeader(token),
  );
  return data;
}

export async function getMyCanteenOrders(token: string) {
  const { data } = await axios.get<CanteenOrder[]>(
    `${ipNR}/canteen/orders/my-orders`,
    getAuthHeader(token),
  );
  return Array.isArray(data) ? data : [];
}

export async function cancelCanteenOrder(
  token: string,
  orderId: string,
  reason?: string,
) {
  const { data } = await axios.patch<CanteenOrder>(
    `${ipNR}/canteen/orders/${encodeURIComponent(orderId)}/cancel`,
    { reason: reason?.trim() || undefined },
    getAuthHeader(token),
  );
  return data;
}

export async function confirmCashCanteenPayment(
  token: string,
  orderId: string,
) {
  const { data } = await axios.patch<CanteenOrder>(
    `${ipNR}/canteen/orders/${encodeURIComponent(orderId)}/payment/cash`,
    {},
    getAuthHeader(token),
  );
  return data;
}

export async function listCanteenOrders(
  token: string,
  params: OrderListQuery = {},
) {
  const { data } = await axios.get<PaginatedOrders>(`${ipNR}/canteen/orders`, {
    ...getAuthHeader(token),
    params,
  });
  return data;
}
