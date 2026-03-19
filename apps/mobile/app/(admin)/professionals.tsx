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
import { api } from '@/services/api';

type Professional = {
  id: string;
  user_id: string;
  bio: string | null;
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
      id: string;
      name: string;
    };
  }[];
};

type Category = {
  id: string;
  name: string;
};

export default function ProfessionalsScreen() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'verified' | 'all'>('pending');
  const [selectedPro, setSelectedPro] = useState<Professional | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // For category assignment on approval
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [assignCategoryIds, setAssignCategoryIds] = useState<string[]>([]);

  useEffect(() => {
    api.getCategories()
      .then((data) => setAllCategories(data ?? []))
      .catch((e) => console.warn('Error loading categories:', e));
  }, []);

  async function loadProfessionals() {
    try {
      const data = await api.getAdminProfessionals(filter);
      setProfessionals(data || []);
    } catch (e) {
      console.warn('Error loading professionals:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadProfessionals();
  }, [filter]);

  // When selecting a professional, pre-fill their existing categories
  function openDetail(pro: Professional) {
    const existingIds = pro.categories?.map(c => c.category?.id).filter(Boolean) as string[] ?? [];
    setAssignCategoryIds(existingIds);
    setSelectedPro(pro);
  }

  function toggleCategory(id: string) {
    setAssignCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadProfessionals();
    setRefreshing(false);
  }

  async function handleApprove(pro: Professional) {
    if (assignCategoryIds.length === 0) {
      Alert.alert('Error', 'Asigná al menos una categoría antes de aprobar.');
      return;
    }

    Alert.alert(
      'Aprobar profesional',
      `¿Aprobar a ${pro.user?.name || 'este profesional'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.approveProfessional(pro.id, assignCategoryIds);
              Alert.alert('Listo', `${pro.user?.name} fue aprobado`);
              setSelectedPro(null);
              loadProfessionals();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'No se pudo aprobar');
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
            try {
              await api.rejectProfessional(pro.id);
              Alert.alert('Listo', `${pro.user?.name} fue rechazado`);
              setSelectedPro(null);
              loadProfessionals();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'No se pudo rechazar');
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
        onPress={() => openDetail(item)}
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
                  {selectedPro.bio && (
                    <Text style={{ color: '#CBD5E1', fontSize: 13, marginTop: 8, fontStyle: 'italic' }}>
                      "{selectedPro.bio}"
                    </Text>
                  )}
                  {selectedPro.license_number && (
                    <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 4 }}>
                      Matrícula: {selectedPro.license_number}
                    </Text>
                  )}
                  <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 8 }}>
                    Registrado: {new Date(selectedPro.created_at).toLocaleDateString('es-AR')}
                  </Text>
                </View>

                {/* Category assignment */}
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
                  Categorías asignadas
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 12 }}>
                  {selectedPro.status === 'pending_verification'
                    ? 'Revisá y ajustá las categorías antes de aprobar'
                    : 'Categorías del profesional'}
                </Text>

                <View style={{ gap: 6, marginBottom: 16 }}>
                  {allCategories.map((cat) => {
                    const selected = assignCategoryIds.includes(cat.id);
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => {
                          if (selectedPro.status === 'pending_verification' || selectedPro.status === 'verified') {
                            toggleCategory(cat.id);
                          }
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: selected ? '#1E3A5F' : '#1E293B',
                          borderRadius: 8,
                          padding: 12,
                          borderWidth: selected ? 1 : 0,
                          borderColor: '#60A5FA',
                        }}
                      >
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            borderWidth: 2,
                            borderColor: selected ? '#60A5FA' : '#4B5563',
                            backgroundColor: selected ? '#60A5FA' : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 10,
                          }}
                        >
                          {selected && (
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                          )}
                        </View>
                        <Text style={{ color: 'white', fontSize: 14 }}>{cat.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
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
                        Rechazar
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
                          Aprobar
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {selectedPro.status === 'verified' && (
                  <View style={{ marginTop: 16, marginBottom: 40 }}>
                    <View style={{ backgroundColor: '#D1FAE5', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 }}>
                      <Text style={{ color: '#065F46', fontWeight: 'bold', fontSize: 16 }}>
                        Profesional verificado ✓
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={async () => {
                        if (assignCategoryIds.length === 0) {
                          Alert.alert('Error', 'Seleccioná al menos una categoría.');
                          return;
                        }
                        setActionLoading(true);
                        try {
                          await api.approveProfessional(selectedPro.id, assignCategoryIds);
                          Alert.alert('Listo', 'Categorías actualizadas');
                          loadProfessionals();
                        } catch (e: any) {
                          Alert.alert('Error', e.message || 'No se pudo actualizar');
                        }
                        setActionLoading(false);
                      }}
                      disabled={actionLoading}
                      style={{
                        backgroundColor: '#3B82F6',
                        borderRadius: 12,
                        padding: 14,
                        alignItems: 'center',
                      }}
                    >
                      {actionLoading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                          Actualizar categorías
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {selectedPro.status === 'suspended' && (
                  <View style={{ backgroundColor: '#FEE2E2', borderRadius: 12, padding: 16, marginTop: 16, marginBottom: 40, alignItems: 'center' }}>
                    <Text style={{ color: '#991B1B', fontWeight: 'bold', fontSize: 16 }}>
                      Profesional suspendido
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
