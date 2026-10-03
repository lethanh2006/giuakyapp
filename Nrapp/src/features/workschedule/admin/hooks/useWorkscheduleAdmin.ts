import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import { getApiErrorMessage } from "@/src/utils/apiHelper";
import {
  approveManySchedules,
  approveSchedule,
  deleteScheduleRequest,
  generateAttendanceQr,
  getAdminSchedule as fetchAdminSchedule,
  getAllSchedules as fetchAllSchedules,
  getAttendanceReport as fetchAttendanceReport,
  getPendingSchedules as fetchPendingSchedules,
  getScheduleHeatmap,
  getTodayAttendance as fetchTodayAttendance,
  getWorkPolicy,
  rejectSchedule,
  updateAdminSchedule,
  updateWorkPolicy,
  getAdminWorkRequests,
  approveWorkRequest as approveEmployeeWorkRequest,
  rejectWorkRequest as rejectEmployeeWorkRequest,
} from "@/src/services/workschedule/workschedule.service";
import type {
  AdminAttendanceRecord,
  AdminHeatmapRow,
  AdminScheduleRequest,
  IWorkPolicy,
  IScheduleEntry,
  WorkscheduleQuery,
  IWorkRequest,
  WorkRequestQuery,
} from "@/src/services/workschedule/constant";
import { useCallback, useState } from "react";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";

export type {
  AdminAttendanceRecord,
  AdminEmployeeProfile,
  AdminHeatmapRow,
  AdminScheduleRequest,
} from "@/src/services/workschedule/constant";

export function useWorkscheduleAdmin() {
  const { getToken } = useAuthSession();
  const [loading, setLoading] = useState(false);

  const showError = useCallback(
    (error: unknown, fallback: string, silent = false) => {
      if (!silent) Alert.alert("Lỗi", getApiErrorMessage(error, fallback));
    },
    [],
  );

  const getPolicy = useCallback(
    async (silent = false): Promise<IWorkPolicy | null> => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return null;
        const { data } = await getWorkPolicy(token);
        return data.data || null;
      } catch (error) {
        showError(error, "Không thể tải chính sách", silent);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const updatePolicy = useCallback(
    async (
      payload: Partial<IWorkPolicy>,
      silent = false,
    ): Promise<IWorkPolicy | null> => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return null;
        const { data } = await updateWorkPolicy(token, payload);
        return data.data || null;
      } catch (error) {
        showError(error, "Không thể cập nhật chính sách", silent);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const getPendingSchedules = useCallback(
    async (month?: string, silent = false): Promise<AdminScheduleRequest[]> => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return [];
        const { data } = await fetchPendingSchedules(token, month);
        return Array.isArray(data.data) ? data.data : [];
      } catch (error) {
        showError(error, "Không thể tải danh sách chờ duyệt", silent);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const getAllSchedules = useCallback(
    async (
      params: WorkscheduleQuery = {},
      silent = false,
    ): Promise<AdminScheduleRequest[]> => {
      try {
        setLoading(true);
        const query = {
          ...params,
          status: params.status === "all" ? undefined : params.status,
        };
        const token = await getToken();
        if (!token) return [];
        const { data } = await fetchAllSchedules(token, query);
        return Array.isArray(data.data) ? data.data : [];
      } catch (error) {
        showError(error, "Không thể tải danh sách lịch", silent);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const getScheduleDetail = useCallback(
    async (id: string, silent = false): Promise<AdminScheduleRequest | null> => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return null;
        const { data } = await fetchAdminSchedule(token, id);
        return data.data || null;
      } catch (error) {
        showError(error, "Không thể tải chi tiết lịch", silent);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const approveRequest = useCallback(
    async (id: string, silent = false) => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return false;
        await approveSchedule(token, id);
        return true;
      } catch (error) {
        showError(error, "Không thể duyệt lịch", silent);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const rejectRequest = useCallback(
    async (id: string, reason?: string, silent = false) => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return false;
        await rejectSchedule(token, id, reason);
        return true;
      } catch (error) {
        showError(error, "Không thể từ chối lịch", silent);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const bulkApprove = useCallback(
    async (ids: string[], silent = false) => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return false;
        await approveManySchedules(token, ids);
        return true;
      } catch (error) {
        showError(error, "Không thể duyệt hàng loạt", silent);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const getHeatmap = useCallback(
    async (month?: string, silent = false): Promise<AdminHeatmapRow[]> => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return [];
        const { data } = await getScheduleHeatmap(token, month);
        return Array.isArray(data.data) ? data.data : [];
      } catch (error) {
        showError(error, "Không thể tải heatmap", silent);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const generateQrToken = useCallback(
    async (silent = false) => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return null;
        const { data } = await generateAttendanceQr(token);
        return data.data || null;
      } catch (error) {
        showError(error, "Không thể tạo QR chấm công", silent);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const getTodayAttendance = useCallback(
    async (silent = false): Promise<AdminAttendanceRecord[]> => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return [];
        const { data } = await fetchTodayAttendance(token);
        return Array.isArray(data.data) ? data.data : [];
      } catch (error) {
        showError(error, "Không thể tải chấm công hôm nay", silent);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const getReport = useCallback(
    async (
      params: WorkscheduleQuery = {},
      silent = false,
    ): Promise<AdminAttendanceRecord[]> => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return [];
        const { data } = await fetchAttendanceReport(token, params);
        return Array.isArray(data.data) ? data.data : [];
      } catch (error) {
        showError(error, "Không thể tải báo cáo chấm công", silent);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const adminUpdateEntries = useCallback(
    async (
      id: string,
      entries: IScheduleEntry[],
      silent = false,
    ) => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return false;
        await updateAdminSchedule(token, id, entries);
        return true;
      } catch (error) {
        showError(error, "Không thể cập nhật lịch làm việc", silent);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const deleteRequest = useCallback(
    async (id: string, silent = false) => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return false;
        await deleteScheduleRequest(token, id);
        return true;
      } catch (error) {
        showError(error, "Không thể xóa yêu cầu lịch làm việc", silent);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const getEmployeeRequests = useCallback(
    async (
      params: WorkRequestQuery = {},
      silent = false,
    ): Promise<IWorkRequest[]> => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return [];
        const { data } = await getAdminWorkRequests(token, params);
        return Array.isArray(data.data) ? data.data : [];
      } catch (error) {
        showError(error, "Không thể tải danh sách đơn từ", silent);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const approveEmployeeRequest = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return false;
        await approveEmployeeWorkRequest(token, id);
        return true;
      } catch (error) {
        showError(error, "Không thể duyệt đơn");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const rejectEmployeeRequest = useCallback(
    async (id: string, reason: string) => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return false;
        await rejectEmployeeWorkRequest(token, id, reason);
        return true;
      } catch (error) {
        showError(error, "Không thể từ chối đơn");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  return {
    loading,
    getPolicy,
    updatePolicy,
    getPendingSchedules,
    getAllSchedules,
    getScheduleDetail,
    approveRequest,
    rejectRequest,
    bulkApprove,
    getHeatmap,
    generateQrToken,
    getTodayAttendance,
    getReport,
    adminUpdateEntries,
    deleteRequest,
    getEmployeeRequests,
    approveEmployeeRequest,
    rejectEmployeeRequest,
  };
}
