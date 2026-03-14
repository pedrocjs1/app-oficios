import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Image, StatusBar } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, SHADOWS, RADIUS } from '@/constants/theme';
import { CardSkeleton } from '@/components/SkeletonLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ServiceRequest = {
  id: string;
  problem_type: string;
  status: string;
  urgency: string;
  proposals_count: number;
  created_at: string;
  categories: { name: string } | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  open: { label: 'Abierto', color: '#3B82F6', bg: '#EFF6FF', icon: 'radio-button-on' },
  in_proposals: { label: 'Con propuestas', color: COLORS.primary, bg: COLORS.primaryLight, icon: 'chatbubbles' },
  assigned: { label: 'Asignado', color: COLORS.accent, bg: COLORS.accentLight, icon: 'checkmark-circle' },
  in_progress: { label: 'En progreso', color: '#8B5CF6', bg: '#F5F3FF', icon: 'hammer' },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  normal: { label: 'Normal', color: '#6B7280', bg: '#F3F4F6' },
  urgent: { label: 'Urgente', color: '#F59E0B', bg: '#FEF3C7' },
  emergency: { label: 'Emergencia', color: '#EF4444', bg: '#FEE2E2' },
};

export default function ClientHomeScreen() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [])
  );

  useEffect(() => {
    const channel = supabase
      .channel('client-requests')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'service_requests',
        filter: `client_id=eq.${user?.id}`,
      }, fetchRequests)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchRequests() {
    const { data } = await supabase
      .from('service_requests')
      .select('*, categories(name)')
      .eq('client_id', user?.id)
      .in('status', ['open', 'in_proposals', 'assigned', 'in_progress'])
      .order('created_at', { ascending: false });

    setRequests(data ?? []);
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  }

  const firstName = user?.name?.split(' ')[0] ?? 'Bienvenido';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
      }
    >
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 20,
          backgroundColor: COLORS.card,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          ...SHADOWS.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, color: COLORS.textMuted }}>Hola,</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.secondary }}>
              {firstName} 👋
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(client)/profile')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: COLORS.primaryLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {user?.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={{ width: 44, height: 44, borderRadius: 22 }}
              />
            ) : (
              <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.primary }}>
                {user?.name?.charAt(0).toUpperCase() ?? '?'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* CTA Card */}
      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/(client)/new-request')}
        >
          <LinearGradient
            colors={[COLORS.primary, '#E55A1F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: RADIUS.lg,
              padding: 24,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: '700' }}>
                ¿Necesitás ayuda?
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 }}>
                Publicá tu pedido y recibí propuestas
              </Text>
            </View>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="add" size={28} color={COLORS.white} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Active requests */}
      <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.secondary, marginBottom: 16 }}>
          Tus pedidos activos
        </Text>

        {loading ? (
          <View style={{ gap: 12 }}>
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : requests.length === 0 ? (
          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: RADIUS.lg,
              padding: 32,
              alignItems: 'center',
              ...SHADOWS.md,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: COLORS.primaryLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Ionicons name="clipboard-outline" size={32} color={COLORS.primary} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.secondary, textAlign: 'center' }}>
              No tenés pedidos activos
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 }}>
              Publicá tu primer pedido y conectate con profesionales
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {requests.map((req) => {
              const statusCfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.open;
              const urgencyCfg = URGENCY_CONFIG[req.urgency] ?? URGENCY_CONFIG.normal;

              return (
                <TouchableOpacity
                  key={req.id}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/(client)/request/${req.id}`)}
                  style={{
                    backgroundColor: COLORS.card,
                    borderRadius: RADIUS.lg,
                    padding: 16,
                    ...SHADOWS.md,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <Ionicons name={statusCfg.icon as any} size={16} color={statusCfg.color} />
                      <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.secondary, flex: 1 }} numberOfLines={1}>
                        {req.categories?.name ?? 'Servicio'}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: statusCfg.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: statusCfg.color }}>
                        {statusCfg.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 14, color: COLORS.textSecondary }} numberOfLines={2}>
                    {req.problem_type}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight }}>
                    <View style={{ backgroundColor: urgencyCfg.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: '500', color: urgencyCfg.color }}>
                        {urgencyCfg.label}
                      </Text>
                    </View>
                    {req.proposals_count > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="chatbubbles-outline" size={14} color={COLORS.primary} />
                        <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.primary }}>
                          {req.proposals_count} propuesta{req.proposals_count !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
