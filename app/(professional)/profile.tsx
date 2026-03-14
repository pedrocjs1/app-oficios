import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { router } from 'expo-router';

export default function ProfessionalProfileScreen() {
  const { user, setSession, setUser } = useAuthStore();

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-secondary px-6 pt-14 pb-6">
        <Text className="text-2xl font-heading text-white">Mi perfil</Text>
      </View>

      <View className="bg-white mx-4 mt-4 rounded-card p-6 items-center shadow-sm">
        <View className="w-20 h-20 rounded-full bg-secondary/10 items-center justify-center mb-3">
          <Text className="text-3xl font-heading text-secondary">
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text className="text-xl font-heading text-secondary">{user?.name}</Text>
        <Text className="text-sm font-body text-gray-500 mt-1">{user?.email}</Text>
        <View className="mt-2 bg-secondary/10 px-3 py-1 rounded-full">
          <Text className="text-xs font-body-medium text-secondary">Profesional</Text>
        </View>
      </View>

      <View className="mx-4 mt-4 gap-3">
        <TouchableOpacity
          className="bg-white rounded-card p-4 flex-row items-center"
          onPress={() => router.push('/(professional)/edit-profile')}
        >
          <Text className="flex-1 font-body-medium text-secondary">Editar perfil</Text>
          <Text className="text-gray-400">→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-white rounded-card p-4 flex-row items-center"
          onPress={() => {/* TODO */}}
        >
          <Text className="flex-1 font-body-medium text-secondary">Mis categorías y zonas</Text>
          <Text className="text-gray-400">→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-white rounded-card p-4 flex-row items-center"
          onPress={() => {/* TODO */}}
        >
          <Text className="flex-1 font-body-medium text-secondary">Mis reseñas</Text>
          <Text className="text-gray-400">→</Text>
        </TouchableOpacity>
      </View>

      <View className="mx-4 mt-6">
        <TouchableOpacity
          className="border border-red-200 rounded-card p-4 items-center"
          onPress={handleLogout}
        >
          <Text className="text-red-500 font-body-medium">Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      <View className="h-8" />
    </ScrollView>
  );
}
