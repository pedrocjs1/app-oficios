import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

type Professional = {
  balance_due: number;
  jobs_completed: number;
  rating_avg: number;
  rating_count: number;
};

type Payment = {
  id: string;
  amount: number;
  commission_amount: number;
  net_to_professional: number;
  method: string;
  status: string;
  created_at: string;
};

export default function EarningsScreen() {
  const { user } = useAuthStore();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    try {
      const { data: prof, error: profError } = await supabase
        .from('professionals')
        .select('balance_due, jobs_completed, rating_avg, rating_count')
        .eq('user_id', user?.id)
        .single();

      if (profError) {
        console.warn('Error loading professional data:', profError);
        setLoading(false);
        return;
      }

      if (prof) {
        setProfessional(prof);

        const { data: pays } = await supabase
          .from('payments')
          .select('*, jobs!inner(professional_id, professionals!inner(user_id))')
          .order('created_at', { ascending: false })
          .limit(20);

        setPayments(pays ?? []);
      }
    } catch (e) {
      console.warn('Error loading earnings:', e);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function handlePayDebt() {
    Alert.alert(
      'Pagar deuda',
      `Debés $${professional?.balance_due?.toLocaleString('es-AR')} por comisiones de trabajos en efectivo. Redirigiremos a Mercado Pago.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Pagar', onPress: () => { /* TODO: integrar MP */ } },
      ]
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#1A3C5E" size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A3C5E']} tintColor="#1A3C5E" />
      }
    >
      <View className="bg-secondary px-6 pt-14 pb-6">
        <Text className="text-2xl font-heading text-white">Ganancias</Text>
      </View>

      {/* Stats */}
      <View className="flex-row px-4 mt-4 gap-3">
        <View className="flex-1 bg-white rounded-card p-4 items-center shadow-sm">
          <Text className="text-2xl font-heading text-primary">
            {professional?.jobs_completed ?? 0}
          </Text>
          <Text className="text-xs font-body text-gray-500 mt-1 text-center">Trabajos completados</Text>
        </View>
        <View className="flex-1 bg-white rounded-card p-4 items-center shadow-sm">
          <Text className="text-2xl font-heading text-primary">
            {professional?.rating_avg?.toFixed(1) ?? '—'}
          </Text>
          <Text className="text-xs font-body text-gray-500 mt-1 text-center">Rating promedio</Text>
        </View>
        <View className="flex-1 bg-white rounded-card p-4 items-center shadow-sm">
          <Text className="text-2xl font-heading text-primary">
            {professional?.rating_count ?? 0}
          </Text>
          <Text className="text-xs font-body text-gray-500 mt-1 text-center">Reseñas</Text>
        </View>
      </View>

      {/* Deuda */}
      {(professional?.balance_due ?? 0) > 0 && (
        <View className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-card p-5">
          <Text className="font-heading text-red-700 text-base mb-1">Deuda pendiente</Text>
          <Text className="font-body text-sm text-red-600 mb-3">
            Tenés ${professional!.balance_due.toLocaleString('es-AR')} en comisiones por cobrar de trabajos en efectivo.
            Regularizá tu balance para poder enviar nuevas propuestas.
          </Text>
          <TouchableOpacity
            className="bg-red-500 rounded-btn py-3 items-center"
            onPress={handlePayDebt}
          >
            <Text className="text-white font-body-medium">
              Pagar ${professional!.balance_due.toLocaleString('es-AR')} con Mercado Pago
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* No debt message */}
      {(professional?.balance_due ?? 0) === 0 && (
        <View className="mx-4 mt-4 bg-green-50 border border-green-200 rounded-card p-4">
          <Text className="font-body-medium text-green-700 text-center">
            Tu balance está al día ✓
          </Text>
        </View>
      )}

      {/* Historial */}
      <View className="px-4 mt-6">
        <Text className="text-lg font-heading text-secondary mb-3">Historial de pagos</Text>

        {payments.length === 0 ? (
          <View className="bg-white rounded-card p-6 items-center">
            <Text className="text-3xl mb-2">📊</Text>
            <Text className="font-body text-gray-500 text-center">
              Aún no tenés pagos registrados
            </Text>
            <Text className="font-body text-xs text-gray-400 text-center mt-1">
              Los pagos aparecerán acá cuando completes trabajos
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {payments.map((pay) => (
              <View key={pay.id} className="bg-white rounded-card p-4 shadow-sm">
                <View className="flex-row justify-between items-start">
                  <View>
                    <Text className="font-body-medium text-secondary text-base">
                      ${pay.net_to_professional.toLocaleString('es-AR')}
                    </Text>
                    <Text className="text-xs font-body text-gray-400 mt-1">
                      Comisión: ${pay.commission_amount.toLocaleString('es-AR')} ·{' '}
                      {pay.method === 'cash' ? 'Efectivo' : 'Digital'}
                    </Text>
                  </View>
                  <View
                    className={`px-2 py-1 rounded-full ${
                      pay.status === 'released'
                        ? 'bg-green-100'
                        : pay.status === 'held'
                        ? 'bg-yellow-100'
                        : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`text-xs font-body-medium ${
                        pay.status === 'released'
                          ? 'text-green-700'
                          : pay.status === 'held'
                          ? 'text-yellow-700'
                          : 'text-gray-600'
                      }`}
                    >
                      {pay.status === 'released'
                        ? 'Acreditado'
                        : pay.status === 'held'
                        ? 'Retenido'
                        : pay.status}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs font-body text-gray-400 mt-2">
                  {new Date(pay.created_at).toLocaleDateString('es-AR')}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="h-8" />
    </ScrollView>
  );
}
