import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import '../global.css';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const { setSession, setUser } = useAuthStore();

  // Inicializar la app: ocultar splash y marcar como lista
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
      } catch {}
      setAppReady(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Escuchar cambios de sesión de Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
    }).catch(() => {});

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        router.replace('/(auth)/login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!appReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FF6B1A' }}>
        <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 16 }}>
          OficioYa
        </Text>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(client)" options={{ headerShown: false }} />
      <Stack.Screen name="(professional)" options={{ headerShown: false }} />
    </Stack>
  );
}

async function fetchUserProfile(userId: string) {
  try {
    const { setUser } = useAuthStore.getState();

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setUser(data);
      if (data.role === 'professional' || data.role === 'both') {
        router.replace('/(professional)');
      } else {
        router.replace('/(client)');
      }
    }
  } catch (e) {
    console.warn('Error fetching user profile:', e);
  }
}
