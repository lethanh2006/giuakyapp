import { getAreaForRole } from "@/src/application/access/roles";
import { APP_ROUTES } from "@/src/application/navigation/routes";
import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import {
  AuthPrimaryButton,
  AuthScreen,
} from "@/src/features/auth/ui/AuthForm";
import { normalizeUser } from "@/src/shared/model/normalize-user";
import {
  saveAuthSession,
  verifyOtp,
} from "@/src/services/auth/auth.service";
import { getApiErrorMessage } from "@/src/utils/apiHelper";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { isAuth, setUser, setIsAuth, loading: userLoading, user } = useAuthSession();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (!userLoading && isAuth && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      router.replace(APP_ROUTES[getAreaForRole(user?.role)].home);
    }
  }, [isAuth, user?.role, userLoading]);

  useEffect(() => {
    if (!email) router.replace("/(auth)/login");
  }, [email]);

  const onChange = (i: number, v: string) => {
    const digits = v.replace(/\D/g, "");
    if (!digits && v) return;

    const n = [...otp];
    if (digits.length > 1) {
      digits
        .slice(0, 6 - i)
        .split("")
        .forEach((digit, offset) => {
          n[i + offset] = digit;
        });
    } else {
      n[i] = digits;
    }

    setOtp(n);
    if (digits) {
      const nextIndex = Math.min(i + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const onKeyPress = (i: number, e: { nativeEvent: { key: string } }) => {
    if (e.nativeEvent.key === "Backspace" && !otp[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const submit = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      Alert.alert("Lỗi", "Nhập đủ 6 số OTP");
      return;
    }
    setLoading(true);
    try {
      const { data } = await verifyOtp({
        email: email || "",
        otp: code,
      });
      const normalizedUser = normalizeUser(data.user);
      await saveAuthSession(data);
      setUser(normalizedUser);
      setIsAuth(true);
    } catch (error: unknown) {
      Alert.alert("Lỗi", getApiErrorMessage(error, "OTP sai hoặc hết hạn"));
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!email) return null;

  return (
    <AuthScreen
      eyebrow="Bảo mật tài khoản"
      title="Xác nhận đăng nhập"
      subtitle="Nhập mã gồm 6 chữ số để hoàn tất đăng nhập an toàn."
    >
      <View className="rounded-[28px] border border-white bg-white p-5 shadow-xl shadow-slate-200/80">
        <View className="mb-5 items-center">
          <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
            <Ionicons name="mail-unread-outline" size={23} color="#153b6f" />
          </View>
          <Text className="text-center text-sm leading-5 text-slate-500">
            Mã xác thực đã được gửi đến
          </Text>
          <Text
            className="mt-1 max-w-full text-center text-sm font-extrabold text-[#153b6f]"
            numberOfLines={1}
          >
            {email}
          </Text>
        </View>

        <Text className="mb-2 text-[13px] font-bold text-slate-700">
          Mã xác thực
        </Text>
        <View className="mb-5 flex-row justify-between">
          {otp.map((v, i) => (
            <TextInput
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              className={
                focusedIndex === i || v
                  ? "mx-1 h-14 min-w-0 flex-1 rounded-xl border-2 border-[#153b6f] bg-blue-50 text-center text-xl font-extrabold text-slate-900"
                  : "mx-1 h-14 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 text-center text-xl font-extrabold text-slate-900"
              }
              value={v}
              onChangeText={(t) => onChange(i, t)}
              onKeyPress={(e) => onKeyPress(i, e)}
              onFocus={() => setFocusedIndex(i)}
              onBlur={() => setFocusedIndex(null)}
              keyboardType="number-pad"
              maxLength={6}
              selectTextOnFocus
              editable={!loading}
              textContentType="oneTimeCode"
              selectionColor="#153b6f"
              accessibilityLabel={`Chữ số OTP thứ ${i + 1}`}
            />
          ))}
        </View>

        <AuthPrimaryButton
          icon="checkmark-circle-outline"
          label="Xác nhận mã"
          loading={loading}
          onPress={submit}
        />

        <View className="my-5 h-px bg-slate-100" />

        <Pressable
          className="flex-row items-center justify-center py-1"
          onPress={() =>
            router.replace({ pathname: "/(auth)/login", params: { email } })
          }
          disabled={loading}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={17} color="#1d4ed8" />
          <Text className="ml-2 text-sm font-extrabold text-blue-700">
            Quay lại đăng nhập
          </Text>
        </Pressable>
      </View>
    </AuthScreen>
  );
}
