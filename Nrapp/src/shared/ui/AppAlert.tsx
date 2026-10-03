import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";

type AlertButtonStyle = "default" | "cancel" | "destructive";

export type AppAlertButton = {
  text?: string;
  onPress?: () => void | Promise<void>;
  style?: AlertButtonStyle;
};

type AlertVariant = "success" | "error" | "warning" | "info";

type AlertPayload = {
  id: number;
  title: string;
  message?: string;
  buttons?: AppAlertButton[];
};

type IoniconName = ComponentProps<typeof Ionicons>["name"];
type AlertListener = (payload: AlertPayload) => void;

const listeners = new Set<AlertListener>();
let nextAlertId = 0;

export const AppAlert = {
  alert(title: string, message?: string, buttons?: AppAlertButton[]) {
    const payload: AlertPayload = {
      id: ++nextAlertId,
      title,
      message,
      buttons,
    };
    listeners.forEach((listener) => listener(payload));
  },
};

const normalizeTitle = (title: string) =>
  title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();

const getVariant = (title: string): AlertVariant => {
  const normalized = normalizeTitle(title);
  if (normalized.includes("loi")) return "error";
  if (
    normalized.includes("thanh cong") ||
    normalized.includes("da tao") ||
    normalized.includes("hoan tat")
  ) {
    return "success";
  }
  if (
    normalized.includes("xac nhan") ||
    normalized.includes("dang xuat") ||
    normalized.includes("xoa")
  ) {
    return "warning";
  }
  return "info";
};

const variantStyles: Record<
  AlertVariant,
  { icon: IoniconName; color: string; background: string; button: string }
> = {
  success: {
    icon: "checkmark-circle",
    color: "#059669",
    background: "#ecfdf5",
    button: "#059669",
  },
  error: {
    icon: "close-circle",
    color: "#dc2626",
    background: "#fef2f2",
    button: "#dc2626",
  },
  warning: {
    icon: "warning",
    color: "#d97706",
    background: "#fffbeb",
    button: "#dc2626",
  },
  info: {
    icon: "information-circle",
    color: "#2563eb",
    background: "#eff6ff",
    button: "#2563eb",
  },
};

export function AppAlertHost() {
  const [currentAlert, setCurrentAlert] = useState<AlertPayload | null>(null);
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const listener: AlertListener = (payload) => setCurrentAlert(payload);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!currentAlert) return;
    entrance.setValue(0);
    Animated.spring(entrance, {
      toValue: 1,
      damping: 16,
      stiffness: 190,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [currentAlert, entrance]);

  const variant = useMemo(
    () => getVariant(currentAlert?.title || ""),
    [currentAlert?.title],
  );
  const visual = variantStyles[variant];
  const buttons =
    currentAlert?.buttons && currentAlert.buttons.length > 0
      ? currentAlert.buttons
      : [{ text: "Đã hiểu" }];

  const dismiss = (button?: AppAlertButton) => {
    setCurrentAlert(null);
    button?.onPress?.();
  };

  const dismissFromBack = () => {
    const cancelButton = buttons.find((button) => button.style === "cancel");
    dismiss(cancelButton);
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={dismissFromBack}
      statusBarTranslucent
      transparent
      visible={Boolean(currentAlert)}
    >
      <View className="flex-1 items-center justify-center bg-black/55 px-5">
        <Animated.View
          className="w-full overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-2xl"
          style={{
            maxWidth: 390,
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
              {
                scale: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.94, 1],
                }),
              },
            ],
          }}
        >
          <View className="items-center px-6 pb-5 pt-7">
            <View
              className="mb-4 h-16 w-16 items-center justify-center rounded-3xl"
              style={{ backgroundColor: visual.background }}
            >
              <Ionicons name={visual.icon} size={34} color={visual.color} />
            </View>
            <Text className="text-center text-xl font-black tracking-tight text-slate-900">
              {currentAlert?.title}
            </Text>
            {currentAlert?.message ? (
              <Text className="mt-2 text-center text-sm leading-6 text-slate-500">
                {currentAlert.message}
              </Text>
            ) : null}
          </View>

          <View
            className={`border-t border-slate-100 px-5 py-4 ${
              buttons.length > 1 ? "flex-row" : ""
            }`}
          >
            {buttons.map((button, index) => {
              const isCancel = button.style === "cancel";
              const isDestructive = button.style === "destructive";
              const backgroundColor = isCancel
                ? "#f1f5f9"
                : isDestructive
                  ? "#dc2626"
                  : visual.button;

              return (
                <Pressable
                  accessibilityRole="button"
                  className={`min-h-12 items-center justify-center rounded-2xl px-4 active:opacity-80 ${
                    buttons.length > 1 ? "flex-1" : "w-full"
                  } ${index > 0 ? "ml-3" : ""}`}
                  key={`${button.text || "button"}-${index}`}
                  onPress={() => dismiss(button)}
                  style={{ backgroundColor }}
                >
                  <Text
                    className={`text-sm font-black ${
                      isCancel ? "text-slate-700" : "text-white"
                    }`}
                  >
                    {button.text || "Đồng ý"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
