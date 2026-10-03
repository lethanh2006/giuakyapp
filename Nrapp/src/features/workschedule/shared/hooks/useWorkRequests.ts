import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import type {
  CreateWorkRequestPayload,
  IWorkRequest,
  IWorkRequestStats,
  WorkRequestQuery,
} from "@/src/services/workschedule/constant";
import {
  cancelWorkRequest,
  createWorkRequest,
  getMyWorkRequests,
  getMyWorkRequestStats,
} from "@/src/services/workschedule/workschedule.service";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import { getApiErrorMessage } from "@/src/utils/apiHelper";
import { useCallback, useState } from "react";

export function useWorkRequests() {
  const { getToken } = useAuthSession();
  const [loading, setLoading] = useState(false);

  const showError = useCallback((error: unknown, fallback: string) => {
    Alert.alert("Lỗi", getApiErrorMessage(error, fallback));
  }, []);

  const getRequests = useCallback(
    async (params: WorkRequestQuery = {}): Promise<IWorkRequest[]> => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return [];
        const { data } = await getMyWorkRequests(token, params);
        return Array.isArray(data.data) ? data.data : [];
      } catch (error) {
        showError(error, "Không thể tải lịch sử đơn");
        return [];
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const getStats = useCallback(
    async (month?: string): Promise<IWorkRequestStats | null> => {
      try {
        const token = await getToken();
        if (!token) return null;
        const { data } = await getMyWorkRequestStats(token, month);
        return data.data || null;
      } catch {
        return null;
      }
    },
    [getToken],
  );

  const submitRequest = useCallback(
    async (payload: CreateWorkRequestPayload): Promise<IWorkRequest | null> => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return null;
        const { data } = await createWorkRequest(token, payload);
        Alert.alert("Đã nộp đơn", "Đơn của bạn đã được gửi đến quản lý để phê duyệt.");
        return data.data || null;
      } catch (error) {
        showError(error, "Không thể nộp đơn");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const cancelRequest = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return false;
        await cancelWorkRequest(token, id);
        Alert.alert("Đã hủy đơn", "Đơn đang chờ duyệt đã được hủy.");
        return true;
      } catch (error) {
        showError(error, "Không thể hủy đơn");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  return { loading, getRequests, getStats, submitRequest, cancelRequest };
}
