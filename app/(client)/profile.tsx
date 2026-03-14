import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, Image, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { router, useFocusEffect } from 'expo-router';

export default function ClientProfileScreen() {
  const { user, setSession, setUser } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [user?.id])
  );

  async function refreshProfile() {
    if (!user?.id) return;
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) setUser(data);
  }

  async function onRefresh() {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  }

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
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B1A']} tintColor="#FF6B1A" />
      }
    >
      <View className="bg-white px-6 pt-14 pb-6 border-b border-gray-100">
        <Text className="text-2xl font-heading text-secondary">Mi perfil</Text>
      </View>

      {/* Avatar y nombre */}
      <View className="bg-white mx-4 mt-4 rounded-card p-6 items-center shadow-sm">
        {user?.avatar_url ? (
          <Image
            source={{ uri: user.avatar_url }}
            className="w-20 h-20 rounded-full mb-3"
          />
        ) : (
          <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-3">
            <Text className="text-3xl font-heading text-primary">
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
        )}
        <Text className="text-xl font-heading text-secondary">{user?.name}</Text>
        <Text className="text-sm font-body text-gray-500 mt-1">{user?.email}</Text>
        {user?.phone && (
          <Text className="text-sm font-body text-gray-500">{user.phone}</Text>
        )}
      </View>

      {/* Acciones */}
      <View className="mx-4 mt-4 gap-3">
        <TouchableOpacity
          className="bg-white rounded-card p-4 flex-row items-center shadow-sm"
          onPress={() => router.push('/(client)/edit-profile')}
        >
          <Text className="flex-1 font-body-medium text-secondary">Editar perfil</Text>
          <Text className="text-gray-400">→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-white rounded-card p-4 flex-row items-center shadow-sm"
          onPress={() => Alert.alert('Próximamente', 'Esta función estará disponible pronto.')}
        >
          <Text className="flex-1 font-body-medium text-secondary">Mis reseñas</Text>
          <Text className="text-gray-400">→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-white rounded-card p-4 flex-row items-center shadow-sm"
          onPress={() => Alert.alert('Próximamente', 'Esta función estará disponible pronto.')}
        >
          <Text className="flex-1 font-body-medium text-secondary">Historial de pedidos</Text>
          <Text className="text-gray-400">→</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
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
