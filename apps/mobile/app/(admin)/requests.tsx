import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/theme';

type ServiceRequest = {
  id: string;
  title: string;
  description: string;
  status: string;
  urgency: string;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
  client: {
    name: string;
    email: string;
  };
  category: {
    name: string;
  };
};

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Electricista: 'flash',
  Gasista: 'flame',
  Plomero: 'water',
  'Limpieza y mantenimiento': 'sparkles',
};

export default function RequestsScreen() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
  const insets = useSafeAreaInsets();

  async function loadRequests() {
    try {
      const data = await api.getAdminRequests(filter);
      setRequests(data || []);
    } catch (e) {
      console.warn('Error loading requests:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadRequests();
  }, [filter]);

  async function onRefresh() {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'open': return { text: 'Abierto', bg: '#DBEAFE', color: '#1E40AF' };
      case 'in_proposals': return { text: 'Propuestas', bg: COLORS.warningLight, color: '#92400E' };
      case 'assigned': return { text: 'Asignado', bg: '#E9D5FF', color: '#6B21A8' };
      case 'in_progress': return { text: 'En curso', bg: COLORS.successLight, color: '#065F46' };
      case 'completed': return { text: 'Completado', bg: COLORS.successLight, color: '#065F46' };
      case 'cancelled': return { text: 'Cancelado', bg: COLORS.dangerLight, color: '#991B1B' };
      default: return { text: status, bg: COLORS.borderLight, color: COLORS.textSecondary };
    }
  }

  function getUrgencyBadge(urgency: string) {
    switch (urgency) {
      case 'urgent': return { text: 'Urgente', color: COLORS.warning, bg: COLORS.warningLight, icon: 'alert-circle' as const };
      case 'emergency': return { text: 'Emergencia', color: COLORS.danger, bg: COLORS.dangerLight, icon: 'warning' as const };
      default: return { text: 'Normal', color: COLORS.textSecondary, bg: COLORS.borderLight, icon: 'time-outline' as const };
    }
  }

  function getCategoryIcon(categoryName: string): keyof typeof Ionicons.glyphMap {
    return categoryIcons[categoryName] || 'construct';
  }

  const filterLabels: Record<string, string> = {
    active: 'Activos',
    completed: 'Finalizados',
    all: 'Todos',
  };

  function renderRequest({ item }: { item: ServiceRequest }) {
    const statusBadge = getStatusBadge(item.status);
    const urgencyBadge = getUrgencyBadge(item.urgency);
    const catName = item.category?.name || 'Sin categoria';
    const catIcon = getCategoryIcon(catName);

    return (
      <View style={styles.requestCard}>
        {/* Top Row: Category + Status */}
        <View style={styles.requestTopRow}>
          <View style={styles.categoryRow}>
            <View style={styles.categoryIconCircle}>
              <Ionicons name={catIcon} size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.categoryName}>{catName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
              {statusBadge.text}
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Client */}
        <View style={styles.clientRow}>
          <Ionicons name="person-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.clientText}>
            {item.client?.name || 'Desconocido'}
          </Text>
        </View>

        {/* Bottom Row: Urgency + Budget + Date */}
        <View style={styles.requestBottomRow}>
          <View style={[styles.urgencyBadge, { backgroundColor: urgencyBadge.bg }]}>
            <Ionicons name={urgencyBadge.icon} size={12} color={urgencyBadge.color} />
            <Text style={[styles.urgencyText, { color: urgencyBadge.color }]}>
              {urgencyBadge.text}
            </Text>
          </View>

          {item.budget_min != null && item.budget_max != null && (
            <View style={styles.budgetRow}>
              <Ionicons name="cash-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.budgetText}>
                ${item.budget_min.toLocaleString()} - ${item.budget_max.toLocaleString()}
              </Text>
            </View>
          )}

          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <Text style={styles.headerTitle}>Pedidos</Text>
        <Text style={styles.headerCount}>{requests.length} encontrados</Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          {(['active', 'completed', 'all'] as const).map(f => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.filterPill,
                  active ? styles.filterPillActive : styles.filterPillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    active ? styles.filterPillTextActive : styles.filterPillTextInactive,
                  ]}
                >
                  {filterLabels[f]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="document-text-outline" size={36} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyText}>No hay pedidos</Text>
            </View>
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
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '800',
  },
  headerCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  filtersContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  filterPill: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
  },
  filterPillInactive: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: COLORS.white,
  },
  filterPillTextInactive: {
    color: COLORS.textSecondary,
  },
  requestCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  requestTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  categoryIconCircle: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  clientText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  requestBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  budgetText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  dateText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginLeft: 'auto',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 16,
  },
});
