import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { COLORS, SHADOWS, RADIUS } from '@/constants/theme';

type Proposal = {
  id: string;
  price: number;
  message: string | null;
  estimated_arrival: string | null;
  professional_id: string;
  professionals: {
    rating_avg: number;
    rating_count: number;
    jobs_completed: number;
  } | null;
};

function SkeletonCard() {
  return (
    <View style={[styles.proposalCard, SHADOWS.md]}>
      <View style={styles.skeletonPrice} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <View style={styles.skeletonStars} />
        <View style={styles.skeletonBadge} />
      </View>
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, { width: '60%' }]} />
      <View style={styles.skeletonButton} />
    </View>
  );
}

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [existingJobId, setExistingJobId] = useState<string | null>(null);

  useEffect(() => {
    checkExistingJob();
    fetchProposals();

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

  async function checkExistingJob() {
    const { data } = await supabase
      .from('jobs')
      .select('id')
      .eq('request_id', id)
      .limit(1)
      .maybeSingle();
    if (data) setExistingJobId(data.id);
  }

  async function fetchProposals() {
    const { data, error } = await supabase
      .from('proposals')
      .select('*, professionals(rating_avg, rating_count, jobs_completed)')
      .eq('request_id', id)
      .eq('status', 'pending')
      .order('price', { ascending: true });

    if (error) {
      console.warn('Error fetching proposals:', error);
    }
    setProposals(data ?? []);
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchProposals();
    setRefreshing(false);
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

            try {
              const { data: job, error } = await supabase
                .from('jobs')
                .insert({
                  request_id: id,
                  proposal_id: proposal.id,
                  client_id: (await supabase.auth.getUser()).data.user?.id,
                  professional_id: proposal.professional_id,
                  agreed_price: proposal.price,
                })
                .select()
                .single();

              if (error || !job) {
                Alert.alert('Error', 'No se pudo aceptar la propuesta. Intentá de nuevo.');
                setAccepting(null);
                return;
              }

              const results = await Promise.all([
                supabase.from('proposals').update({ status: 'accepted' }).eq('id', proposal.id),
                supabase.from('proposals').update({ status: 'rejected' }).eq('request_id', id).neq('id', proposal.id),
                supabase.from('service_requests').update({ status: 'in_progress' }).eq('id', id),
              ]);

              const statusErrors = results.filter(r => r.error);
              if (statusErrors.length > 0) {
                console.warn('Some status updates failed:', statusErrors);
              }

              setAccepting(null);
              Alert.alert(
                '¡Propuesta aceptada!',
                'Se abrió el chat con el profesional para coordinar el trabajo.',
                [{ text: 'Ir al chat', onPress: () => router.replace(`/(client)/job/${job.id}`) }]
              );
            } catch (e) {
              console.warn('Error accepting proposal:', e);
              Alert.alert('Error', 'Ocurrió un error inesperado. Intentá de nuevo.');
              setAccepting(null);
            }
          },
        },
      ]
    );
  }

  function renderStars(rating: number) {
    const filled = Math.round(rating);
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i < filled ? 'star' : 'star-outline'}
          size={16}
          color={COLORS.warning}
        />
      );
    }
    return stars;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, SHADOWS.sm, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Propuestas recibidas</Text>
          <Text style={styles.headerSubtitle}>
            Los profesionales son anónimos hasta que aceptes
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Already has an active job */}
        {existingJobId ? (
          <View style={[styles.emptyContainer, SHADOWS.md]}>
            <View style={[styles.emptyIconContainer, { backgroundColor: COLORS.accentLight }]}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.accent} />
            </View>
            <Text style={styles.emptyTitle}>Ya aceptaste una propuesta</Text>
            <Text style={styles.emptySubtitle}>
              Este pedido ya tiene un trabajo activo.
            </Text>
            <TouchableOpacity
              style={[styles.acceptButton, { marginTop: 20, width: '100%' }]}
              onPress={() => router.push(`/(client)/job/${existingJobId}`)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="arrow-forward-circle" size={20} color={COLORS.white} />
                <Text style={styles.acceptButtonText}>Ver trabajo activo</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <View style={{ gap: 16 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : proposals.length === 0 ? (
          <View style={[styles.emptyContainer, SHADOWS.md]}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="hourglass-outline" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Aún no hay propuestas</Text>
            <Text style={styles.emptySubtitle}>
              Los profesionales cercanos están siendo notificados. Te avisaremos cuando llegue una propuesta.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <Text style={styles.countText}>
              {proposals.length} propuesta{proposals.length !== 1 ? 's' : ''}
            </Text>
            {proposals.map((proposal) => (
              <View key={proposal.id} style={[styles.proposalCard, SHADOWS.md]}>
                {/* Price */}
                <Text style={styles.price}>
                  ${proposal.price.toLocaleString('es-AR')}
                </Text>

                {/* Rating and jobs */}
                <View style={styles.statsRow}>
                  <View style={styles.starsContainer}>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {renderStars(proposal.professionals?.rating_avg ?? 0)}
                    </View>
                    <Text style={styles.ratingText}>
                      {(proposal.professionals?.rating_avg ?? 0).toFixed(1)} ({proposal.professionals?.rating_count ?? 0})
                    </Text>
                  </View>
                  <View style={styles.jobsBadge}>
                    <Ionicons name="briefcase-outline" size={14} color={COLORS.secondary} />
                    <Text style={styles.jobsBadgeText}>
                      {proposal.professionals?.jobs_completed ?? 0} trabajos
                    </Text>
                  </View>
                </View>

                {/* Estimated arrival */}
                {proposal.estimated_arrival && (
                  <View style={styles.etaRow}>
                    <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.etaText}>
                      Disponibilidad: {proposal.estimated_arrival}
                    </Text>
                  </View>
                )}

                {/* Message */}
                {proposal.message && (
                  <Text style={styles.messageText}>
                    "{proposal.message}"
                  </Text>
                )}

                {/* Accept button */}
                <TouchableOpacity
                  style={[
                    styles.acceptButton,
                    accepting === proposal.id && { opacity: 0.7 },
                  ]}
                  onPress={() => acceptProposal(proposal)}
                  disabled={accepting === proposal.id}
                  activeOpacity={0.8}
                >
                  {accepting === proposal.id ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
                      <Text style={styles.acceptButtonText}>Aceptar propuesta</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = {
  header: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.secondary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  countText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  proposalCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 20,
  },
  price: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: COLORS.primary,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 16,
    marginBottom: 14,
  },
  starsContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  ratingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  jobsBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: COLORS.secondaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  jobsBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.secondary,
  },
  etaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 12,
  },
  etaText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic' as const,
    marginBottom: 16,
    lineHeight: 20,
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 4,
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  emptyContainer: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 40,
    alignItems: 'center' as const,
    marginTop: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  // Skeleton styles
  skeletonPrice: {
    width: 140,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.borderLight,
    marginBottom: 12,
  },
  skeletonStars: {
    width: 100,
    height: 16,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.borderLight,
  },
  skeletonBadge: {
    width: 80,
    height: 24,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderLight,
  },
  skeletonLine: {
    width: '80%' as any,
    height: 14,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.borderLight,
    marginBottom: 8,
  },
  skeletonButton: {
    width: '100%' as any,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.borderLight,
    marginTop: 12,
  },
};
