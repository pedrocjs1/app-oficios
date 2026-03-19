import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  RefreshControl,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { router, useFocusEffect } from 'expo-router';
import { COLORS, SHADOWS, RADIUS } from '@/constants/theme';
import { SafeImage } from '@/components/SafeImage';

export default function ClientProfileScreen() {
  const { user, setSession, setUser } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [user?.id])
  );

  async function refreshProfile() {
    if (!user?.id) return;
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) setUser(data);
  }

  async function onRefresh() {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  }

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  const menuItems = [
    {
      icon: 'create-outline' as const,
      label: 'Editar perfil',
      onPress: () => router.push('/(client)/edit-profile'),
    },
    {
      icon: 'star-outline' as const,
      label: 'Mis reseñas',
      onPress: () => Alert.alert('Próximamente', 'Esta función estará disponible pronto.'),
    },
    {
      icon: 'document-text-outline' as const,
      label: 'Historial de pedidos',
      onPress: () => router.push('/(client)/history'),
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>Mi perfil</Text>
        </View>

        {/* Avatar Card */}
        <View style={[styles.avatarCard, SHADOWS.md]}>
          <View style={styles.avatarContainer}>
            {user?.avatar_url ? (
              <SafeImage uri={user.avatar_url} style={styles.avatar} fallbackIcon="person" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {user?.name?.charAt(0).toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.cameraOverlay}
              onPress={() => router.push('/(client)/edit-profile')}
            >
              <Ionicons name="camera" size={14} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{user?.name}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{user?.email}</Text>
          </View>
          {user?.phone ? (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>{user.phone}</Text>
            </View>
          ) : null}
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, SHADOWS.sm]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name={item.icon} size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
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
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  avatarCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: RADIUS.lg,
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  menuSection: {
    marginHorizontal: 16,
    marginTop: 20,
    gap: 10,
  },
  menuItem: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  logoutSection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.dangerLight,
    borderRadius: RADIUS.md,
    padding: 14,
    backgroundColor: COLORS.card,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.danger,
  },
});
