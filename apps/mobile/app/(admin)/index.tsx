import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/theme';

type Stats = {
  totalUsers: number;
  totalProfessionals: number;
  pendingVerification: number;
  activeRequests: number;
  completedJobs: number;
  totalRevenue: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProfessionals: 0,
    pendingVerification: 0,
    activeRequests: 0,
    completedJobs: 0,
    totalRevenue: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  async function loadStats() {
    try {
      const data = await api.getAdminDashboard();
      if (data) {
        setStats({
          totalUsers: data.total_users ?? 0,
          totalProfessionals: data.total_professionals ?? 0,
          pendingVerification: data.pending_verification ?? 0,
          activeRequests: data.active_requests ?? 0,
          completedJobs: data.completed_jobs ?? 0,
          totalRevenue: data.total_revenue ?? 0,
        });
      }
    } catch (e) {
      console.warn('Error loading stats:', e);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }

  const { setToken, setUser: setAuthUser, setSession } = useAuthStore();

  function handleLogout() {
    supabase.auth.signOut();
    setToken(null);
    setAuthUser(null);
    setSession(null);
  }

  const statCards: {
    label: string;
    value: number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bgColor: string;
    action?: () => void;
  }[] = [
    { label: 'Usuarios', value: stats.totalUsers, icon: 'people', color: '#3B82F6', bgColor: '#EFF6FF' },
    { label: 'Profesionales', value: stats.totalProfessionals, icon: 'briefcase', color: COLORS.primary, bgColor: COLORS.primaryLight },
    { label: 'Pendientes', value: stats.pendingVerification, icon: 'time', color: COLORS.warning, bgColor: COLORS.warningLight, action: () => router.push('/(admin)/professionals') },
    { label: 'Pedidos activos', value: stats.activeRequests, icon: 'document-text', color: COLORS.accent, bgColor: COLORS.accentLight },
    { label: 'Completados', value: stats.completedJobs, icon: 'checkmark-circle', color: COLORS.success, bgColor: COLORS.successLight },
  ];

  const quickActions: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bgColor: string;
    onPress: () => void;
  }[] = [
    {
      label: 'Verificar profesionales',
      icon: 'shield-checkmark',
      color: COLORS.white,
      bgColor: COLORS.primary,
      onPress: () => router.push('/(admin)/professionals'),
    },
    {
      label: 'Ver pedidos',
      icon: 'list',
      color: COLORS.white,
      bgColor: COLORS.secondary,
      onPress: () => router.push('/(admin)/requests'),
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: SPACING['3xl'] }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={[COLORS.secondary, '#2D3F52']}
          style={[styles.header, { paddingTop: insets.top + SPACING.lg }]}
        >
          <View>
            <Text style={styles.headerSubtitle}>Panel de Administracion</Text>
            <Text style={styles.headerTitle}>Dashboard</Text>
            {user?.email && (
              <Text style={styles.headerEmail}>{user.email}</Text>
            )}
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statCards.map((card, i) => (
            <TouchableOpacity
              key={i}
              onPress={card.action}
              disabled={!card.action}
              activeOpacity={card.action ? 0.7 : 1}
              style={[
                styles.statCard,
                i === statCards.length - 1 && statCards.length % 2 !== 0
                  ? styles.statCardFull
                  : styles.statCardHalf,
              ]}
            >
              <View style={[styles.statIconContainer, { backgroundColor: card.bgColor }]}>
                <Ionicons name={card.icon} size={22} color={card.color} />
              </View>
              <Text style={styles.statValue}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
              {card.action && (
                <View style={styles.statArrow}>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones rapidas</Text>
          <View style={styles.actionsRow}>
            {quickActions.map((action, i) => (
              <TouchableOpacity
                key={i}
                onPress={action.onPress}
                activeOpacity={0.7}
                style={[styles.actionCard, { backgroundColor: action.bgColor }]}
              >
                <View style={styles.actionIconCircle}>
                  <Ionicons name={action.icon} size={24} color={action.bgColor} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" style={{ marginTop: SPACING.sm }} />
              </TouchableOpacity>
            ))}
          </View>
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
  header: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING['3xl'],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  headerEmail: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    gap: 6,
    marginTop: Platform.OS === 'ios' ? 4 : 0,
  },
  logoutText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    marginTop: -SPACING.xl,
    gap: SPACING.md,
  },
  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  statCardHalf: {
    width: '47.5%',
    flexGrow: 1,
  },
  statCardFull: {
    width: '100%',
  },
  statIconContainer: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  statArrow: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING['2xl'],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  actionLabel: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
});
