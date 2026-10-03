import { Ionicons } from "@expo/vector-icons";
import React, { ReactNode, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

type AuthScreenProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  subtitle?: string;
};

type AuthInputProps = TextInputProps & {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  secure?: boolean;
};

type AuthPrimaryButtonProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  loading?: boolean;
  onPress: () => void;
};

export function AuthScreen({
  children,
  eyebrow,
  title,
  subtitle,
}: AuthScreenProps) {
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#f4f7fb]"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        pointerEvents="none"
        className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-blue-100/70"
      />
      <View
        pointerEvents="none"
        className="absolute -bottom-40 -left-28 h-80 w-80 rounded-full bg-blue-100/40"
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      >
        <View className="mx-auto w-full max-w-md px-5 py-10">
          <View className="mb-7 items-center">
            <View className="mb-5 h-24 w-44 overflow-hidden rounded-[28px] border border-white/80 bg-slate-900 shadow-lg">
              <Image
                source={require("@/assets/images/logo.png")}
                className="absolute h-44 w-44"
                style={{ top: -40 }}
                resizeMode="cover"
                accessibilityLabel="Logo Công ty HDG"
              />
            </View>

            <View className="mb-2 flex-row items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5">
              <View className="mr-2 h-1.5 w-1.5 rounded-full bg-blue-600" />
              <Text className="text-[11px] font-bold uppercase tracking-[1.6px] text-blue-700">
                {eyebrow}
              </Text>
            </View>

            <Text className="text-center text-[30px] font-black tracking-tight text-slate-900">
              {title}
            </Text>
            {subtitle ? (
              <Text className="mt-2 max-w-[310px] text-center text-sm leading-5 text-slate-500">
                {subtitle}
              </Text>
            ) : null}
          </View>

          {children}

          <View className="mt-6 flex-row items-center justify-center">
            <Text className="text-xs font-medium text-slate-500">
              Kết nối nội bộ được bảo mật bởi HDG
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function AuthPrimaryButton({
  icon = "arrow-forward",
  label,
  loading = false,
  onPress,
}: AuthPrimaryButtonProps) {
  return (
    <Pressable
      className="mt-1 min-h-14 flex-row items-center justify-center rounded-2xl bg-[#153b6f] px-5 shadow-md shadow-blue-900/30 active:bg-[#0f2d56]"
      style={loading ? { opacity: 0.65 } : undefined}
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <>
          <Text className="text-base font-extrabold text-white">{label}</Text>
          <Ionicons
            name={icon}
            size={19}
            color="#ffffff"
            style={{ marginLeft: 8 }}
          />
        </>
      )}
    </Pressable>
  );
}

export function AuthInput({
  icon,
  label,
  secure = false,
  editable = true,
  ...inputProps
}: AuthInputProps) {
  const [isHidden, setIsHidden] = useState(secure);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-[13px] font-bold text-slate-700">{label}</Text>
      <View className="min-h-14 flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 focus:border-blue-500">
        <Ionicons name={icon} size={20} color="#64748b" />
        <TextInput
          {...inputProps}
          className="ml-3 flex-1 py-4 text-[15px] font-medium text-slate-900"
          placeholderTextColor="#94a3b8"
          secureTextEntry={isHidden}
          editable={editable}
          selectionColor="#2563eb"
        />
        {secure ? (
          <Pressable
            className="ml-2 h-9 w-9 items-center justify-center rounded-full active:bg-slate-200"
            onPress={() => setIsHidden((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={isHidden ? "Hiện mật khẩu" : "Ẩn mật khẩu"}
          >
            <Ionicons
              name={isHidden ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="#64748b"
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
