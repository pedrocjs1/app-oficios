import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useFonts, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import '../global.css';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Poppins_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
  });

  const { setSession, setUser } = useAuthStore();

  // Ocultar splash cuando carguen las fuentes (o si hay error)
  useEffect(() => {
    if (fontsLoaded || fontError) {
      setAppReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Fallback: si las fuentes se cuelgan en Expo Go, mostrar la app igual después de 2s
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Escuchar cambios de sesión de Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
    });

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
    return null;
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
  const { setUser } = useAuthStore.getState();

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (data) {
    setUser(data);
    // Redirigir según el rol
    if (data.role === 'professional' || data.role === 'both') {
      router.replace('/(professional)');
    } else {
      router.replace('/(client)');
    }
  }
}
