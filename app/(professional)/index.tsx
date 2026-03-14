import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

type ServiceRequest = {
  id: string;
  problem_type: string;
  description: string | null;
  urgency: string;
  proposals_count: number;
  max_proposals: number;
  created_at: string;
  categories: { name: string } | null;
};

const URGENCY_BADGES: Record<string, { label: string; className: string }> = {
  normal: { label: 'Normal', className: 'bg-gray-100 text-gray-600' },
  urgent: { label: 'Urgente', className: 'bg-orange-100 text-orange-600' },
  emergency: { label: '🚨 Emergencia', className: 'bg-red-100 text-red-600' },
};

export default function ProfessionalFeedScreen() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
      checkVerificationStatus();
    }, [])
  );

  async function checkVerificationStatus() {
    if (!user?.id) return;
    const { data } = await supabase
      .from('professionals')
      .select('status')
      .eq('user_id', user.id)
      .single();
    setVerificationStatus(data?.status ?? null);
  }

  useEffect(() => {
    const channel = supabase
      .channel('professional-feed')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'service_requests',
      }, fetchRequests)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchRequests() {
    const { data, error } = await supabase
      .from('service_requests')
      .select('*, categories(name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching requests:', error);
    }
    setRequests(data ?? []);
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A3C5E']} tintColor="#1A3C5E" />
      }
    >
      <View className="bg-secondary px-6 pt-14 pb-6">
        <Text className="text-sm font-body text-white/70">Hola,</Text>
        <Text className="text-2xl font-heading text-white">{user?.name ?? 'Profesional'} 👷</Text>
        <Text className="text-sm font-body text-white/70 mt-1">
          {requests.length} pedido{requests.length !== 1 ? 's' : ''} disponible{requests.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Pending verification banner */}
      {verificationStatus === 'pending_verification' && (
        <View className="mx-6 mt-4 bg-yellow-50 border border-yellow-200 rounded-card p-4">
          <Text className="font-body-medium text-yellow-800 text-sm">
            Tu perfil está en revisión
          </Text>
          <Text className="font-body text-yellow-700 text-xs mt-1">
            Estamos verificando tus datos. Te notificaremos cuando sea aprobado. Mientras tanto, podés ver los pedidos disponibles.
          </Text>
        </View>
      )}

      {verificationStatus === 'suspended' && (
        <View className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-card p-4">
          <Text className="font-body-medium text-red-800 text-sm">
            Tu cuenta está suspendida
          </Text>
          <Text className="font-body text-red-700 text-xs mt-1">
            Contactá a soporte para más información.
          </Text>
        </View>
      )}

      <View className="px-6 pt-6">
        {loading ? (
          <ActivityIndicator color="#1A3C5E" size="large" />
        ) : requests.length === 0 ? (
          <View className="bg-white rounded-card p-8 items-center">
            <Text className="text-4xl mb-3">🔍</Text>
            <Text className="text-base font-body-medium text-gray-600 text-center">
              No hay pedidos disponibles
            </Text>
            <Text className="text-sm font-body text-gray-400 text-center mt-1">
              Te notificaremos cuando lleguen nuevos pedidos en tu zona
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {requests.map((req) => {
              const badge = URGENCY_BADGES[req.urgency] ?? URGENCY_BADGES.normal;
              const spotsLeft = req.max_proposals - req.proposals_count;

              return (
                <TouchableOpacity
                  key={req.id}
                  className="bg-white rounded-card p-5 shadow-sm"
                  onPress={() => router.push(`/(professional)/request/${req.id}`)}
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <Text className="font-heading text-secondary text-base flex-1 mr-2">
                      {req.categories?.name ?? 'Servicio'}
                    </Text>
                    <View className={`px-2 py-1 rounded-full ${badge.className}`}>
                      <Text className="text-xs font-body-medium">{badge.label}</Text>
                    </View>
                  </View>

                  <Text className="font-body-medium text-gray-700 text-sm">{req.problem_type}</Text>

                  {req.description && (
                    <Text className="font-body text-gray-500 text-sm mt-1" numberOfLines={2}>
                      {req.description}
                    </Text>
                  )}

                  <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <Text className="text-xs font-body text-gray-400">
                      {new Date(req.created_at).toLocaleDateString('es-AR')}
                    </Text>
                    <Text className="text-xs font-body-medium text-secondary">
                      {spotsLeft > 0
                        ? `Quedan ${spotsLeft} lugar${spotsLeft !== 1 ? 'es' : ''}`
                        : 'Sin lugares'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <View className="h-8" />
    </ScrollView>
  );
}
