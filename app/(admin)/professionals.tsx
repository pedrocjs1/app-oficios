import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';

type Professional = {
  id: string;
  user_id: string;
  license_number: string | null;
  license_photo_url: string | null;
  dni_photo_url: string | null;
  selfie_url: string | null;
  verified: boolean;
  status: string;
  created_at: string;
  user: {
    name: string;
    email: string;
    phone: string | null;
  };
  categories: {
    category: {
      name: string;
    };
  }[];
};

export default function ProfessionalsScreen() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'verified' | 'all'>('pending');
  const [selectedPro, setSelectedPro] = useState<Professional | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadProfessionals() {
    try {
      let query = supabase
        .from('professionals')
        .select(`
          *,
          user:users!professionals_user_id_fkey(name, email, phone),
          categories:professional_categories(category:categories(name))
        `)
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('status', 'pending_verification');
      } else if (filter === 'verified') {
        query = query.eq('status', 'verified');
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Error loading professionals:', error);
        return;
      }
      setProfessionals(data || []);
    } catch (e) {
      console.warn('Error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadProfessionals();
  }, [filter]);

  async function onRefresh() {
    setRefreshing(true);
    await loadProfessionals();
    setRefreshing(false);
  }

  async function handleApprove(pro: Professional) {
    Alert.alert(
      'Aprobar profesional',
      `¿Aprobar a ${pro.user?.name || 'este profesional'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          onPress: async () => {
            setActionLoading(true);
            const { error } = await supabase
              .from('professionals')
              .update({ verified: true, status: 'verified' })
              .eq('id', pro.id);

            if (error) {
              Alert.alert('Error', error.message);
            } else {
              Alert.alert('Listo', `${pro.user?.name} fue aprobado ✅`);
              setSelectedPro(null);
              loadProfessionals();
            }
            setActionLoading(false);
          },
        },
      ]
    );
  }

  async function handleReject(pro: Professional) {
    Alert.alert(
      'Rechazar profesional',
      `¿Rechazar a ${pro.user?.name || 'este profesional'}? Se suspenderá su cuenta.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const { error } = await supabase
              .from('professionals')
              .update({ verified: false, status: 'suspended' })
              .eq('id', pro.id);

            if (error) {
              Alert.alert('Error', error.message);
            } else {
              Alert.alert('Listo', `${pro.user?.name} fue rechazado`);
              setSelectedPro(null);
              loadProfessionals();
            }
            setActionLoading(false);
          },
        },
      ]
    );
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'pending_verification':
        return { text: 'Pendiente', bg: '#FEF3C7', color: '#92400E' };
      case 'verified':
        return { text: 'Verificado', bg: '#D1FAE5', color: '#065F46' };
      case 'suspended':
        return { text: 'Suspendido', bg: '#FEE2E2', color: '#991B1B' };
      default:
        return { text: status, bg: '#E5E7EB', color: '#374151' };
    }
  }

  function renderProfessional({ item }: { item: Professional }) {
    const badge = getStatusBadge(item.status);
    const categories = item.categories?.map(c => c.category?.name).filter(Boolean).join(', ') || 'Sin categoría';

    return (
      <TouchableOpacity
        onPress={() => setSelectedPro(item)}
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
              {item.user?.name || 'Sin nombre'}
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 13, marginTop: 2 }}>
              {item.user?.email}
            </Text>
            <Text style={{ color: '#60A5FA', fontSize: 13, marginTop: 4 }}>
              {categories}
            </Text>
            {item.license_number && (
              <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>
                Matrícula: {item.license_number}
              </Text>
            )}
          </View>
          <View style={{ backgroundColor: badge.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ color: badge.color, fontSize: 12, fontWeight: '600' }}>{badge.text}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* Header */}
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>
          Profesionales 👷
        </Text>
      </View>

      {/* Filters */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 }}>
        {(['pending', 'verified', 'all'] as const).map(f => (
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
              {f === 'pending' ? 'Pendientes' : f === 'verified' ? 'Verificados' : 'Todos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FF6B1A" />
        </View>
      ) : (
        <FlatList
          data={professionals}
          renderItem={renderProfessional}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B1A" />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 48 }}>✅</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 16, marginTop: 12 }}>
                {filter === 'pending' ? 'No hay profesionales pendientes' : 'No se encontraron profesionales'}
              </Text>
            </View>
          }
        />
      )}

      {/* Detail Modal */}
      <Modal visible={!!selectedPro} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
                Detalle del profesional
              </Text>
              <TouchableOpacity onPress={() => setSelectedPro(null)}>
                <Text style={{ color: '#FF6B1A', fontSize: 16, fontWeight: '600' }}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            {selectedPro && (
              <>
                {/* Info */}
                <View style={{ backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
                    {selectedPro.user?.name}
                  </Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 4 }}>
                    {selectedPro.user?.email}
                  </Text>
                  {selectedPro.user?.phone && (
                    <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 2 }}>
                      Tel: {selectedPro.user.phone}
                    </Text>
                  )}
                  <Text style={{ color: '#60A5FA', fontSize: 14, marginTop: 8 }}>
                    Categorías: {selectedPro.categories?.map(c => c.category?.name).filter(Boolean).join(', ') || 'Sin categoría'}
                  </Text>
                  {selectedPro.license_number && (
                    <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 4 }}>
                      Matrícula: {selectedPro.license_number}
                    </Text>
                  )}
                  <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 8 }}>
                    Registrado: {new Date(selectedPro.created_at).toLocaleDateString('es-AR')}
                  </Text>
                </View>

                {/* Documents */}
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
                  Documentación
                </Text>

                {selectedPro.license_photo_url ? (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 4 }}>Matrícula/Habilitación:</Text>
                    <Image
                      source={{ uri: selectedPro.license_photo_url }}
                      style={{ width: '100%', height: 200, borderRadius: 8, backgroundColor: '#374151' }}
                      resizeMode="contain"
                    />
                  </View>
                ) : (
                  <Text style={{ color: '#6B7280', fontSize: 13, marginBottom: 12 }}>Sin foto de matrícula</Text>
                )}

                {selectedPro.dni_photo_url ? (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 4 }}>DNI (frente):</Text>
                    <Image
                      source={{ uri: selectedPro.dni_photo_url }}
                      style={{ width: '100%', height: 200, borderRadius: 8, backgroundColor: '#374151' }}
                      resizeMode="contain"
                    />
                  </View>
                ) : (
                  <Text style={{ color: '#6B7280', fontSize: 13, marginBottom: 12 }}>Sin foto de DNI</Text>
                )}

                {selectedPro.selfie_url ? (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 4 }}>Selfie con DNI:</Text>
                    <Image
                      source={{ uri: selectedPro.selfie_url }}
                      style={{ width: '100%', height: 200, borderRadius: 8, backgroundColor: '#374151' }}
                      resizeMode="contain"
                    />
                  </View>
                ) : (
                  <Text style={{ color: '#6B7280', fontSize: 13, marginBottom: 12 }}>Sin selfie</Text>
                )}

                {/* Action Buttons */}
                {selectedPro.status === 'pending_verification' && (
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 40 }}>
                    <TouchableOpacity
                      onPress={() => handleReject(selectedPro)}
                      disabled={actionLoading}
                      style={{
                        flex: 1,
                        backgroundColor: '#EF4444',
                        borderRadius: 12,
                        padding: 16,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                        Rechazar ✕
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleApprove(selectedPro)}
                      disabled={actionLoading}
                      style={{
                        flex: 1,
                        backgroundColor: '#10B981',
                        borderRadius: 12,
                        padding: 16,
                        alignItems: 'center',
                      }}
                    >
                      {actionLoading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                          Aprobar ✓
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {selectedPro.status === 'verified' && (
                  <View style={{ backgroundColor: '#D1FAE5', borderRadius: 12, padding: 16, marginTop: 16, alignItems: 'center' }}>
                    <Text style={{ color: '#065F46', fontWeight: 'bold', fontSize: 16 }}>
                      ✅ Profesional verificado
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
