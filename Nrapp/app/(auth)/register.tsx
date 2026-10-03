import {
  AuthInput,
  AuthPrimaryButton,
  AuthScreen,
} from "@/src/features/auth/ui/AuthForm";
import { registerUser } from "@/src/services/auth/auth.service";
import { getApiErrorMessage } from "@/src/utils/apiHelper";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

export default function RegisterScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);
    try {
      const { data } = await registerUser({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      Alert.alert("Thành công", data.message);
      router.replace({
        pathname: "/(auth)/login",
        params: { email: email.trim() },
      });
    } catch (err: unknown) {
      Alert.alert("Lỗi", getApiErrorMessage(err, "Không thể đăng ký"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      eyebrow="Gia nhập HDG"
      title="Tạo tài khoản mới"
      subtitle="Tạo tài khoản để bắt đầu làm việc và kết nối cùng đội ngũ của bạn."
    >
      <View className="rounded-[28px] border border-white bg-white p-5 shadow-xl shadow-slate-200/80">
        <AuthInput
          label="Tên hiển thị"
          icon="person-outline"
          placeholder="Ví dụ: Nguyễn Minh Anh"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
          editable={!loading}
        />

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
          placeholder="Tạo mật khẩu"
          value={password}
          onChangeText={setPassword}
          secure
          autoComplete="new-password"
          returnKeyType="next"
          editable={!loading}
        />

        <AuthInput
          label="Xác nhận mật khẩu"
          icon="key-outline"
          placeholder="Nhập lại mật khẩu"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secure
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={handleRegister}
          editable={!loading}
        />

        <AuthPrimaryButton
          label="Tạo tài khoản"
          loading={loading}
          onPress={handleRegister}
        />

        <View className="my-5 h-px bg-slate-100" />

        <View className="flex-row flex-wrap items-center justify-center">
          <Text className="text-sm font-medium text-slate-500">
            {"Đã có tài khoản? "}
          </Text>
          <Pressable onPress={() => router.replace("/(auth)/login")}>
            <Text className="text-sm font-extrabold text-blue-700">
              Đăng nhập
            </Text>
          </Pressable>
        </View>
      </View>
    </AuthScreen>
  );
}
