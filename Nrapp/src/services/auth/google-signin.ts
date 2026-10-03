import { GoogleSignin } from "@react-native-google-signin/google-signin";

// Client IDs are public identifiers. Keep the environment variable as the
// primary source, with a safe fallback so a production APK cannot reach the
// sign-in flow without configuring the native client.
const DEFAULT_GOOGLE_WEB_CLIENT_ID =
  "779200897119-2m0amhfd2prcpuuec18502f14vlfbh3f.apps.googleusercontent.com";

export function configureGoogleSignin() {
  const webClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
    DEFAULT_GOOGLE_WEB_CLIENT_ID;

  GoogleSignin.configure({ webClientId });
}
