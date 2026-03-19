import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, SHADOWS, RADIUS } from '@/constants/theme';

const COMMISSION_RATE = 0.1;

type ProfessionalData = {
  id: string;
  balance_due: number;
  jobs_completed: number;
  rating_avg: number;
  rating_count: number;
};

type CompletedJob = {
  id: string;
  agreed_price: number;
  payment_method: string;
  confirmed_at: string;
  status: string;
  service_requests: {
    categories: {
      name: string;
    };
  };
  reviews: { rating: number }[];
};

export default function EarningsScreen() {
  const { user } = useAuthStore();
  const [professional, setProfessional] = useState<ProfessionalData | null>(null);
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user?.id])
  );

  async function loadData() {
    if (!user?.id) return;
    try {
      const { data: prof, error: profError } = await supabase
        .from('professionals')
        .select('id, balance_due, jobs_completed, rating_avg, rating_count')
        .eq('user_id', user.id)
        .single();

      if (profError || !prof) {
        console.warn('Error loading professional data:', profError);
        setLoading(false);
        return;
      }

      setProfessional(prof);

      const { data: jobs } = await supabase
        .from('jobs')
        .select(`
          id, agreed_price, payment_method, confirmed_at, status,
          service_requests(categories(name)),
          reviews(rating)
        `)
        .eq('professional_id', prof.id)
        .eq('status', 'confirmed')
        .order('confirmed_at', { ascending: false })
        .limit(20);

      setCompletedJobs((jobs as CompletedJob[]) ?? []);
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
      `Debes $${professional?.balance_due?.toLocaleString('es-AR')} por comisiones de trabajos en efectivo. Redirigiremos a Mercado Pago.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Pagar', onPress: () => { /* TODO: integrar MP */ } },
      ]
    );
  }

  function renderStars(rating: number) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={12}
          color={i <= rating ? COLORS.warning : COLORS.textMuted}
        />
      );
    }
    return stars;
  }

  function renderSkeletons() {
    return (
      <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 16 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.paymentCard, SHADOWS.sm]}>
            <View style={{ gap: 8 }}>
              <View style={[styles.skeletonLine, { width: '50%' }]} />
              <View style={[styles.skeletonLine, { width: '70%' }]} />
              <View style={[styles.skeletonLine, { width: '40%' }]} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  const totalNetEarnings = completedJobs.reduce((sum, job) => {
    const net = (job.agreed_price ?? 0) * (1 - COMMISSION_RATE);
    return sum + net;
  }, 0);

  const hasDebt = (professional?.balance_due ?? 0) > 0;

  const statsData = [
    {
      icon: 'briefcase-outline' as const,
      value: String(professional?.jobs_completed ?? 0),
      label: 'Trabajos',
    },
    {
      icon: 'star-outline' as const,
      value: professional?.rating_avg?.toFixed(1) ?? '--',
      label: 'Rating',
    },
    {
      icon: 'chatbubble-outline' as const,
      value: String(professional?.rating_count ?? 0),
      label: 'Resenas',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.secondary]}
            tintColor={COLORS.secondary}
          />
        }
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={[COLORS.secondary, '#2D4A5E']}
          style={[styles.gradientHeader, { paddingTop: insets.top + 16 }]}
        >
          <Text style={styles.headerTitle}>Ganancias</Text>
          <Text style={styles.headerSubtitle}>Resumen de tu actividad</Text>
        </LinearGradient>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          {statsData.map((stat, index) => (
            <View key={index} style={[styles.statCard, SHADOWS.sm]}>
              <View style={styles.statIconContainer}>
                <Ionicons name={stat.icon} size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Total Earned Card */}
        <View style={[styles.totalEarnedCard, SHADOWS.md]}>
          <View style={styles.totalEarnedIconContainer}>
            <Ionicons name="wallet-outline" size={24} color={COLORS.success} />
          </View>
          <View style={styles.totalEarnedContent}>
            <Text style={styles.totalEarnedLabel}>Total ganado (neto)</Text>
            <Text style={styles.totalEarnedValue}>
              ${totalNetEarnings.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>

        {/* Balance Card */}
        {hasDebt ? (
          <View style={[styles.balanceCard, styles.balanceDebt, SHADOWS.sm]}>
            <View style={styles.balanceHeader}>
              <Ionicons name="alert-circle" size={22} color={COLORS.danger} />
              <Text style={styles.balanceDebtTitle}>Deuda pendiente</Text>
            </View>
            <Text style={styles.balanceDebtDescription}>
              Tenes ${professional!.balance_due.toLocaleString('es-AR')} en comisiones por cobrar de trabajos en efectivo.
              Regulariza tu balance para poder enviar nuevas propuestas.
            </Text>
            <TouchableOpacity
              style={styles.payButton}
              onPress={handlePayDebt}
              activeOpacity={0.8}
            >
              <Ionicons name="card-outline" size={18} color={COLORS.white} />
              <Text style={styles.payButtonText}>
                Pagar ${professional!.balance_due.toLocaleString('es-AR')} con Mercado Pago
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.balanceCard, styles.balanceGood, SHADOWS.sm]}>
            <View style={styles.balanceHeader}>
              <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
              <Text style={styles.balanceGoodText}>Tu balance esta al dia</Text>
            </View>
          </View>
        )}

        {/* Payment History from completed jobs */}
        <View style={styles.historySection}>
          <View style={styles.historyTitleRow}>
            <Ionicons name="time-outline" size={20} color={COLORS.secondary} />
            <Text style={styles.historyTitle}>Historial de pagos</Text>
          </View>

          {loading ? (
            renderSkeletons()
          ) : completedJobs.length === 0 ? (
            <View style={[styles.emptyCard, SHADOWS.sm]}>
              <Ionicons name="bar-chart-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Sin pagos registrados</Text>
              <Text style={styles.emptySubtitle}>
                Los pagos apareceran aca cuando completes trabajos
              </Text>
            </View>
          ) : (
            <View style={styles.paymentsList}>
              {completedJobs.map((job) => {
                const commission = (job.agreed_price ?? 0) * COMMISSION_RATE;
                const net = (job.agreed_price ?? 0) - commission;
                const category = job.service_requests?.categories?.name ?? 'Servicio';
                const review = job.reviews?.[0];
                const isCash = job.payment_method === 'cash';

                return (
                  <View key={job.id} style={[styles.paymentCard, SHADOWS.sm]}>
                    {/* Top row: category + method badge */}
                    <View style={styles.paymentTopRow}>
                      <View style={styles.paymentIconContainer}>
                        <Ionicons
                          name={isCash ? 'cash-outline' : 'card-outline'}
                          size={20}
                          color={COLORS.secondary}
                        />
                      </View>
                      <View style={styles.paymentInfo}>
                        <Text style={styles.paymentCategory}>{category}</Text>
                        <View style={[styles.methodBadge, {
                          backgroundColor: isCash ? COLORS.warningLight : COLORS.accentLight,
                        }]}>
                          <Text style={[styles.methodBadgeText, {
                            color: isCash ? COLORS.warning : COLORS.accent,
                          }]}>
                            {isCash ? 'Efectivo' : 'Digital'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Price breakdown */}
                    <View style={styles.priceBreakdown}>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Precio acordado</Text>
                        <Text style={styles.priceValue}>
                          ${(job.agreed_price ?? 0).toLocaleString('es-AR')}
                        </Text>
                      </View>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Comision (10%)</Text>
                        <Text style={[styles.priceValue, { color: COLORS.danger }]}>
                          -${commission.toLocaleString('es-AR')}
                        </Text>
                      </View>
                      <View style={[styles.priceRow, styles.netRow]}>
                        <Text style={styles.netLabel}>Neto</Text>
                        <Text style={styles.netValue}>
                          ${net.toLocaleString('es-AR')}
                        </Text>
                      </View>
                    </View>

                    {/* Footer: date + rating */}
                    <View style={styles.paymentFooter}>
                      <View style={styles.paymentDateRow}>
                        <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
                        <Text style={styles.paymentDate}>
                          {job.confirmed_at
                            ? new Date(job.confirmed_at).toLocaleDateString('es-AR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : ''}
                        </Text>
                      </View>
                      {review ? (
                        <View style={styles.starsRow}>{renderStars(review.rating)}</View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  gradientHeader: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 14,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  // Total earned card
  totalEarnedCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalEarnedIconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  totalEarnedContent: {
    flex: 1,
  },
  totalEarnedLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  totalEarnedValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.success,
    marginTop: 2,
  },
  // Balance
  balanceCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: RADIUS.md,
    padding: 18,
  },
  balanceDebt: {
    backgroundColor: COLORS.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  balanceGood: {
    backgroundColor: COLORS.successLight,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceDebtTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.danger,
  },
  balanceDebtDescription: {
    fontSize: 13,
    color: '#B91C1C',
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 14,
  },
  balanceGoodText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.success,
  },
  payButton: {
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.sm,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  // History
  historySection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  paymentsList: {
    gap: 10,
  },
  paymentCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 16,
  },
  paymentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIconContainer: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentCategory: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  methodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  methodBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Price breakdown
  priceBreakdown: {
    marginTop: 14,
    gap: 6,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  netRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  netLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  netValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
  },
  // Footer
  paymentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  paymentDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  // Skeleton
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.borderLight,
  },
});
