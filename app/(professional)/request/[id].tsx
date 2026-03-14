import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Dimensions,
  FlatList,
  StatusBar,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, SHADOWS, RADIUS } from '@/constants/theme';
import { SafeImage } from '@/components/SafeImage';

type ServiceRequest = {
  id: string;
  problem_type: string;
  description: string | null;
  urgency: string;
  photos: any;
  proposals_count: number;
  max_proposals: number;
  categories: { name: string } | null;
};

const ETA_OPTIONS = ['Hoy', 'Mañana', 'En 2 horas', 'En menos de 1 hora', 'Esta semana'];
const { width: SCREEN_WIDTH } = Dimensions.get('window');

function parsePhotos(photos: any): string[] {
  if (!photos) return [];
  // Supabase returns JSONB as a parsed JS array, not a string
  if (Array.isArray(photos)) {
    return photos.filter((url: any) => typeof url === 'string' && url.length > 0);
  }
  // Fallback: if somehow it comes as a string, parse it
  if (typeof photos === 'string') {
    try {
      const parsed = JSON.parse(photos);
      return Array.isArray(parsed) ? parsed.filter((url: any) => typeof url === 'string' && url.length > 0) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getUrgencyLabel(urgency: string) {
  switch (urgency) {
    case 'emergency': return 'Emergencia';
    case 'urgent': return 'Urgente';
    default: return 'Normal';
  }
}

function getUrgencyColor(urgency: string) {
  switch (urgency) {
    case 'emergency': return COLORS.danger;
    case 'urgent': return COLORS.warning;
    default: return COLORS.success;
  }
}

export default function ProfessionalRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [eta, setEta] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyProposed, setAlreadyProposed] = useState(false);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);

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
      .select('id, balance_due, status, verified')
      .eq('user_id', user?.id)
      .single();

    if (!prof) {
      setSubmitting(false);
      Alert.alert('Error', 'No se encontró tu perfil profesional');
      return;
    }

    if (prof.status !== 'verified' || !prof.verified) {
      setSubmitting(false);
      Alert.alert(
        'Perfil no verificado',
        'Tu perfil debe estar verificado para enviar propuestas. Esperá la aprobación del equipo de OficioYa.'
      );
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
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color={COLORS.secondary} size="large" />
      </View>
    );
  }

  if (!request) return null;

  const spotsLeft = request.max_proposals - request.proposals_count;
  const photoUrls = parsePhotos(request.photos);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" />

      <ScrollView style={{ flex: 1 }}>
        {/* Gradient Header */}
        <LinearGradient
          colors={[COLORS.secondary, '#2D4A5E']}
          style={[styles.gradientHeader, { paddingTop: insets.top + 8 }]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBackButton}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerCategory}>
              {request.categories?.name}
            </Text>
            <Text style={styles.headerLabel}>Detalle del pedido</Text>
          </View>
        </LinearGradient>

        {/* Photos carousel */}
        {photoUrls.length > 0 && (
          <View>
            <FlatList
              data={photoUrls}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setFullscreenPhoto(item)}
                >
                  <SafeImage
                    uri={item}
                    style={{ width: SCREEN_WIDTH, height: 240 }}
                    fallbackText="Sin foto"
                  />
                </TouchableOpacity>
              )}
            />
            {photoUrls.length > 1 && (
              <View style={styles.dotsRow}>
                {photoUrls.map((_, i) => (
                  <View
                    key={i}
                    style={styles.dot}
                  />
                ))}
              </View>
            )}
            <Text style={styles.photoHint}>
              Tocá para ampliar · {photoUrls.length} foto{photoUrls.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        <View style={{ padding: 16, gap: 16 }}>
          {/* Request detail card */}
          <View style={[styles.detailCard, SHADOWS.md]}>
            <Text style={styles.detailCardTitle}>Detalle del pedido</Text>

            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="build-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Problema</Text>
                <Text style={styles.detailValue}>{request.problem_type}</Text>
              </View>
            </View>

            {request.description && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconContainer}>
                  <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Descripción</Text>
                  <Text style={styles.detailValue}>{request.description}</Text>
                </View>
              </View>
            )}

            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="time-outline" size={18} color={getUrgencyColor(request.urgency)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Urgencia</Text>
                <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(request.urgency) + '18' }]}>
                  <Text style={[styles.urgencyBadgeText, { color: getUrgencyColor(request.urgency) }]}>
                    {getUrgencyLabel(request.urgency)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="people-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Lugares disponibles</Text>
                <Text style={styles.detailValue}>
                  {spotsLeft} de {request.max_proposals}
                </Text>
              </View>
            </View>
          </View>

          {/* Already proposed state */}
          {alreadyProposed ? (
            <View style={[styles.stateCard, { backgroundColor: COLORS.successLight, borderColor: COLORS.success + '40' }]}>
              <View style={[styles.stateIconContainer, { backgroundColor: COLORS.success + '20' }]}>
                <Ionicons name="checkmark-circle" size={36} color={COLORS.success} />
              </View>
              <Text style={[styles.stateTitle, { color: COLORS.success }]}>
                Ya enviaste una propuesta
              </Text>
              <Text style={[styles.stateSubtitle, { color: COLORS.success }]}>
                Esperá la respuesta del cliente
              </Text>
            </View>
          ) : spotsLeft <= 0 ? (
            <View style={[styles.stateCard, { backgroundColor: COLORS.borderLight, borderColor: COLORS.border }]}>
              <View style={[styles.stateIconContainer, { backgroundColor: COLORS.textMuted + '20' }]}>
                <Ionicons name="lock-closed" size={36} color={COLORS.textMuted} />
              </View>
              <Text style={[styles.stateTitle, { color: COLORS.textSecondary }]}>
                Máximo de propuestas alcanzado
              </Text>
              <Text style={[styles.stateSubtitle, { color: COLORS.textMuted }]}>
                Este pedido ya no acepta más propuestas
              </Text>
            </View>
          ) : (
            /* Proposal form */
            <View style={[styles.formCard, SHADOWS.md]}>
              <Text style={styles.formTitle}>Tu propuesta</Text>

              {/* Price input */}
              <View>
                <Text style={styles.inputLabel}>Precio (ARS) *</Text>
                <View style={styles.priceInputContainer}>
                  <View style={styles.pricePrefix}>
                    <Text style={styles.pricePrefixText}>$</Text>
                  </View>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="15.000"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
              </View>

              {/* ETA pills */}
              <View>
                <Text style={styles.inputLabel}>Disponibilidad *</Text>
                <View style={styles.pillsContainer}>
                  {ETA_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.pill,
                        eta === opt && styles.pillSelected,
                      ]}
                      onPress={() => setEta(opt)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          eta === opt && styles.pillTextSelected,
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Message textarea */}
              <View>
                <Text style={styles.inputLabel}>Mensaje (opcional)</Text>
                <TextInput
                  style={styles.textarea}
                  placeholder="Contale al cliente tu experiencia o algo relevante..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  textAlignVertical="top"
                  value={message}
                  onChangeText={setMessage}
                  maxLength={300}
                />
                <Text style={styles.charCount}>{message.length}/300</Text>
              </View>

              {/* Submit button */}
              <TouchableOpacity
                style={[styles.submitButton, submitting && { opacity: 0.7 }]}
                onPress={submitProposal}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="send" size={18} color={COLORS.white} />
                    <Text style={styles.submitButtonText}>Enviar propuesta</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Fullscreen photo modal */}
      <Modal visible={!!fullscreenPhoto} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setFullscreenPhoto(null)}
          >
            <Ionicons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>
          {fullscreenPhoto && (
            <Image
              source={{ uri: fullscreenPhoto }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = {
  gradientHeader: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerCategory: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  headerLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  dotsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 8,
    backgroundColor: COLORS.card,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  photoHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center' as const,
    paddingBottom: 8,
    backgroundColor: COLORS.card,
  },
  detailCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 20,
  },
  detailCardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.secondary,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500' as const,
    lineHeight: 21,
  },
  urgencyBadge: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginTop: 2,
  },
  urgencyBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  stateCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center' as const,
  },
  stateIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 16,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    marginBottom: 4,
  },
  stateSubtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 20,
    gap: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.secondary,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.secondary,
    marginBottom: 8,
  },
  priceInputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    overflow: 'hidden' as const,
  },
  pricePrefix: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  pricePrefixText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.secondary,
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  pillsContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  pillSelected: {
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.secondary + '10',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: COLORS.textSecondary,
  },
  pillTextSelected: {
    color: COLORS.secondary,
    fontWeight: '600' as const,
  },
  textarea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    height: 100,
    textAlignVertical: 'top' as const,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'right' as const,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  modalClose: {
    position: 'absolute' as const,
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
