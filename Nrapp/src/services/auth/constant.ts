import type { User } from "@/src/services/user/constant";

export const TOKEN_KEY = "auth.accessToken";
export const REFRESH_TOKEN_KEY = "auth.refreshToken";
export const OLD_TOKEN_KEY = "token";

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface MessageResponse {
  message: string;
}

export interface AuthSessionResponse extends MessageResponse {
  token: string;
  refreshToken: string;
  user: User;
}
