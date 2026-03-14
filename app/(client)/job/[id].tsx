import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, SHADOWS, RADIUS } from '@/constants/theme';
import { SafeImage } from '@/components/SafeImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Types ──────────────────────────────────────────────────────────────

type Message = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  flagged: boolean;
};

type JobData = {
  id: string;
  status: string;
  agreed_price: number;
  payment_method: string | null;
  professional_photos: string[] | null;
  created_at: string;
  completed_at: string | null;
  confirmed_at: string | null;
  professionals: {
    user_id: string;
    license_number: string | null;
    rating_avg: number;
    rating_count: number;
    jobs_completed: number;
    users: {
      name: string;
      avatar_url: string | null;
    } | null;
  } | null;
  service_requests: {
    problem_type: string | null;
    description: string | null;
    photos: any;
    urgency: string | null;
    categories: {
      name: string;
    } | null;
  } | null;
};

// ── Status helpers ─────────────────────────────────────────────────────

const JOB_STEPS = [
  { key: 'pending_start', label: 'Aceptado', icon: 'checkmark-circle' as const },
  { key: 'in_progress', label: 'En progreso', icon: 'hammer' as const },
  { key: 'completed_by_professional', label: 'Completado', icon: 'construct' as const },
  { key: 'confirmed', label: 'Confirmado', icon: 'shield-checkmark' as const },
];

function getStepIndex(status: string): number {
  const idx = JOB_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

function parsePhotos(photos: any): string[] {
  if (!photos) return [];
  if (Array.isArray(photos)) return photos.filter((p: any) => typeof p === 'string');
  if (typeof photos === 'string') {
    try {
      const parsed = JSON.parse(photos);
      if (Array.isArray(parsed)) return parsed.filter((p: any) => typeof p === 'string');
    } catch {
      return [photos];
    }
  }
  return [];
}

// ── Component ──────────────────────────────────────────────────────────

export default function ClientJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  // State
  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'detalles' | 'chat'>('detalles');
  const [hasReview, setHasReview] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Rating modal
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Photo preview
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const chatScrollRef = useRef<ScrollView>(null);

  // ── Data fetching ──────────────────────────────────────────────────

  const fetchJob = useCallback(async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        professionals!jobs_professional_id_fkey(
          user_id, license_number, rating_avg, rating_count, jobs_completed,
          users!professionals_user_id_fkey(name, avatar_url)
        ),
        service_requests(problem_type, description, photos, urgency, categories(name))
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.warn('Error fetching job:', error);
    }
    setJob(data);
    setLoading(false);
  }, [id]);

  const checkReview = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('reviews')
      .select('id')
      .eq('job_id', id)
      .eq('reviewer_id', user.id)
      .maybeSingle();
    setHasReview(!!data);
  }, [id, user?.id]);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('job_id', id)
      .order('created_at');
    setMessages(data ?? []);
  }, [id]);

  useEffect(() => {
    fetchJob();
    fetchMessages();
    checkReview();

    const channel = supabase
      .channel(`client-job-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `job_id=eq.${id}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => {
          // Replace local temp message from same sender with same content
          const localMatch = prev.find((m) =>
            m.id.startsWith('local-') &&
            m.sender_id === newMsg.sender_id &&
            m.content === newMsg.content
          );
          if (localMatch) {
            return prev.map((m) => m.id === localMatch.id ? newMsg : m);
          }
          // Skip if already exists by real ID
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter: `id=eq.${id}`,
      }, () => {
        fetchJob();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // ── Actions ────────────────────────────────────────────────────────

  async function sendMessage() {
    if (!newMessage.trim()) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase.from('messages').insert({
      job_id: id,
      sender_id: user?.id,
      content,
    });

    if (error) {
      Alert.alert('Error', 'No se pudo enviar el mensaje');
      setNewMessage(content);
    } else {
      // Add message to local state immediately (don't depend on fetchMessages/RLS)
      const localMsg: Message = {
        id: `local-${Date.now()}`,
        content,
        sender_id: user?.id ?? '',
        created_at: new Date().toISOString(),
        flagged: false,
      };
      setMessages((prev) => [...prev, localMsg]);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
    setSending(false);
  }

  function handleApproveWork() {
    Alert.alert(
      'Aprobar trabajo',
      'Confirmá que el profesional completó el trabajo correctamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          onPress: () => showPaymentSelection(),
        },
      ]
    );
  }

  function showPaymentSelection() {
    Alert.alert(
      'Método de pago',
      'Seleccioná cómo pagaste o vas a pagar al profesional.',
      [
        {
          text: 'Efectivo',
          onPress: () => confirmWithPayment('cash'),
        },
        {
          text: 'Tarjeta / Digital',
          onPress: () => {
            Alert.alert('Próximamente', 'El pago digital estará disponible pronto. Por ahora, coordiná el pago en efectivo con el profesional.');
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }

  async function confirmWithPayment(method: string) {
    setActionLoading(true);
    try {
      // Update job status
      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          status: 'confirmed',
          payment_method: method,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (jobError) {
        Alert.alert('Error', 'No se pudo confirmar el trabajo. Intentá de nuevo.');
        setActionLoading(false);
        return;
      }

      // Create payment record
      const agreedPrice = job?.agreed_price ?? 0;
      const commissionRate = 0.10;
      const commissionAmount = agreedPrice * commissionRate;
      const netToProfessional = agreedPrice - commissionAmount;

      await supabase.from('payments').insert({
        job_id: id,
        amount: agreedPrice,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        net_to_professional: netToProfessional,
        status: method === 'cash' ? 'completed' : 'pending',
      });

      // Update professional stats
      if (job?.professionals?.user_id) {
        const { data: profData } = await supabase
          .from('professionals')
          .select('jobs_completed, balance_due')
          .eq('user_id', job.professionals.user_id)
          .single();

        if (profData) {
          await supabase
            .from('professionals')
            .update({
              jobs_completed: (profData.jobs_completed ?? 0) + 1,
              balance_due: (profData.balance_due ?? 0) + netToProfessional,
            })
            .eq('user_id', job.professionals.user_id);
        }
      }

      await fetchJob();
      setActionLoading(false);

      Alert.alert(
        'Trabajo confirmado',
        'Gracias por usar OficioYa. ¿Querés calificar al profesional?',
        [
          { text: 'Más tarde', style: 'cancel' },
          { text: 'Calificar', onPress: () => setShowRatingModal(true) },
        ]
      );
    } catch (e) {
      console.warn('Error confirming job:', e);
      Alert.alert('Error', 'Ocurrió un error inesperado.');
      setActionLoading(false);
    }
  }

  async function submitReview() {
    if (rating === 0) {
      Alert.alert('Calificación', 'Seleccioná al menos una estrella.');
      return;
    }
    setSubmittingReview(true);

    try {
      const { error } = await supabase.from('reviews').insert({
        job_id: id,
        reviewer_id: user?.id,
        reviewed_id: job?.professionals?.user_id,
        rating,
        comment: reviewComment.trim() || null,
      });

      if (error) {
        Alert.alert('Error', 'No se pudo enviar la calificación.');
        setSubmittingReview(false);
        return;
      }

      // Update professional rating
      if (job?.professionals?.user_id) {
        const currentAvg = job.professionals.rating_avg ?? 0;
        const currentCount = job.professionals.rating_count ?? 0;
        const newCount = currentCount + 1;
        const newAvg = ((currentAvg * currentCount) + rating) / newCount;

        await supabase
          .from('professionals')
          .update({
            rating_avg: Math.round(newAvg * 100) / 100,
            rating_count: newCount,
          })
          .eq('user_id', job.professionals.user_id);
      }

      setShowRatingModal(false);
      setHasReview(true);
      setRating(0);
      setReviewComment('');
      Alert.alert('Gracias', 'Tu calificación fue enviada.');
    } catch (e) {
      console.warn('Error submitting review:', e);
      Alert.alert('Error', 'Ocurrió un error inesperado.');
    }
    setSubmittingReview(false);
  }

  // ── Derived values ─────────────────────────────────────────────────

  const profName = job?.professionals?.users?.name ?? 'Profesional';
  const profAvatar = job?.professionals?.users?.avatar_url ?? null;
  const profInitial = profName.charAt(0).toUpperCase();
  const categoryName = job?.service_requests?.categories?.name ?? '';
  const profRating = job?.professionals?.rating_avg ?? 0;
  const profRatingCount = job?.professionals?.rating_count ?? 0;
  const currentStep = getStepIndex(job?.status ?? 'pending_start');
  const requestPhotos = parsePhotos(job?.service_requests?.photos);
  const professionalPhotos = parsePhotos(job?.professional_photos);

  const urgencyLabel: Record<string, string> = {
    urgent: 'Urgente',
    today: 'Hoy',
    this_week: 'Esta semana',
    flexible: 'Flexible',
  };

  // ── Loading state ──────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // ── Render helpers ─────────────────────────────────────────────────

  function renderStars(value: number, size: number = 16) {
    const stars = [];
    const filled = Math.round(value);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i < filled ? 'star' : 'star-outline'}
          size={size}
          color={COLORS.warning}
        />
      );
    }
    return stars;
  }

  function renderTimeline() {
    return (
      <View style={{
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: 20,
        ...SHADOWS.md,
      }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '700',
          color: COLORS.text,
          marginBottom: 20,
        }}>
          Estado del trabajo
        </Text>

        {JOB_STEPS.map((step, index) => {
          const isCompleted = index <= currentStep;
          const isActive = index === currentStep;
          const isLast = index === JOB_STEPS.length - 1;

          const circleColor = isCompleted
            ? (isActive ? COLORS.primary : COLORS.success)
            : COLORS.border;

          return (
            <View key={step.key} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              {/* Circle + Line */}
              <View style={{ alignItems: 'center', width: 32 }}>
                <View style={{
                  width: 28,
                  height: 28,
                  borderRadius: RADIUS.full,
                  backgroundColor: isCompleted ? circleColor : 'transparent',
                  borderWidth: isCompleted ? 0 : 2,
                  borderColor: COLORS.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Ionicons
                    name={isCompleted ? step.icon : 'ellipse-outline'}
                    size={isCompleted ? 14 : 10}
                    color={isCompleted ? COLORS.white : COLORS.textMuted}
                  />
                </View>
                {!isLast && (
                  <View style={{
                    width: 2,
                    height: 28,
                    backgroundColor: index < currentStep ? COLORS.success : COLORS.border,
                  }} />
                )}
              </View>

              {/* Label */}
              <View style={{ marginLeft: 12, paddingBottom: isLast ? 0 : 16 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: isActive ? '700' : '500',
                  color: isCompleted ? COLORS.text : COLORS.textMuted,
                }}>
                  {step.label}
                </Text>
                {isActive && (
                  <Text style={{
                    fontSize: 12,
                    color: COLORS.primary,
                    fontWeight: '600',
                    marginTop: 2,
                  }}>
                    Estado actual
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  function renderWorkDetails() {
    return (
      <View style={{
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: 20,
        ...SHADOWS.md,
      }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '700',
          color: COLORS.text,
          marginBottom: 16,
        }}>
          Detalles del pedido
        </Text>

        {/* Category */}
        {categoryName ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{
              width: 36,
              height: 36,
              borderRadius: RADIUS.sm,
              backgroundColor: COLORS.primaryLight,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="construct-outline" size={18} color={COLORS.primary} />
            </View>
            <View>
              <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Categoría</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }}>{categoryName}</Text>
            </View>
          </View>
        ) : null}

        {/* Problem type */}
        {job?.service_requests?.problem_type ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{
              width: 36,
              height: 36,
              borderRadius: RADIUS.sm,
              backgroundColor: COLORS.warningLight,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="alert-circle-outline" size={18} color={COLORS.warning} />
            </View>
            <View>
              <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Problema</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }}>
                {job.service_requests.problem_type}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Urgency */}
        {job?.service_requests?.urgency ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{
              width: 36,
              height: 36,
              borderRadius: RADIUS.sm,
              backgroundColor: job.service_requests.urgency === 'urgent' ? COLORS.dangerLight : COLORS.accentLight,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons
                name="time-outline"
                size={18}
                color={job.service_requests.urgency === 'urgent' ? COLORS.danger : COLORS.accent}
              />
            </View>
            <View>
              <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Urgencia</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }}>
                {urgencyLabel[job.service_requests.urgency] ?? job.service_requests.urgency}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Description */}
        {job?.service_requests?.description ? (
          <View style={{
            backgroundColor: COLORS.background,
            borderRadius: RADIUS.sm,
            padding: 14,
            marginTop: 4,
          }}>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 }}>
              {job.service_requests.description}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  function renderRequestPhotos() {
    if (requestPhotos.length === 0) return null;
    return (
      <View style={{
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: 20,
        ...SHADOWS.md,
      }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '700',
          color: COLORS.text,
          marginBottom: 12,
        }}>
          Fotos del pedido
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {requestPhotos.map((photo, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setPreviewPhoto(photo)}
              style={{ marginRight: 10 }}
            >
              <SafeImage
                uri={photo}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: RADIUS.sm,
                }}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  function renderProfessionalPhotos() {
    if (professionalPhotos.length === 0) return null;
    if (job?.status !== 'completed_by_professional' && job?.status !== 'confirmed') return null;

    return (
      <View style={{
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: 20,
        ...SHADOWS.md,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Ionicons name="camera-outline" size={20} color={COLORS.success} />
          <Text style={{
            fontSize: 16,
            fontWeight: '700',
            color: COLORS.text,
            marginLeft: 8,
          }}>
            Fotos del trabajo realizado
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {professionalPhotos.map((photo, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setPreviewPhoto(photo)}
              style={{ marginRight: 10 }}
            >
              <Image
                source={{ uri: photo }}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: RADIUS.sm,
                  backgroundColor: COLORS.borderLight,
                }}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  function renderPriceCard() {
    return (
      <View style={{
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: 20,
        ...SHADOWS.md,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>Precio acordado</Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.primary }}>
              ${job?.agreed_price?.toLocaleString('es-AR')}
            </Text>
          </View>
          {job?.payment_method && (
            <View style={{
              backgroundColor: COLORS.successLight,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: RADIUS.full,
            }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.success }}>
                {job.payment_method === 'cash' ? 'Efectivo' : 'Digital'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  function renderActionButtons() {
    const status = job?.status;

    return (
      <View style={{ gap: 12 }}>
        {/* Chat button - always visible except when confirmed with review */}
        {(status === 'pending_start' || status === 'in_progress') && (
          <TouchableOpacity
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: RADIUS.md,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              ...SHADOWS.md,
            }}
            onPress={() => setActiveTab('chat')}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubbles-outline" size={22} color={COLORS.white} />
            <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: '700' }}>
              Chat con profesional
            </Text>
          </TouchableOpacity>
        )}

        {/* Approve work button */}
        {status === 'completed_by_professional' && (
          <>
            <View style={{
              backgroundColor: COLORS.warningLight,
              borderRadius: RADIUS.md,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}>
              <Ionicons name="information-circle" size={22} color={COLORS.warning} />
              <Text style={{ flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 }}>
                El profesional marcó el trabajo como completado. Revisá y aprobá si estás conforme.
              </Text>
            </View>

            <TouchableOpacity
              style={{
                borderRadius: RADIUS.md,
                paddingVertical: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                backgroundColor: COLORS.success,
                opacity: actionLoading ? 0.7 : 1,
                ...SHADOWS.md,
              }}
              onPress={handleApproveWork}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-done-outline" size={22} color={COLORS.white} />
                  <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: '700' }}>
                    Revisar y aprobar trabajo
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                borderRadius: RADIUS.md,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                borderWidth: 1.5,
                borderColor: COLORS.primary,
              }}
              onPress={() => setActiveTab('chat')}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubbles-outline" size={20} color={COLORS.primary} />
              <Text style={{ color: COLORS.primary, fontSize: 15, fontWeight: '600' }}>
                Chatear con profesional
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Rate button */}
        {status === 'confirmed' && !hasReview && (
          <TouchableOpacity
            style={{
              borderRadius: RADIUS.md,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              backgroundColor: COLORS.warning,
              ...SHADOWS.md,
            }}
            onPress={() => setShowRatingModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="star-outline" size={22} color={COLORS.white} />
            <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: '700' }}>
              Calificar profesional
            </Text>
          </TouchableOpacity>
        )}

        {status === 'confirmed' && hasReview && (
          <View style={{
            backgroundColor: COLORS.successLight,
            borderRadius: RADIUS.md,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.success }}>
              Ya calificaste este trabajo
            </Text>
          </View>
        )}
      </View>
    );
  }

  // ── Details tab ────────────────────────────────────────────────────

  function renderDetailsTab() {
    return (
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {renderTimeline()}
        {renderPriceCard()}
        {renderWorkDetails()}
        {renderRequestPhotos()}
        {renderProfessionalPhotos()}
        {renderActionButtons()}
      </ScrollView>
    );
  }

  // ── Chat tab ───────────────────────────────────────────────────────

  function renderChatTab() {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={chatScrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
          onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <View style={{
              alignItems: 'center',
              paddingVertical: 40,
            }}>
              <View style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: COLORS.primaryLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}>
                <Ionicons name="chatbubbles-outline" size={28} color={COLORS.primary} />
              </View>
              <Text style={{ fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' }}>
                Enviá un mensaje para coordinar{'\n'}con el profesional
              </Text>
            </View>
          )}

          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <View
                key={msg.id}
                style={{
                  marginBottom: 12,
                  maxWidth: '80%',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                <View
                  style={{
                    borderRadius: RADIUS.lg,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    ...(msg.flagged
                      ? {
                          backgroundColor: COLORS.warningLight,
                          borderWidth: 1,
                          borderColor: '#FDE68A',
                        }
                      : isMe
                      ? {
                          backgroundColor: COLORS.primary,
                          borderBottomRightRadius: 4,
                        }
                      : {
                          backgroundColor: '#F3F4F6',
                          borderBottomLeftRadius: 4,
                        }),
                  }}
                >
                  {msg.flagged && (
                    <View style={{ marginBottom: 4 }}>
                      <Ionicons name="warning-outline" size={14} color={COLORS.warning} />
                    </View>
                  )}
                  <Text
                    style={{
                      fontSize: 15,
                      lineHeight: 20,
                      ...(msg.flagged
                        ? { color: '#92400E', fontStyle: 'italic' }
                        : isMe
                        ? { color: COLORS.white }
                        : { color: COLORS.text }),
                    }}
                  >
                    {msg.content}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    color: COLORS.textMuted,
                    marginTop: 4,
                    textAlign: isMe ? 'right' : 'left',
                  }}
                >
                  {new Date(msg.created_at).toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            );
          })}
          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Chat input */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          gap: 8,
        }}>
          <TextInput
            style={{
              flex: 1,
              backgroundColor: COLORS.background,
              borderRadius: RADIUS.full,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 15,
              color: COLORS.text,
              maxHeight: 100,
            }}
            placeholder="Escribi un mensaje..."
            placeholderTextColor={COLORS.textMuted}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={{
              width: 42,
              height: 42,
              borderRadius: RADIUS.full,
              backgroundColor: COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 2,
              opacity: sending || !newMessage.trim() ? 0.5 : 1,
            }}
            onPress={sendMessage}
            disabled={sending || !newMessage.trim()}
          >
            {sending ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Ionicons name="send" size={18} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Rating Modal ───────────────────────────────────────────────────

  function renderRatingModal() {
    return (
      <Modal
        visible={showRatingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: COLORS.overlay,
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: COLORS.white,
            borderTopLeftRadius: RADIUS.xl,
            borderTopRightRadius: RADIUS.xl,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: Math.max(insets.bottom, 24),
          }}>
            {/* Handle */}
            <View style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: COLORS.border,
              alignSelf: 'center',
              marginBottom: 20,
            }} />

            <Text style={{
              fontSize: 20,
              fontWeight: '700',
              color: COLORS.text,
              textAlign: 'center',
              marginBottom: 8,
            }}>
              Calificá a {profName}
            </Text>

            <Text style={{
              fontSize: 14,
              color: COLORS.textSecondary,
              textAlign: 'center',
              marginBottom: 24,
            }}>
              Tu opinión ayuda a otros clientes
            </Text>

            {/* Stars */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 24,
            }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color={COLORS.warning}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Comment */}
            <TextInput
              style={{
                backgroundColor: COLORS.background,
                borderRadius: RADIUS.md,
                padding: 16,
                fontSize: 15,
                color: COLORS.text,
                minHeight: 100,
                textAlignVertical: 'top',
                marginBottom: 20,
              }}
              placeholder="Contá tu experiencia (opcional)"
              placeholderTextColor={COLORS.textMuted}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              maxLength={500}
            />

            {/* Submit */}
            <TouchableOpacity
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: RADIUS.md,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: submittingReview ? 0.7 : 1,
                marginBottom: 12,
              }}
              onPress={submitReview}
              disabled={submittingReview}
              activeOpacity={0.8}
            >
              {submittingReview ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: '700' }}>
                  Enviar calificación
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                paddingVertical: 12,
                alignItems: 'center',
              }}
              onPress={() => setShowRatingModal(false)}
            >
              <Text style={{ color: COLORS.textSecondary, fontSize: 15 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Photo Preview Modal ────────────────────────────────────────────

  function renderPhotoPreview() {
    return (
      <Modal
        visible={!!previewPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewPhoto(null)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.9)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: insets.top + 16,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
            onPress={() => setPreviewPhoto(null)}
          >
            <Ionicons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>
          {previewPhoto && (
            <Image
              source={{ uri: previewPhoto }}
              style={{
                width: SCREEN_WIDTH - 32,
                height: SCREEN_WIDTH - 32,
                borderRadius: RADIUS.md,
              }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    );
  }

  // ── Main Render ────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={{
        backgroundColor: COLORS.white,
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
        paddingBottom: 0,
        ...SHADOWS.md,
      }}>
        {/* Top row: back, avatar, info, price */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 14,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: RADIUS.full,
              backgroundColor: COLORS.background,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.secondary} />
          </TouchableOpacity>

          {/* Avatar */}
          {profAvatar ? (
            <Image
              source={{ uri: profAvatar }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                marginRight: 12,
                backgroundColor: COLORS.borderLight,
              }}
            />
          ) : (
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: COLORS.primaryLight,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.primary }}>
                {profInitial}
              </Text>
            </View>
          )}

          {/* Name + rating + category */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.text }} numberOfLines={1}>
              {profName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 6 }}>
              <View style={{ flexDirection: 'row', gap: 1 }}>
                {renderStars(profRating, 12)}
              </View>
              <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                ({profRatingCount})
              </Text>
              {categoryName ? (
                <>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted }}> · </Text>
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' }}>
                    {categoryName}
                  </Text>
                </>
              ) : null}
            </View>
          </View>

          {/* Price badge */}
          <View style={{
            backgroundColor: COLORS.primaryLight,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: RADIUS.full,
          }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary }}>
              ${job?.agreed_price?.toLocaleString('es-AR')}
            </Text>
          </View>
        </View>

        {/* ── Tab toggle ── */}
        <View style={{
          flexDirection: 'row',
          borderTopWidth: 1,
          borderTopColor: COLORS.borderLight,
        }}>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === 'detalles' ? COLORS.primary : 'transparent',
            }}
            onPress={() => setActiveTab('detalles')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons
                name="document-text-outline"
                size={18}
                color={activeTab === 'detalles' ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: activeTab === 'detalles' ? COLORS.primary : COLORS.textMuted,
              }}>
                Detalles
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === 'chat' ? COLORS.primary : 'transparent',
            }}
            onPress={() => {
              setActiveTab('chat');
              setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: false }), 150);
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons
                name="chatbubbles-outline"
                size={18}
                color={activeTab === 'chat' ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: activeTab === 'chat' ? COLORS.primary : COLORS.textMuted,
              }}>
                Chat
              </Text>
              {messages.length > 0 && (
                <View style={{
                  backgroundColor: COLORS.primary,
                  borderRadius: RADIUS.full,
                  minWidth: 20,
                  height: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 6,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.white }}>
                    {messages.length}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content ── */}
      {activeTab === 'detalles' ? renderDetailsTab() : renderChatTab()}

      {/* ── Modals ── */}
      {renderRatingModal()}
      {renderPhotoPreview()}
    </KeyboardAvoidingView>
  );
}
