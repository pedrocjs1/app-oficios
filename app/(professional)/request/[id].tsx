import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

type ServiceRequest = {
  id: string;
  problem_type: string;
  description: string | null;
  urgency: string;
  photos: string[];
  proposals_count: number;
  max_proposals: number;
  categories: { name: string } | null;
};

const ETA_OPTIONS = ['Hoy', 'Mañana', 'En 2 horas', 'En menos de 1 hora', 'Esta semana'];

export default function ProfessionalRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [eta, setEta] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyProposed, setAlreadyProposed] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: req }, { data: prof }] = await Promise.all([
        supabase
          .from('service_requests')
          .select('*, categories(name)')
          .eq('id', id)
          .single(),
        supabase
          .from('professionals')
          .select('id')
          .eq('user_id', user?.id)
          .single(),
      ]);

      setRequest(req);

      if (prof) {
        const { data: existing } = await supabase
          .from('proposals')
          .select('id')
          .eq('request_id', id)
          .eq('professional_id', prof.id)
          .single();
        setAlreadyProposed(!!existing);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  async function submitProposal() {
    if (!price || !eta) {
      Alert.alert('Error', 'Completá el precio y la disponibilidad');
      return;
    }

    const numPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(numPrice) || numPrice <= 0) {
      Alert.alert('Error', 'El precio debe ser un número válido');
      return;
    }

    setSubmitting(true);

    const { data: prof } = await supabase
      .from('professionals')
      .select('id, balance_due')
      .eq('user_id', user?.id)
      .single();

    if (!prof) {
      setSubmitting(false);
      Alert.alert('Error', 'No se encontró tu perfil profesional');
      return;
    }

    if (prof.balance_due > 0) {
      setSubmitting(false);
      Alert.alert(
        'Deuda pendiente',
        'Tenés una deuda pendiente. Regularizá tu balance para enviar propuestas.',
        [{ text: 'Ver ganancias', onPress: () => router.push('/(professional)/earnings') }]
      );
      return;
    }

    const { error } = await supabase.from('proposals').insert({
      request_id: id,
      professional_id: prof.id,
      price: numPrice,
      message: message || null,
      estimated_arrival: eta,
    });

    setSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert('¡Propuesta enviada!', 'El cliente será notificado.', [
      { text: 'Volver', onPress: () => router.back() },
    ]);
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#1A3C5E" size="large" />
      </View>
    );
  }

  if (!request) return null;

  const spotsLeft = request.max_proposals - request.proposals_count;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-white px-6 pt-14 pb-4 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-secondary font-body">← Volver</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-heading text-secondary mt-3">
          {request.categories?.name}
        </Text>
      </View>

      <View className="px-6 pt-6 gap-4">
        {/* Detalle del pedido */}
        <View className="bg-white rounded-card p-5">
          <Text className="font-heading text-secondary text-base mb-2">Detalle del pedido</Text>
          <Text className="font-body-medium text-gray-700">{request.problem_type}</Text>
          {request.description && (
            <Text className="font-body text-gray-500 text-sm mt-2">{request.description}</Text>
          )}
          <View className="flex-row items-center mt-3 gap-3">
            <View className="bg-gray-100 px-3 py-1 rounded-full">
              <Text className="text-xs font-body-medium text-gray-600 capitalize">
                {request.urgency}
              </Text>
            </View>
            <Text className="text-xs font-body text-gray-400">
              {spotsLeft} lugar{spotsLeft !== 1 ? 'es' : ''} disponible{spotsLeft !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {alreadyProposed ? (
          <View className="bg-green-50 border border-green-200 rounded-card p-5 items-center">
            <Text className="text-2xl mb-2">✅</Text>
            <Text className="font-body-medium text-green-700 text-center">
              Ya enviaste una propuesta para este pedido
            </Text>
            <Text className="font-body text-sm text-green-600 text-center mt-1">
              Esperá la respuesta del cliente
            </Text>
          </View>
        ) : spotsLeft <= 0 ? (
          <View className="bg-gray-50 border border-gray-200 rounded-card p-5 items-center">
            <Text className="text-2xl mb-2">🔒</Text>
            <Text className="font-body-medium text-gray-600 text-center">
              Este pedido ya recibió el máximo de propuestas
            </Text>
          </View>
        ) : (
          /* Formulario de propuesta */
          <View className="bg-white rounded-card p-5 gap-4">
            <Text className="font-heading text-secondary text-base">Tu propuesta</Text>

            <View>
              <Text className="text-sm font-body-medium text-secondary mb-1">Precio (ARS) *</Text>
              <TextInput
                className="border border-gray-200 rounded-btn px-4 py-3 text-base font-body"
                placeholder="Ej: 15000"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
            </View>

            <View>
              <Text className="text-sm font-body-medium text-secondary mb-2">
                Disponibilidad *
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {ETA_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    className={`px-3 py-2 rounded-full border ${
                      eta === opt
                        ? 'border-secondary bg-secondary/10'
                        : 'border-gray-200'
                    }`}
                    onPress={() => setEta(opt)}
                  >
                    <Text
                      className={`text-sm font-body-medium ${
                        eta === opt ? 'text-secondary' : 'text-gray-500'
                      }`}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-sm font-body-medium text-secondary mb-1">
                Mensaje (opcional)
              </Text>
              <TextInput
                className="border border-gray-200 rounded-card px-4 py-3 text-sm font-body h-20"
                placeholder="Contale al cliente tu experiencia o algo relevante..."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                value={message}
                onChangeText={setMessage}
                maxLength={300}
              />
            </View>

            <TouchableOpacity
              className="bg-secondary rounded-btn py-4 items-center"
              onPress={submitProposal}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-body-medium text-base">Enviar propuesta</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View className="h-8" />
    </ScrollView>
  );
}
