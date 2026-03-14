import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

type ServiceRequest = {
  id: string;
  problem_type: string;
  status: string;
  urgency: string;
  proposals_count: number;
  created_at: string;
  categories: { name: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  in_proposals: 'Con propuestas',
  assigned: 'Asignado',
  in_progress: 'En progreso',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const URGENCY_COLORS: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-600',
  urgent: 'bg-orange-100 text-orange-600',
  emergency: 'bg-red-100 text-red-600',
};

export default function ClientHomeScreen() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Refetch when screen gets focus (e.g. after creating a request)
  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [])
  );

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('client-requests')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'service_requests',
        filter: `client_id=eq.${user?.id}`,
      }, fetchRequests)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchRequests() {
    const { data } = await supabase
      .from('service_requests')
      .select('*, categories(name)')
      .eq('client_id', user?.id)
      .in('status', ['open', 'in_proposals', 'assigned', 'in_progress'])
      .order('created_at', { ascending: false });

    setRequests(data ?? []);
    setLoading(false);
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 pt-14 pb-6">
        <Text className="text-sm font-body text-gray-500">Hola,</Text>
        <Text className="text-2xl font-heading text-secondary">{user?.name ?? 'Bienvenido'} 👋</Text>
      </View>

      {/* CTA principal */}
      <View className="px-6 pt-6">
        <TouchableOpacity
          className="bg-primary rounded-card p-6 flex-row items-center justify-between"
          onPress={() => router.push('/(client)/new-request')}
        >
          <View>
            <Text className="text-white font-heading text-lg">¿Necesitás ayuda?</Text>
            <Text className="text-white/80 font-body text-sm mt-1">
              Publicá tu pedido y recibí propuestas
            </Text>
          </View>
          <Text className="text-4xl">🔧</Text>
        </TouchableOpacity>
      </View>

      {/* Pedidos activos */}
      <View className="px-6 pt-6">
        <Text className="text-lg font-heading text-secondary mb-4">Tus pedidos activos</Text>

        {loading ? (
          <ActivityIndicator color="#FF6B1A" />
        ) : requests.length === 0 ? (
          <View className="bg-white rounded-card p-6 items-center">
            <Text className="text-4xl mb-3">📋</Text>
            <Text className="text-base font-body-medium text-gray-600 text-center">
              No tenés pedidos activos
            </Text>
            <Text className="text-sm font-body text-gray-400 text-center mt-1">
              Publicá tu primer pedido y conectate con profesionales
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {requests.map((req) => (
              <TouchableOpacity
                key={req.id}
                className="bg-white rounded-card p-4 shadow-sm"
                onPress={() => router.push(`/(client)/request/${req.id}`)}
              >
                <View className="flex-row items-start justify-between mb-2">
                  <Text className="font-body-medium text-secondary text-base flex-1 mr-2">
                    {req.categories?.name ?? 'Servicio'}
                  </Text>
                  <View className="bg-primary/10 px-2 py-1 rounded-full">
                    <Text className="text-xs text-primary font-body-medium">
                      {STATUS_LABELS[req.status] ?? req.status}
                    </Text>
                  </View>
                </View>

                <Text className="font-body text-gray-600 text-sm" numberOfLines={2}>
                  {req.problem_type}
                </Text>

                <View className="flex-row items-center justify-between mt-3">
                  <View className={`px-2 py-1 rounded-full ${URGENCY_COLORS[req.urgency]}`}>
                    <Text className="text-xs font-body-medium capitalize">{req.urgency}</Text>
                  </View>
                  {req.proposals_count > 0 && (
                    <Text className="text-xs font-body text-primary">
                      {req.proposals_count} propuesta{req.proposals_count !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View className="h-8" />
    </ScrollView>
  );
}
