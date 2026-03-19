import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/theme';

type UserItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  created_at: string;
};

export default function UsersScreen() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'client' | 'professional' | 'admin'>('all');
  const insets = useSafeAreaInsets();

  async function loadUsers() {
    try {
      const data = await api.getAdminUsers({
        role: roleFilter,
        search: search.trim() || undefined,
      });
      setUsers(data || []);
    } catch (e) {
      console.warn('Error loading users:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadUsers();
  }, [roleFilter, search]);

  async function onRefresh() {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  }

  function getRoleBadge(role: string) {
    switch (role) {
      case 'client': return { text: 'Cliente', bg: '#DBEAFE', color: '#1E40AF', icon: 'person' as const };
      case 'professional': return { text: 'Profesional', bg: '#D1FAE5', color: '#065F46', icon: 'briefcase' as const };
      case 'both': return { text: 'Ambos', bg: '#E9D5FF', color: '#6B21A8', icon: 'people' as const };
      case 'admin': return { text: 'Admin', bg: '#FEE2E2', color: '#991B1B', icon: 'shield' as const };
      default: return { text: role, bg: '#E5E7EB', color: '#374151', icon: 'person' as const };
    }
  }

  function getInitials(name: string) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0].toUpperCase();
  }

  const initialsColors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];

  function getInitialsColor(name: string) {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return initialsColors[Math.abs(hash) % initialsColors.length];
  }

  const filterLabels: Record<string, string> = {
    all: 'Todos',
    client: 'Clientes',
    professional: 'Profesionales',
    admin: 'Admins',
  };

  function renderUser({ item }: { item: UserItem }) {
    const badge = getRoleBadge(item.role);
    const bgColor = getInitialsColor(item.name);
    return (
      <View style={styles.userCard}>
        <View style={styles.userRow}>
          <View style={[styles.avatarCircle, { backgroundColor: bgColor }]}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <View style={styles.userEmailRow}>
              <Ionicons name="mail-outline" size={13} color={COLORS.textSecondary} />
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
            {item.phone && (
              <View style={styles.userEmailRow}>
                <Ionicons name="call-outline" size={13} color={COLORS.textMuted} />
                <Text style={styles.userPhone}>{item.phone}</Text>
              </View>
            )}
            <Text style={styles.userDate}>
              {new Date(item.created_at).toLocaleDateString('es-AR')}
            </Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon} size={12} color={badge.color} />
            <Text style={[styles.roleBadgeText, { color: badge.color }]}>{badge.text}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <Text style={styles.headerTitle}>Usuarios</Text>
        <Text style={styles.headerCount}>{users.length} encontrados</Text>
      </View>

      {/* Search & Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchCard}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o email..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          {(['all', 'client', 'professional', 'admin'] as const).map(f => {
            const active = roleFilter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setRoleFilter(f)}
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
          data={users}
          renderItem={renderUser}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="search-outline" size={36} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyText}>No se encontraron usuarios</Text>
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
    backgroundColor: COLORS.background,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.md : 0,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: Platform.OS === 'ios' ? 0 : SPACING.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
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
    fontSize: 12,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: COLORS.white,
  },
  filterPillTextInactive: {
    color: COLORS.textSecondary,
  },
  userCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  userEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  userEmail: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  userPhone: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  userDate: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
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
