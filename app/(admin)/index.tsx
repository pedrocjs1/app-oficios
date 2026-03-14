import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

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

  async function loadStats() {
    try {
      const [usersRes, prosRes, pendingRes, requestsRes, jobsRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('professionals').select('id', { count: 'exact', head: true }),
        supabase.from('professionals').select('id', { count: 'exact', head: true }).eq('status', 'pending_verification'),
        supabase.from('service_requests').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_proposals', 'assigned', 'in_progress']),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalProfessionals: prosRes.count || 0,
        pendingVerification: pendingRes.count || 0,
        activeRequests: requestsRes.count || 0,
        completedJobs: jobsRes.count || 0,
        totalRevenue: 0,
      });
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

  function handleLogout() {
    supabase.auth.signOut();
  }

  const statCards = [
    { label: 'Usuarios totales', value: stats.totalUsers, icon: '👥', color: '#3B82F6' },
    { label: 'Profesionales', value: stats.totalProfessionals, icon: '👷', color: '#10B981' },
    { label: 'Pendientes verificación', value: stats.pendingVerification, icon: '⏳', color: '#F59E0B', action: () => router.push('/(admin)/professionals') },
    { label: 'Pedidos activos', value: stats.activeRequests, icon: '📋', color: '#8B5CF6' },
    { label: 'Trabajos completados', value: stats.completedJobs, icon: '✅', color: '#06B6D4' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B1A" />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <View>
            <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Admin Panel</Text>
            <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>
              OficioYa 🛠️
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            style={{ backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* Stat Cards */}
        <View style={{ gap: 12 }}>
          {statCards.map((card, i) => (
            <TouchableOpacity
              key={i}
              onPress={card.action}
              disabled={!card.action}
              style={{
                backgroundColor: '#1E293B',
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                borderLeftWidth: 4,
                borderLeftColor: card.color,
              }}
            >
              <Text style={{ fontSize: 28, marginRight: 16 }}>{card.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 13 }}>{card.label}</Text>
                <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}>
                  {card.value}
                </Text>
              </View>
              {card.action && (
                <Text style={{ color: '#FF6B1A', fontSize: 24 }}>→</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 24, marginBottom: 12 }}>
          Acciones rápidas
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.push('/(admin)/professionals')}
            style={{
              flex: 1,
              backgroundColor: '#FF6B1A',
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 24, marginBottom: 4 }}>👷</Text>
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 13, textAlign: 'center' }}>
              Verificar profesionales
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(admin)/requests')}
            style={{
              flex: 1,
              backgroundColor: '#1A3C5E',
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 24, marginBottom: 4 }}>📋</Text>
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 13, textAlign: 'center' }}>
              Ver pedidos
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
