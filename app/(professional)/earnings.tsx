import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
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
  const insets = useSafeAreaInsets();

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

  function getStatusLabel(status: string) {
    switch (status) {
      case 'released': return 'Acreditado';
      case 'held': return 'Retenido';
      default: return status;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'released': return { bg: COLORS.successLight, text: COLORS.success };
      case 'held': return { bg: COLORS.warningLight, text: COLORS.warning };
      default: return { bg: COLORS.borderLight, text: COLORS.textSecondary };
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.secondary} size="large" />
      </View>
    );
  }

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

        {/* Payment History */}
        <View style={styles.historySection}>
          <View style={styles.historyTitleRow}>
            <Ionicons name="time-outline" size={20} color={COLORS.secondary} />
            <Text style={styles.historyTitle}>Historial de pagos</Text>
          </View>

          {payments.length === 0 ? (
            <View style={[styles.emptyCard, SHADOWS.sm]}>
              <Ionicons name="bar-chart-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Sin pagos registrados</Text>
              <Text style={styles.emptySubtitle}>
                Los pagos apareceran aca cuando completes trabajos
              </Text>
            </View>
          ) : (
            <View style={styles.paymentsList}>
              {payments.map((pay) => {
                const statusColor = getStatusColor(pay.status);
                return (
                  <View key={pay.id} style={[styles.paymentCard, SHADOWS.sm]}>
                    <View style={styles.paymentRow}>
                      <View style={styles.paymentIconContainer}>
                        <Ionicons
                          name={pay.method === 'cash' ? 'cash-outline' : 'card-outline'}
                          size={20}
                          color={COLORS.secondary}
                        />
                      </View>
                      <View style={styles.paymentDetails}>
                        <Text style={styles.paymentAmount}>
                          ${pay.net_to_professional.toLocaleString('es-AR')}
                        </Text>
                        <Text style={styles.paymentMeta}>
                          Comision: ${pay.commission_amount.toLocaleString('es-AR')} ·{' '}
                          {pay.method === 'cash' ? 'Efectivo' : 'Digital'}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                        <Text style={[styles.statusText, { color: statusColor.text }]}>
                          {getStatusLabel(pay.status)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.paymentDateRow}>
                      <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
                      <Text style={styles.paymentDate}>
                        {new Date(pay.created_at).toLocaleDateString('es-AR')}
                      </Text>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
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
    padding: 14,
  },
  paymentRow: {
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
  paymentDetails: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  paymentMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  paymentDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  paymentDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
