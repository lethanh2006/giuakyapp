import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import {
  createScheduleRequest,
  getMyAttendance as fetchMyAttendance,
  getMySchedules as fetchMySchedules,
  getMonthlyScheduleOverview,
  getWorkPolicy,
  resubmitScheduleRequest,
} from "@/src/services/workschedule/workschedule.service";
import { getApiErrorMessage } from "@/src/utils/apiHelper";
import type {
  IScheduleEntry,
  IScheduleRequest,
  IWorkPolicy,
  IMonthlyScheduleOverview,
  PersonalAttendanceRecord,
} from "@/src/services/workschedule/constant";
import { useCallback, useState } from "react";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";

export function usePersonalWorkschedule() {
  const { getToken } = useAuthSession();
  const [loading, setLoading] = useState(false);

  const showError = useCallback((error: unknown, fallback: string) => {
    Alert.alert("Lỗi", getApiErrorMessage(error, fallback));
  }, []);

  const getPolicy = useCallback(async (): Promise<IWorkPolicy | null> => {
    try {
      const token = await getToken();
      if (!token) return null;
      const { data } = await getWorkPolicy(token);
      return data.data || null;
    } catch {
      return null;
    }
  }, [getToken]);

  const getRegistrationData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return null;
      const [schedules, policy] = await Promise.all([
        fetchMySchedules(token),
        getWorkPolicy(token),
      ]);
      return {
        schedules: Array.isArray(schedules.data.data)
          ? schedules.data.data
          : [],
        policy: policy.data.data || null,
      };
    } catch (error) {
      showError(error, "Không thể tải dữ liệu đăng ký lịch tháng");
      return null;
    }
  }, [getToken, showError]);

  const getMySchedules = useCallback(
    async (month?: string): Promise<IScheduleRequest[]> => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return [];
        const { data } = await fetchMySchedules(token, month);
        return Array.isArray(data.data) ? data.data : [];
      } catch (error) {
        showError(error, "Không thể tải danh sách lịch");
        return [];
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const getMonthlyOverview = useCallback(
    async (month: string): Promise<IMonthlyScheduleOverview | null> => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return null;
        const { data } = await getMonthlyScheduleOverview(token, month);
        return data.data || null;
      } catch (error) {
        showError(error, "Không thể tải lịch làm việc trong tháng");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const sendScheduleRequest = useCallback(
    async (month: string, entries: IScheduleEntry[]): Promise<boolean> => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return false;

        await createScheduleRequest(token, month, entries);
        Alert.alert("Thành công", "Đã nộp lịch để chờ duyệt");
        return true;
      } catch (error) {
        showError(error, "Không thể nộp lịch");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const resubmitRejectedSchedule = useCallback(
    async (id: string, entries: IScheduleEntry[]): Promise<boolean> => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return false;

        await resubmitScheduleRequest(token, id, entries);
        Alert.alert("Thành công", "Đã gửi lại lịch để quản lý duyệt");
        return true;
      } catch (error) {
        showError(error, "Không thể gửi lại lịch");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  const getMyAttendance = useCallback(
    async (from?: string, to?: string): Promise<PersonalAttendanceRecord[]> => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return [];
        const { data } = await fetchMyAttendance(token, { from, to });
        return Array.isArray(data.data) ? data.data : [];
      } catch (error) {
        showError(error, "Không thể tải lịch sử chấm công");
        return [];
      } finally {
        setLoading(false);
      }
    },
    [getToken, showError],
  );

  return {
    loading,
    getRegistrationData,
    getPolicy,
    getMySchedules,
    getMonthlyOverview,
    sendScheduleRequest,
    resubmitRejectedSchedule,
    getMyAttendance,
  };
}
