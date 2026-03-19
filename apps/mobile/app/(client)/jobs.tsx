import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, SHADOWS, RADIUS } from '@/constants/theme';

type JobItem = {
  id: string;
  agreed_price: number;
  status: string;
  created_at: string;
  professionals: {
    users: { name: string; avatar_url: string | null } | null;
  } | null;
  service_requests: {
    problem_type: string;
    categories: { name: string } | null;
  } | null;
};

const ACTIVE_STATUSES = ['pending_start', 'in_progress', 'completed_by_professional'];
const COMPLETED_STATUSES = ['confirmed'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending_start: { label: 'Pendiente', color: COLORS.textSecondary, bg: COLORS.secondaryLight },
  in_progress: { label: 'En progreso', color: COLORS.accent, bg: COLORS.accentLight },
  completed_by_professional: { label: 'Esperando confirmación', color: COLORS.warning, bg: COLORS.warningLight },
  confirmed: { label: 'Completado', color: COLORS.success, bg: COLORS.successLight },
};

export default function ClientJobsScreen() {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const fetchJobs = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const status = activeTab === 'active' ? 'active' : 'confirmed';
      const data = await api.getJobs({ status });
      setJobs(data ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, activeTab]);

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [fetchJobs])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderSkeletons = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.card, SHADOWS.sm]}>
          <View style={styles.skeletonRow}>
            <View style={[styles.skeletonCircle, styles.skeletonAnim]} />
            <View style={{ flex: 1, gap: 8 }}>
              <View style={[styles.skeletonLine, styles.skeletonAnim, { width: '60%' }]} />
              <View style={[styles.skeletonLine, styles.skeletonAnim, { width: '40%' }]} />
            </View>
          </View>
          <View style={[styles.skeletonLine, styles.skeletonAnim, { width: '30%', marginTop: 12 }]} />
        </View>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons
          name={activeTab === 'active' ? 'construct-outline' : 'checkmark-done-outline'}
          size={48}
          color={COLORS.textMuted}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {activeTab === 'active' ? 'Sin trabajos activos' : 'Sin trabajos completados'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'active'
          ? 'Cuando aceptes una propuesta de un profesional, el trabajo aparecerá acá.'
          : 'Los trabajos completados y confirmados aparecerán acá.'}
      </Text>
    </View>
  );

  const renderJobCard = ({ item }: { item: JobItem }) => {
    const statusCfg = STATUS_CONFIG[item.status] ?? {
      label: item.status,
      color: COLORS.textMuted,
      bg: COLORS.borderLight,
    };
    const professionalName = item.professionals?.users?.name ?? 'Profesional';
    const categoryName = item.service_requests?.categories?.name ?? '';
    const problemType = item.service_requests?.problem_type ?? '';

    return (
      <TouchableOpacity
        style={[styles.card, SHADOWS.sm]}
        activeOpacity={0.7}
        onPress={() => router.push(`/(client)/job/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardAvatar}>
            <Ionicons name="person" size={20} color={COLORS.textMuted} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardProfessionalName} numberOfLines={1}>{professionalName}</Text>
            {categoryName ? (
              <Text style={styles.cardCategory} numberOfLines={1}>{categoryName}</Text>
            ) : null}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <View style={[styles.statusBadgeDot, { backgroundColor: statusCfg.color }]} />
            <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>

        {problemType ? (
          <Text style={styles.cardProblem} numberOfLines={2}>{problemType}</Text>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.cardPriceRow}>
            <Ionicons name="cash-outline" size={16} color={COLORS.success} />
            <Text style={styles.cardPrice}>${item.agreed_price?.toLocaleString('es-AR')}</Text>
          </View>
          <View style={styles.cardDateRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, '#E05A2B']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <Text style={styles.headerTitle}>Mis trabajos</Text>
      </LinearGradient>

      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, activeTab === 'active' && styles.filterTabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.filterTabText, activeTab === 'active' && styles.filterTabTextActive]}>
            Activos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeTab === 'completed' && styles.filterTabActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.filterTabText, activeTab === 'completed' && styles.filterTabTextActive]}>
            Completados
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        renderSkeletons()
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJobCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTabTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAvatar: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardProfessionalName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardCategory: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 5,
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardProblem: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
  },
  cardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  // Skeleton
  skeletonContainer: {
    padding: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
  },
  skeletonLine: {
    height: 14,
    borderRadius: RADIUS.sm,
  },
  skeletonAnim: {
    backgroundColor: COLORS.border,
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
