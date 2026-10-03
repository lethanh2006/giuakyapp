import {
  clearAuthSession,
  getStoredRefreshToken,
  getStoredToken,
  refreshAuthSession,
} from "@/src/services/auth/auth.service";
import axios from "@/src/utils/axios";
import { getUserProfile } from "@/src/services/user/user.service";
import { normalizeUser } from "@/src/shared/model/normalize-user";
import type { User } from "@/src/services/user/constant";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { InternalAxiosRequestConfig } from "axios";

export type { User } from "@/src/services/user/constant";
interface AuthSessionContextValue {
  user: User | null;
  loading: boolean;
  isAuth: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setIsAuth: React.Dispatch<React.SetStateAction<boolean>>;
  logoutUser: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(undefined);

export const AuthSessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const refreshPromiseRef = useRef<ReturnType<typeof refreshAuthSession> | null>(
    null,
  );

  const getToken = useCallback(async () => {
    return getStoredToken();
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const { data } = await getUserProfile(token);
      const userData = data.user || data;
      setUser(normalizeUser(userData));
      setIsAuth(true);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403 || status === 404) {
        await clearAuthSession();
      }
      setUser(null);
      setIsAuth(false);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const logoutUser = useCallback(async () => {
    try {
      await clearAuthSession();
    } catch {
      // keep UI consistent even if storage operation fails
    } finally {
      setUser(null);
      setIsAuth(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error?.config as
          | (InternalAxiosRequestConfig & { _retriedAfterRefresh?: boolean })
          | undefined;
        if (error?.response?.status !== 401 || !config) {
          return Promise.reject(error);
        }
        if (config._retriedAfterRefresh) {
          await logoutUser();
          return Promise.reject(error);
        }

        config._retriedAfterRefresh = true;
        try {
          if (!refreshPromiseRef.current) {
            refreshPromiseRef.current = (async () => {
              const refreshToken = await getStoredRefreshToken();
              if (!refreshToken) throw new Error("Missing refresh token");
              return refreshAuthSession(refreshToken);
            })().finally(() => {
              refreshPromiseRef.current = null;
            });
          }
          const session = await refreshPromiseRef.current;
          setUser(normalizeUser(session.user));
          setIsAuth(true);
          config.headers.set("Authorization", `Bearer ${session.token}`);
          return axios(config);
        } catch (refreshError) {
          await logoutUser();
          return Promise.reject(refreshError);
        }
      },
    );
    return () => axios.interceptors.response.eject(interceptorId);
  }, [logoutUser]);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  return (
    <AuthSessionContext.Provider
      value={{
        user,
        setUser,
        isAuth,
        setIsAuth,
        loading,
        logoutUser,
        getToken,
      }}
    >
      {children}
    </AuthSessionContext.Provider>
  );
};

export const useAuthSession = (): AuthSessionContextValue => {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) throw new Error("useAuthSession must be used within AuthSessionProvider");
  return ctx;
};
