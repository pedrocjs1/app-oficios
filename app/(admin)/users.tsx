import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';

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

  async function loadUsers() {
    try {
      let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      if (search.trim()) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Error loading users:', error);
        return;
      }
      setUsers(data || []);
    } catch (e) {
      console.warn('Error:', e);
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
      case 'client': return { text: 'Cliente', bg: '#DBEAFE', color: '#1E40AF' };
      case 'professional': return { text: 'Profesional', bg: '#D1FAE5', color: '#065F46' };
      case 'both': return { text: 'Ambos', bg: '#E9D5FF', color: '#6B21A8' };
      case 'admin': return { text: 'Admin', bg: '#FEE2E2', color: '#991B1B' };
      default: return { text: role, bg: '#E5E7EB', color: '#374151' };
    }
  }

  function renderUser({ item }: { item: UserItem }) {
    const badge = getRoleBadge(item.role);
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
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
              {item.name}
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 13, marginTop: 2 }}>
              {item.email}
            </Text>
            {item.phone && (
              <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>
                Tel: {item.phone}
              </Text>
            )}
            <Text style={{ color: '#6B7280', fontSize: 11, marginTop: 4 }}>
              {new Date(item.created_at).toLocaleDateString('es-AR')}
            </Text>
          </View>
          <View style={{ backgroundColor: badge.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ color: badge.color, fontSize: 12, fontWeight: '600' }}>{badge.text}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>
          Usuarios 👥
        </Text>

        {/* Search */}
        <TextInput
          style={{
            backgroundColor: '#1E293B',
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            color: 'white',
            fontSize: 14,
            marginBottom: 10,
          }}
          placeholder="Buscar por nombre o email..."
          placeholderTextColor="#6B7280"
          value={search}
          onChangeText={setSearch}
        />

        {/* Role Filters */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['all', 'client', 'professional', 'admin'] as const).map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setRoleFilter(f)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: roleFilter === f ? '#FF6B1A' : '#1E293B',
              }}
            >
              <Text style={{ color: 'white', fontSize: 12, fontWeight: roleFilter === f ? '700' : '400' }}>
                {f === 'all' ? 'Todos' : f === 'client' ? 'Clientes' : f === 'professional' ? 'Profesionales' : 'Admins'}
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
          data={users}
          renderItem={renderUser}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B1A" />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 48 }}>🔍</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 16, marginTop: 12 }}>
                No se encontraron usuarios
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
