import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Proposal = {
  id: string;
  price: number;
  message: string | null;
  estimated_arrival: string | null;
  professionals: {
    rating_avg: number;
    rating_count: number;
    jobs_completed: number;
  } | null;
};

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    fetchProposals();

    // Suscribirse a nuevas propuestas en tiempo real
    const channel = supabase
      .channel(`request-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'proposals',
        filter: `request_id=eq.${id}`,
      }, fetchProposals)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function fetchProposals() {
    const { data } = await supabase
      .from('proposals')
      .select('*, professionals(rating_avg, rating_count, jobs_completed)')
      .eq('request_id', id)
      .eq('status', 'pending')
      .order('price', { ascending: true });

    setProposals(data ?? []);
    setLoading(false);
  }

  async function acceptProposal(proposal: Proposal) {
    Alert.alert(
      'Aceptar propuesta',
      `¿Querés aceptar esta propuesta por $${proposal.price.toLocaleString('es-AR')}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          onPress: async () => {
            setAccepting(proposal.id);

            // Crear el job
            const { data: job, error } = await supabase
              .from('jobs')
              .insert({
                request_id: id,
                proposal_id: proposal.id,
                // client_id y professional_id se obtienen de la propuesta en el trigger
                agreed_price: proposal.price,
              })
              .select()
              .single();

            if (error) {
              setAccepting(null);
              Alert.alert('Error', 'No se pudo aceptar la propuesta');
              return;
            }

            // Actualizar estados
            await Promise.all([
              supabase.from('proposals').update({ status: 'accepted' }).eq('id', proposal.id),
              supabase.from('proposals').update({ status: 'rejected' }).eq('request_id', id).neq('id', proposal.id),
              supabase.from('service_requests').update({ status: 'assigned' }).eq('id', id),
            ]);

            setAccepting(null);
            Alert.alert(
              '¡Propuesta aceptada!',
              'Se abrió el chat con el profesional para coordinar el trabajo.',
              [{ text: 'Ir al chat', onPress: () => router.replace(`/(client)/job/${job.id}`) }]
            );
          },
        },
      ]
    );
  }

  function renderStars(rating: number) {
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-white px-6 pt-14 pb-4 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-secondary font-body">← Volver</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-heading text-secondary mt-3">Propuestas recibidas</Text>
        <Text className="text-sm font-body text-gray-500 mt-1">
          Los profesionales son anónimos hasta que aceptés una propuesta
        </Text>
      </View>

      <View className="px-6 pt-6">
        {loading ? (
          <ActivityIndicator color="#FF6B1A" size="large" />
        ) : proposals.length === 0 ? (
          <View className="bg-white rounded-card p-8 items-center">
            <Text className="text-4xl mb-3">⏳</Text>
            <Text className="text-base font-body-medium text-gray-600 text-center">
              Aún no hay propuestas
            </Text>
            <Text className="text-sm font-body text-gray-400 text-center mt-1">
              Los profesionales cercanos están siendo notificados
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {proposals.map((proposal) => (
              <View key={proposal.id} className="bg-white rounded-card p-5 shadow-sm">
                {/* Precio */}
                <Text className="text-3xl font-heading text-primary mb-3">
                  ${proposal.price.toLocaleString('es-AR')}
                </Text>

                {/* Rating y trabajos */}
                <View className="flex-row items-center gap-4 mb-3">
                  <View>
                    <Text className="text-yellow-500 text-base">
                      {renderStars(proposal.professionals?.rating_avg ?? 0)}
                    </Text>
                    <Text className="text-xs font-body text-gray-400">
                      {proposal.professionals?.rating_count ?? 0} reseñas
                    </Text>
                  </View>
                  <View className="bg-gray-100 px-3 py-1 rounded-full">
                    <Text className="text-xs font-body-medium text-gray-600">
                      {proposal.professionals?.jobs_completed ?? 0} trabajos
                    </Text>
                  </View>
                </View>

                {/* Disponibilidad */}
                {proposal.estimated_arrival && (
                  <View className="flex-row items-center mb-3">
                    <Text className="text-sm font-body text-gray-500">
                      🕐 Disponibilidad: {proposal.estimated_arrival}
                    </Text>
                  </View>
                )}

                {/* Mensaje */}
                {proposal.message && (
                  <Text className="text-sm font-body text-gray-600 mb-4 italic">
                    "{proposal.message}"
                  </Text>
                )}

                <TouchableOpacity
                  className="bg-primary rounded-btn py-3 items-center"
                  onPress={() => acceptProposal(proposal)}
                  disabled={accepting === proposal.id}
                >
                  {accepting === proposal.id ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-body-medium">Aceptar propuesta</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="h-8" />
    </ScrollView>
  );
}
