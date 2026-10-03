import { useAuthSession } from '@/src/features/auth/model/AuthSessionContext';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { getAreaForRole } from "@/src/application/access/roles";
import { APP_ROUTES } from "@/src/application/navigation/routes";

export default function IndexScreen() {
  const { isAuth, loading, user } = useAuthSession();

  useEffect(() => {
    if (loading) return;
    if (isAuth) {
      router.replace(APP_ROUTES[getAreaForRole(user?.role)].home);
    } else {
      router.replace('/(auth)/login');
    }
  }, [isAuth, loading, user?.role]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
