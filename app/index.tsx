import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const { session } = useAuthStore();

  // Si hay sesión activa, el listener en _layout.tsx se encarga de redirigir
  // al perfil correcto (client/professional). Acá solo manejamos el caso inicial.
  if (session) {
    return null; // _layout.tsx onAuthStateChange va a redirigir
  }

  return <Redirect href="/(auth)/login" />;
}
