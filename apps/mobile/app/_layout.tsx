import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { api } from '@/services/api';

let cssLoaded = false;
try {
  require('../global.css');
  cssLoaded = true;
} catch (e) {
  console.warn('NativeWind CSS failed to load, using fallback styles:', e);
}

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const { setSession, setUser, setToken } = useAuthStore();

  // Marcar app como lista inmediatamente (sin depender de SplashScreen)
  useEffect(() => {
    setAppReady(true);

    // Intentar ocultar splash screen si existe
    (async () => {
      try {
        const SplashScreen = require('expo-splash-screen');
        await SplashScreen.hideAsync();
      } catch {}
    })();
  }, []);

  // Escuchar cambios de sesion de Supabase (for realtime + session restore)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const existingToken = useAuthStore.getState().token;
        if (existingToken) {
          fetchUserProfileApi();
        }
      }
    }).catch((e: any) => {
      console.warn('getSession error:', e);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        const existingToken = useAuthStore.getState().token;
        if (existingToken) {
          fetchUserProfileApi();
        }
      } else {
        setUser(null);
        setToken(null);
        try {
          router.replace('/(auth)/login');
        } catch {}
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!appReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FF6B35' }}>
        <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 16 }}>
          OficioYa
        </Text>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F7F8FA' },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(client)" />
      <Stack.Screen name="(professional)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}

async function fetchUserProfileApi() {
  try {
    const { setUser } = useAuthStore.getState();
    const { user } = await api.getMe();

    if (user) {
      setUser(user);
      routeByRole(user.role);
    }
  } catch (e) {
    console.warn('Error fetching user profile via API:', e);
  }
}

function routeByRole(role: string) {
  if (role === 'admin') {
    router.replace('/(admin)');
  } else if (role === 'professional' || role === 'both') {
    router.replace('/(professional)');
  } else {
    router.replace('/(client)');
  }
}
