import { AuthSessionProvider } from "@/src/features/auth/model/AuthSessionContext";
import { ChatSocketProvider } from "@/src/features/chat/shared/model/ChatSocketContext";
import { useColorScheme } from "@/src/shared/hooks/useColorScheme";
import { AppAlertHost } from "@/src/shared/ui/AppAlert";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { configureReanimatedLogger, ReanimatedLogLevel } from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <AuthSessionProvider>
        <ChatSocketProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(main)" />
            </Stack>
            <AppAlertHost />
            <StatusBar style="auto" />
          </ThemeProvider>
        </ChatSocketProvider>
      </AuthSessionProvider>
    </SafeAreaProvider>
  );
}
