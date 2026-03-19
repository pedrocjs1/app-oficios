import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, SHADOWS, RADIUS } from '@/constants/theme';
import { CardSkeleton } from '@/components/SkeletonLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ServiceRequest = {
  id: string;
  problem_type: string;
  description: string | null;
  urgency: string;
  proposals_count: number;
  max_proposals: number;
  created_at: string;
  categories: { name: string } | null;
};

const URGENCY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  normal: { label: 'Normal', color: '#6B7280', bg: '#F3F4F6', icon: 'time-outline' },
  urgent: { label: 'Urgente', color: '#F59E0B', bg: '#FEF3C7', icon: 'alert-circle-outline' },
  emergency: { label: 'Emergencia', color: '#EF4444', bg: '#FEE2E2', icon: 'warning-outline' },
};

export default function ProfessionalFeedScreen() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [stats, setStats] = useState({ jobsCompleted: 0, rating: 0 });
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
      checkVerificationStatus();
      loadStats();
    }, [])
  );

  useEffect(() => {
    const channel = supabase
      .channel('professional-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests' }, fetchRequests)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function checkVerificationStatus() {
    if (!user?.id) return;
    try {
      const profile = await api.getProfile();
      if (profile?.professional_status) {
        setVerificationStatus(profile.professional_status);
      }
    } catch (e) {
      console.warn('Error checking verification:', e);
    }
  }

  async function loadStats() {
    if (!user?.id) return;
    try {
      const profile = await api.getProfile();
      if (profile) {
        setStats({
          jobsCompleted: profile.jobs_completed ?? 0,
          rating: profile.rating_avg ?? 0,
        });
      }
    } catch (e) {
      console.warn('Error loading stats:', e);
    }
  }

  async function fetchRequests() {
    try {
      const data = await api.getRequests({ status: 'open' });
      setRequests(data ?? []);
    } catch (e) {
      console.warn('Error fetching requests:', e);
    }
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([fetchRequests(), loadStats()]);
    setRefreshing(false);
  }

  const firstName = user?.name?.split(' ')[0] ?? 'Profesional';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.secondary]} tintColor={COLORS.secondary} />
      }
    >
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.secondary, '#2A3F55']}
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 24,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>Hola,</Text>
        <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.white }}>{firstName} 👷</Text>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: RADIUS.md,
              padding: 14,
              alignItems: 'center',
            }}
          >
            <Ionicons name="briefcase" size={20} color={COLORS.accent} />
            <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.white, marginTop: 4 }}>
              {stats.jobsCompleted}
            </Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Trabajos</Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: RADIUS.md,
              padding: 14,
              alignItems: 'center',
            }}
          >
            <Ionicons name="star" size={20} color="#FBBF24" />
            <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.white, marginTop: 4 }}>
              {stats.rating > 0 ? stats.rating.toFixed(1) : '—'}
            </Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Rating</Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: RADIUS.md,
              padding: 14,
              alignItems: 'center',
            }}
          >
            <Ionicons name="document-text" size={20} color={COLORS.primary} />
            <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.white, marginTop: 4 }}>
              {requests.length}
            </Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Disponibles</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Verification banner */}
      {verificationStatus === 'pending_verification' && (
        <View
          style={{
            marginHorizontal: 20,
            marginTop: 16,
            backgroundColor: COLORS.warningLight,
            borderRadius: RADIUS.md,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Ionicons name="time" size={20} color={COLORS.warning} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400E' }}>Perfil en revisión</Text>
            <Text style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>
              Te notificaremos cuando sea aprobado.
            </Text>
          </View>
        </View>
      )}

      {verificationStatus === 'suspended' && (
        <View
          style={{
            marginHorizontal: 20,
            marginTop: 16,
            backgroundColor: COLORS.dangerLight,
            borderRadius: RADIUS.md,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Ionicons name="close-circle" size={20} color={COLORS.danger} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#991B1B' }}>Cuenta suspendida</Text>
            <Text style={{ fontSize: 12, color: '#991B1B', marginTop: 2 }}>
              Contactá a soporte para más información.
            </Text>
          </View>
        </View>
      )}

      {/* Requests list */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.secondary, marginBottom: 14 }}>
          Pedidos disponibles
        </Text>

        {loading ? (
          <View style={{ gap: 12 }}>
            <CardSkeleton />
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
                backgroundColor: COLORS.secondaryLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Ionicons name="search" size={32} color={COLORS.secondary} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.secondary, textAlign: 'center' }}>
              No hay pedidos disponibles
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 }}>
              Te notificaremos cuando lleguen nuevos pedidos
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {requests.map((req) => {
              const urgency = URGENCY_CONFIG[req.urgency] ?? URGENCY_CONFIG.normal;
              const spotsLeft = req.max_proposals - req.proposals_count;

              return (
                <TouchableOpacity
                  key={req.id}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/(professional)/request/${req.id}`)}
                  style={{
                    backgroundColor: COLORS.card,
                    borderRadius: RADIUS.lg,
                    padding: 16,
                    ...SHADOWS.md,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.secondary, flex: 1, marginRight: 8 }} numberOfLines={1}>
                      {req.categories?.name ?? 'Servicio'}
                    </Text>
                    <View style={{ backgroundColor: urgency.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name={urgency.icon as any} size={12} color={urgency.color} />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: urgency.color }}>{urgency.label}</Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.text }}>{req.problem_type}</Text>

                  {req.description && (
                    <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }} numberOfLines={2}>
                      {req.description}
                    </Text>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight }}>
                    <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                      {new Date(req.created_at).toLocaleDateString('es-AR')}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="people-outline" size={14} color={spotsLeft > 0 ? COLORS.accent : COLORS.danger} />
                      <Text style={{ fontSize: 12, fontWeight: '500', color: spotsLeft > 0 ? COLORS.accent : COLORS.danger }}>
                        {spotsLeft > 0 ? `${spotsLeft} lugar${spotsLeft !== 1 ? 'es' : ''}` : 'Sin lugares'}
                      </Text>
                    </View>
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
