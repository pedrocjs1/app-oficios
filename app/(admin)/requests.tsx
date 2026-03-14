import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';

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

export default function RequestsScreen() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');

  async function loadRequests() {
    try {
      let query = supabase
        .from('service_requests')
        .select(`
          *,
          client:users!service_requests_client_id_fkey(name, email),
          category:categories(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter === 'active') {
        query = query.in('status', ['open', 'in_proposals', 'assigned', 'in_progress']);
      } else if (filter === 'completed') {
        query = query.in('status', ['completed', 'cancelled']);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Error loading requests:', error);
        return;
      }
      setRequests(data || []);
    } catch (e) {
      console.warn('Error:', e);
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
      case 'in_proposals': return { text: 'Propuestas', bg: '#FEF3C7', color: '#92400E' };
      case 'assigned': return { text: 'Asignado', bg: '#E9D5FF', color: '#6B21A8' };
      case 'in_progress': return { text: 'En curso', bg: '#D1FAE5', color: '#065F46' };
      case 'completed': return { text: 'Completado', bg: '#D1FAE5', color: '#065F46' };
      case 'cancelled': return { text: 'Cancelado', bg: '#FEE2E2', color: '#991B1B' };
      default: return { text: status, bg: '#E5E7EB', color: '#374151' };
    }
  }

  function getUrgencyBadge(urgency: string) {
    switch (urgency) {
      case 'urgent': return { text: 'Urgente', color: '#F59E0B' };
      case 'emergency': return { text: 'Emergencia', color: '#EF4444' };
      default: return { text: 'Normal', color: '#6B7280' };
    }
  }

  function renderRequest({ item }: { item: ServiceRequest }) {
    const statusBadge = getStatusBadge(item.status);
    const urgencyBadge = getUrgencyBadge(item.urgency);

    return (
      <View
        style={{
          backgroundColor: '#1E293B',
          borderRadius: 12,
          padding: 16,
          marginBottom: 8,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
              {item.category?.name || 'Sin categoría'}
            </Text>
            <Text style={{ color: '#CBD5E1', fontSize: 13, marginTop: 4 }} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 6 }}>
              Cliente: {item.client?.name || 'Desconocido'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <Text style={{ color: urgencyBadge.color, fontSize: 12, fontWeight: '600' }}>
                {urgencyBadge.text}
              </Text>
              {item.budget_min && item.budget_max && (
                <Text style={{ color: '#6B7280', fontSize: 12 }}>
                  ${item.budget_min.toLocaleString()} - ${item.budget_max.toLocaleString()}
                </Text>
              )}
            </View>
            <Text style={{ color: '#6B7280', fontSize: 11, marginTop: 4 }}>
              {new Date(item.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={{ backgroundColor: statusBadge.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ color: statusBadge.color, fontSize: 12, fontWeight: '600' }}>{statusBadge.text}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>
          Pedidos 📋
        </Text>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['active', 'completed', 'all'] as const).map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: filter === f ? '#FF6B1A' : '#1E293B',
              }}
            >
              <Text style={{ color: 'white', fontSize: 13, fontWeight: filter === f ? '700' : '400' }}>
                {f === 'active' ? 'Activos' : f === 'completed' ? 'Finalizados' : 'Todos'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FF6B1A" />
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B1A" />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 48 }}>📭</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 16, marginTop: 12 }}>
                No hay pedidos
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
