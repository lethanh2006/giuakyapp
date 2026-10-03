import { getAreaForRole } from "@/src/application/access/roles";
import { APP_ROUTES } from "@/src/application/navigation/routes";
import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import {
  AuthInput,
  AuthPrimaryButton,
  AuthScreen,
} from "@/src/features/auth/ui/AuthForm";
import {
  loginUser,
  loginWithGoogle,
  saveAuthSession,
} from "@/src/services/auth/auth.service";
import { configureGoogleSignin } from "@/src/services/auth/google-signin";
import { normalizeUser } from "@/src/shared/model/normalize-user";
import { getApiErrorMessage } from "@/src/utils/apiHelper";
import { ipNR } from "@/src/utils/ip";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import { isAxiosError } from "axios";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";

export default function LoginScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const {
    isAuth,
    loading: userLoading,
    user,
    setUser,
    setIsAuth,
  } = useAuthSession();
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState(
    typeof params.email === "string" ? params.email : "",
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userLoading && isAuth) {
      router.replace(APP_ROUTES[getAreaForRole(user?.role)].home);
    }
  }, [isAuth, user?.role, userLoading]);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Thông báo", "Vui lòng nhập đầy đủ thông tin");
      return;
    }

    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    console.log("[LOGIN] Bắt đầu gọi API", {
      url: `${ipNR}/auth/login`,
      email: normalizedEmail,
    });

    try {
      const response = await loginUser({
        email: normalizedEmail,
        password,
      });
      const { data } = response;

      console.log("[LOGIN] Thành công", {
        status: response.status,
        data,
      });

      Alert.alert("Thành công", data.message || "Đăng nhập thành công");
      router.push({
        pathname: "/(auth)/verify",
        params: { email: normalizedEmail },
      });
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        console.error("[LOGIN] Axios error", {
          url: `${ipNR}/auth/login`,
          code: err.code,
          message: err.message,
          status: err.response?.status,
          responseData: err.response?.data,
        });
      } else {
        console.error("[LOGIN] Unknown error", err);
      }

      Alert.alert("Lỗi", getApiErrorMessage(err, "Không thể đăng nhập"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);

    try {
      // Configure again immediately before sign-in. This avoids a race on
      // real devices where the screen can be pressed before RootLayout's
      // useEffect has completed.
      configureGoogleSignin();

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) {
        Alert.alert("Thông báo", "Bạn đã hủy đăng nhập Google.");
        return;
      }

      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) {
        throw new Error("Google không trả về ID Token");
      }

      const { data } = await loginWithGoogle(idToken);
      await saveAuthSession(data);
      setUser(normalizeUser(data.user));
      setIsAuth(true);
    } catch (error: unknown) {
      const nativeCode = isErrorWithCode(error) ? error.code : undefined;
      const nativeMessage =
        error instanceof Error && error.message
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : undefined;

      if (isAxiosError(error)) {
        console.error("[GOOGLE_LOGIN] API error", {
          code: error.code,
          message: error.message,
          status: error.response?.status,
          responseData: error.response?.data,
        });
      } else {
        console.error("[GOOGLE_LOGIN] Native error", {
          code: nativeCode,
          message: nativeMessage,
          error,
        });
      }

      const message = isAxiosError(error)
        ? getApiErrorMessage(error, "Đăng nhập Google thất bại")
        : [nativeCode, nativeMessage].filter(Boolean).join(": ") ||
          "Đăng nhập Google thất bại";

      Alert.alert("Lỗi", message);
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f4f7fb]">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <AuthScreen
      eyebrow="HDG Workspace"
      title="Chào mừng trở lại"
      subtitle="Đăng nhập để tiếp tục công việc và kết nối cùng đội ngũ của bạn."
    >
      <View className="rounded-[28px] border border-white bg-white p-5 shadow-xl shadow-slate-200/80">
        <AuthInput
          label="Email công việc"
          icon="mail-outline"
          placeholder="name@hdg.com.vn"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="next"
          editable={!loading}
        />

        <AuthInput
          label="Mật khẩu"
          icon="lock-closed-outline"
          placeholder="Nhập mật khẩu của bạn"
          value={password}
          onChangeText={setPassword}
          secure
          autoComplete="current-password"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          editable={!loading}
        />

        <AuthPrimaryButton
          label="Đăng nhập"
          loading={loading}
          onPress={handleSubmit}
        />

        <Pressable
          className="mt-3 min-h-14 flex-row items-center justify-center rounded-2xl border border-slate-200 bg-white active:bg-slate-50"
          onPress={handleGoogleLogin}
          disabled={loading}
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
        >
          <Text className="text-base font-extrabold text-slate-800">
            Tiếp tục với Google
          </Text>
        </Pressable>

        <View className="my-5 h-px bg-slate-100" />

        <View className="flex-row flex-wrap items-center justify-center">
          <Text className="text-sm font-medium text-slate-500">
            {"Chưa có tài khoản? "}
          </Text>
          <Pressable onPress={() => router.push("/(auth)/register")}>
            <Text className="text-sm font-extrabold text-blue-700">
              Đăng ký ngay
            </Text>
          </Pressable>
        </View>
      </View>
    </AuthScreen>
  );
}
