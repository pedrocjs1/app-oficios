import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/uploadImage';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, SHADOWS, RADIUS } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Message = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  flagged: boolean;
};

type Job = {
  id: string;
  status: string;
  agreed_price: number;
  payment_method: string | null;
  completed_at: string | null;
  professional_photos: any;
  users: { name: string; avatar_url: string | null; phone: string | null } | null;
  service_requests: {
    problem_type: string;
    description: string;
    photos: any;
    urgency: string;
    address_text: string | null;
    categories: { name: string } | null;
  } | null;
};

const TIMELINE_STEPS = [
  { key: 'pending_start', label: 'Aceptado', icon: 'checkmark-circle' as const },
  { key: 'in_progress', label: 'En progreso', icon: 'construct' as const },
  { key: 'completed_by_professional', label: 'Completado', icon: 'checkmark-done' as const },
  { key: 'confirmed', label: 'Confirmado', icon: 'shield-checkmark' as const },
];

const STATUS_ORDER = ['pending_start', 'in_progress', 'completed_by_professional', 'confirmed'];

function parsePhotos(photos: any): string[] {
  if (!photos) return [];
  if (Array.isArray(photos)) {
    return photos.filter((url: any) => typeof url === 'string' && url.length > 0);
  }
  if (typeof photos === 'string') {
    try {
      const parsed = JSON.parse(photos);
      if (Array.isArray(parsed)) {
        return parsed.filter((url: any) => typeof url === 'string' && url.length > 0);
      }
    } catch {
      return [];
    }
  }
  return [];
}

function getStepStatus(stepKey: string, currentStatus: string): 'done' | 'current' | 'pending' {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const stepIdx = STATUS_ORDER.indexOf(stepKey);
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'current';
  return 'pending';
}

export default function ProfessionalJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'detalles' | 'chat'>('detalles');
  const [workPhotos, setWorkPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchJob();
    fetchMessages();

    const channel = supabase
      .channel(`prof-job-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `job_id=eq.${id}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => {
          // Check if this is a message we already added optimistically
          const tempMatch = prev.find((m) =>
            m.id.startsWith('temp-') &&
            m.sender_id === newMsg.sender_id &&
            m.content === newMsg.content
          );
          if (tempMatch) {
            // Replace temp with real message
            return prev.map((m) => m.id === tempMatch.id ? newMsg : m);
          }
          // Skip if already exists by real ID
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter: `id=eq.${id}`,
      }, () => {
        fetchJob();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function fetchJob() {
    const { data } = await supabase
      .from('jobs')
      .select(`
        *,
        users!jobs_client_id_fkey(name, avatar_url, phone),
        service_requests(problem_type, description, photos, urgency, address_text, categories(name))
      `)
      .eq('id', id)
      .single();
    setJob(data);
    setLoading(false);
  }

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('job_id', id)
      .order('created_at');
    setMessages(data ?? []);
  }

  async function sendMessage() {
    if (!newMessage.trim()) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    // Optimistic update: show message immediately
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      content,
      sender_id: user?.id ?? '',
      created_at: new Date().toISOString(),
      flagged: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    const { error } = await supabase.from('messages').insert({
      job_id: id,
      sender_id: user?.id,
      content,
    });

    if (error) {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      Alert.alert('Error', 'No se pudo enviar el mensaje');
      setNewMessage(content);
    }
    // On success, keep the optimistic message. Realtime will bring the real one.
    setSending(false);
  }

  async function pickWorkPhoto() {
    if (workPhotos.length >= 4) {
      Alert.alert('Limite', 'Podes subir hasta 4 fotos');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setWorkPhotos([...workPhotos, result.assets[0].uri]);
    }
  }

  function removeWorkPhoto(index: number) {
    setWorkPhotos(workPhotos.filter((_, i) => i !== index));
  }

  async function uploadWorkPhoto(uri: string, jobId: string, index: number): Promise<string> {
    const url = await uploadImage(uri, 'request-photos', `jobs/${jobId}/${index}.jpg`);
    return url ?? '';
  }

  async function markCompleted() {
    if (workPhotos.length === 0) {
      Alert.alert(
        'Fotos del trabajo',
        'Subi al menos una foto del trabajo terminado antes de marcar como completado.',
      );
      return;
    }

    Alert.alert(
      'Marcar como terminado',
      '¿Terminaste el trabajo? El cliente debera confirmarlo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Si, termine',
          onPress: async () => {
            setUploading(true);
            try {
              // Upload photos
              const photoUrls: string[] = [];
              for (let i = 0; i < workPhotos.length; i++) {
                const url = await uploadWorkPhoto(workPhotos[i], id!, i);
                photoUrls.push(url);
              }

              // Try updating with professional_photos column
              const { error } = await supabase
                .from('jobs')
                .update({
                  status: 'completed_by_professional',
                  completed_at: new Date().toISOString(),
                  professional_photos: photoUrls,
                } as any)
                .eq('id', id);

              if (error) {
                // If professional_photos column doesn't exist, update without it
                const { error: error2 } = await supabase
                  .from('jobs')
                  .update({
                    status: 'completed_by_professional',
                    completed_at: new Date().toISOString(),
                  })
                  .eq('id', id);

                if (error2) {
                  Alert.alert('Error', 'No se pudo actualizar el estado. Intenta de nuevo.');
                  setUploading(false);
                  return;
                }
              }

              setWorkPhotos([]);
              await fetchJob();
            } catch (e) {
              Alert.alert('Error', 'Hubo un problema al subir las fotos. Intenta de nuevo.');
            }
            setUploading(false);
          },
        },
      ]
    );
  }

  const clientName = job?.users?.name ?? 'Cliente';
  const clientAvatar = job?.users?.avatar_url;
  const paymentLabel = job?.payment_method === 'cash' ? 'Efectivo' : job?.payment_method === 'transfer' ? 'Transferencia' : 'Digital';
  const requestPhotos = parsePhotos(job?.service_requests?.photos);
  const professionalPhotos = parsePhotos(job?.professional_photos);

  const statusLabel = (() => {
    switch (job?.status) {
      case 'pending_start': return 'Aceptado';
      case 'in_progress': return 'En progreso';
      case 'completed_by_professional': return 'Esperando confirmacion';
      case 'confirmed': return 'Confirmado';
      default: return '';
    }
  })();

  const statusColor = (() => {
    switch (job?.status) {
      case 'pending_start': return COLORS.accent;
      case 'in_progress': return COLORS.primary;
      case 'completed_by_professional': return COLORS.warning;
      case 'confirmed': return COLORS.success;
      default: return COLORS.textMuted;
    }
  })();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  const commissionRate = 0.10;
  const agreedPrice = job?.agreed_price ?? 0;
  const commissionAmount = agreedPrice * commissionRate;
  const netAmount = agreedPrice - commissionAmount;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.secondary, '#2D3F52']}
        style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 16 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36, height: 36, borderRadius: RADIUS.full,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center', justifyContent: 'center', marginRight: 12,
            }}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>

          {/* Client avatar */}
          <View style={{
            width: 40, height: 40, borderRadius: RADIUS.full, marginRight: 12,
            backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {clientAvatar ? (
              <Image source={{ uri: clientAvatar }} style={{ width: 40, height: 40, borderRadius: RADIUS.full }} />
            ) : (
              <Ionicons name="person" size={20} color="rgba(255,255,255,0.7)" />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.white }}>{clientName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                ${agreedPrice.toLocaleString('es-AR')}
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginHorizontal: 6 }}>·</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{paymentLabel}</Text>
            </View>
          </View>

          {/* Status badge */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: `${statusColor}22`, paddingHorizontal: 10, paddingVertical: 6,
            borderRadius: RADIUS.full, gap: 4,
          }}>
            <View style={{ width: 7, height: 7, borderRadius: RADIUS.full, backgroundColor: statusColor }} />
            <Text style={{ fontSize: 11, color: statusColor, fontWeight: '600' }}>{statusLabel}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tab Toggle */}
      <View style={{
        flexDirection: 'row', backgroundColor: COLORS.white,
        paddingHorizontal: 16, paddingVertical: 6,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
      }}>
        {(['detalles', 'chat'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1, paddingVertical: 10, alignItems: 'center',
              borderBottomWidth: 2.5,
              borderBottomColor: activeTab === tab ? COLORS.secondary : 'transparent',
            }}
          >
            <Text style={{
              fontSize: 14, fontWeight: '600',
              color: activeTab === tab ? COLORS.secondary : COLORS.textMuted,
            }}>
              {tab === 'detalles' ? 'Detalles' : 'Chat'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* DETAILS VIEW */}
      {activeTab === 'detalles' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Confirmed banner */}
          {job?.status === 'confirmed' && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              backgroundColor: COLORS.successLight, paddingVertical: 14, paddingHorizontal: 16,
              borderRadius: RADIUS.md, marginBottom: 16, gap: 8,
            }}>
              <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
              <Text style={{ color: COLORS.success, fontSize: 15, fontWeight: '700' }}>
                Trabajo confirmado
              </Text>
            </View>
          )}

          {/* Waiting banner */}
          {job?.status === 'completed_by_professional' && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              backgroundColor: COLORS.warningLight, paddingVertical: 14, paddingHorizontal: 16,
              borderRadius: RADIUS.md, marginBottom: 16, gap: 8,
            }}>
              <Ionicons name="time-outline" size={22} color={COLORS.warning} />
              <Text style={{ color: '#92400E', fontSize: 15, fontWeight: '600' }}>
                Esperando confirmacion del cliente
              </Text>
            </View>
          )}

          {/* Timeline */}
          <View style={{
            backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
            padding: 20, marginBottom: 16, ...SHADOWS.md,
          }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 16 }}>
              Estado del trabajo
            </Text>
            {TIMELINE_STEPS.map((step, index) => {
              const status = getStepStatus(step.key, job?.status ?? 'pending_start');
              const isLast = index === TIMELINE_STEPS.length - 1;
              const dotColor = status === 'done' ? COLORS.success
                : status === 'current' ? COLORS.primary
                : COLORS.border;
              const lineColor = status === 'done' ? COLORS.success : COLORS.border;
              const textColor = status === 'pending' ? COLORS.textMuted : COLORS.text;

              return (
                <View key={step.key} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  {/* Timeline column */}
                  <View style={{ alignItems: 'center', width: 32 }}>
                    <View style={{
                      width: 28, height: 28, borderRadius: RADIUS.full,
                      backgroundColor: status === 'pending' ? COLORS.borderLight : `${dotColor}18`,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: status === 'current' ? 2 : 0,
                      borderColor: dotColor,
                    }}>
                      <Ionicons
                        name={status === 'done' ? 'checkmark' : step.icon}
                        size={14}
                        color={status === 'pending' ? COLORS.textMuted : dotColor}
                      />
                    </View>
                    {!isLast && (
                      <View style={{
                        width: 2, height: 24, backgroundColor: lineColor,
                        marginVertical: 2,
                      }} />
                    )}
                  </View>
                  {/* Label */}
                  <View style={{ marginLeft: 12, paddingTop: 4, flex: 1 }}>
                    <Text style={{
                      fontSize: 14, fontWeight: status === 'current' ? '700' : '500',
                      color: textColor,
                    }}>
                      {step.label}
                    </Text>
                    {status === 'current' && (
                      <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                        Estado actual
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Work details card */}
          <View style={{
            backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
            padding: 20, marginBottom: 16, ...SHADOWS.md,
          }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 }}>
              Detalles del trabajo
            </Text>

            {job?.service_requests?.categories?.name && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{
                  width: 32, height: 32, borderRadius: RADIUS.sm,
                  backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="construct-outline" size={16} color={COLORS.primary} />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Categoria</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }}>
                    {job.service_requests.categories.name}
                  </Text>
                </View>
              </View>
            )}

            {job?.service_requests?.problem_type && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{
                  width: 32, height: 32, borderRadius: RADIUS.sm,
                  backgroundColor: COLORS.warningLight, alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="alert-circle-outline" size={16} color={COLORS.warning} />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Problema</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }}>
                    {job.service_requests.problem_type}
                  </Text>
                </View>
              </View>
            )}

            {job?.service_requests?.description && (
              <View style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>Descripcion</Text>
                <Text style={{ fontSize: 14, color: COLORS.text, lineHeight: 20 }}>
                  {job.service_requests.description}
                </Text>
              </View>
            )}

            {job?.service_requests?.urgency && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', marginTop: 12,
                backgroundColor: job.service_requests.urgency === 'urgent' ? COLORS.dangerLight : COLORS.accentLight,
                paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full, alignSelf: 'flex-start',
              }}>
                <Ionicons
                  name={job.service_requests.urgency === 'urgent' ? 'flash' : 'time-outline'}
                  size={14}
                  color={job.service_requests.urgency === 'urgent' ? COLORS.danger : COLORS.accent}
                />
                <Text style={{
                  fontSize: 12, fontWeight: '600', marginLeft: 4,
                  color: job.service_requests.urgency === 'urgent' ? COLORS.danger : COLORS.accent,
                }}>
                  {job.service_requests.urgency === 'urgent' ? 'Urgente' : 'Normal'}
                </Text>
              </View>
            )}
          </View>

          {/* Client request photos */}
          {requestPhotos.length > 0 && (
            <View style={{
              backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
              padding: 20, marginBottom: 16, ...SHADOWS.md,
            }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>
                Fotos del cliente
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {requestPhotos.map((url, i) => (
                  <Image
                    key={i}
                    source={{ uri: url }}
                    style={{
                      width: 120, height: 120, borderRadius: RADIUS.md,
                      marginRight: i < requestPhotos.length - 1 ? 10 : 0,
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Mark as completed section */}
          {(job?.status === 'in_progress' || job?.status === 'pending_start') && (
            <View style={{
              backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
              padding: 20, marginBottom: 16, ...SHADOWS.md,
            }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 }}>
                Finalizar trabajo
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 16 }}>
                Subi fotos del trabajo terminado antes de marcar como completado.
              </Text>

              {/* Work photos grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                {workPhotos.map((uri, i) => (
                  <View key={i} style={{ position: 'relative' }}>
                    <Image
                      source={{ uri }}
                      style={{
                        width: (SCREEN_WIDTH - 82) / 4, height: (SCREEN_WIDTH - 82) / 4,
                        borderRadius: RADIUS.sm,
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => removeWorkPhoto(i)}
                      style={{
                        position: 'absolute', top: -6, right: -6,
                        width: 22, height: 22, borderRadius: RADIUS.full,
                        backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="close" size={14} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                ))}
                {workPhotos.length < 4 && (
                  <TouchableOpacity
                    onPress={pickWorkPhoto}
                    style={{
                      width: (SCREEN_WIDTH - 82) / 4, height: (SCREEN_WIDTH - 82) / 4,
                      borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: COLORS.border,
                      borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: COLORS.borderLight,
                    }}
                  >
                    <Ionicons name="camera-outline" size={22} color={COLORS.textMuted} />
                    <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>Agregar</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                onPress={markCompleted}
                disabled={uploading}
                style={{
                  backgroundColor: COLORS.success, paddingVertical: 14,
                  borderRadius: RADIUS.md, alignItems: 'center',
                  opacity: uploading ? 0.6 : 1,
                  flexDirection: 'row', justifyContent: 'center', gap: 8,
                }}
              >
                {uploading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Ionicons name="checkmark-done" size={20} color={COLORS.white} />
                )}
                <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: '700' }}>
                  {uploading ? 'Subiendo fotos...' : 'Marcar como terminado'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Professional work photos (after completion) */}
          {(job?.status === 'completed_by_professional' || job?.status === 'confirmed') && professionalPhotos.length > 0 && (
            <View style={{
              backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
              padding: 20, marginBottom: 16, ...SHADOWS.md,
            }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>
                Fotos del trabajo realizado
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {professionalPhotos.map((url, i) => (
                  <Image
                    key={i}
                    source={{ uri: url }}
                    style={{
                      width: 120, height: 120, borderRadius: RADIUS.md,
                      marginRight: i < professionalPhotos.length - 1 ? 10 : 0,
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Commission info (confirmed) */}
          {job?.status === 'confirmed' && (
            <View style={{
              backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
              padding: 20, marginBottom: 16, ...SHADOWS.md,
            }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 }}>
                Resumen de pago
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Precio acordado</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }}>
                  ${agreedPrice.toLocaleString('es-AR')}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
                  Comision ({(commissionRate * 100).toFixed(0)}%)
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.danger }}>
                  -${commissionAmount.toLocaleString('es-AR')}
                </Text>
              </View>

              <View style={{
                height: 1, backgroundColor: COLORS.border, marginVertical: 10,
              }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>Tu ganancia</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.success }}>
                  ${netAmount.toLocaleString('es-AR')}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* CHAT VIEW */}
      {activeTab === 'chat' && (
        <>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="chatbubbles-outline" size={48} color={COLORS.border} />
                <Text style={{ fontSize: 15, color: COLORS.textMuted, marginTop: 12 }}>
                  No hay mensajes aun
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
                  Envia un mensaje al cliente
                </Text>
              </View>
            )}
            {messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <View
                  key={msg.id}
                  style={{
                    marginBottom: 12, maxWidth: '80%',
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                  }}
                >
                  <View
                    style={{
                      borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 10,
                      ...(msg.flagged
                        ? { backgroundColor: COLORS.warningLight, borderWidth: 1, borderColor: '#FDE68A' }
                        : isMe
                        ? { backgroundColor: COLORS.secondary, borderBottomRightRadius: 4 }
                        : { backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 }),
                    }}
                  >
                    {msg.flagged && (
                      <View style={{ marginBottom: 4 }}>
                        <Ionicons name="warning-outline" size={14} color={COLORS.warning} />
                      </View>
                    )}
                    <Text style={{
                      fontSize: 15, lineHeight: 20,
                      color: msg.flagged ? '#92400E' : isMe ? COLORS.white : COLORS.text,
                      fontStyle: msg.flagged ? 'italic' : 'normal',
                    }}>
                      {msg.content}
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: 11, color: COLORS.textMuted, marginTop: 4,
                    textAlign: isMe ? 'right' : 'left',
                  }}>
                    {new Date(msg.created_at).toLocaleTimeString('es-AR', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
              );
            })}
            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Input bar */}
          {job?.status !== 'confirmed' && (
            <View style={{
              flexDirection: 'row', alignItems: 'flex-end',
              paddingHorizontal: 12, paddingTop: 10,
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: COLORS.white,
              borderTopWidth: 1, borderTopColor: COLORS.border, gap: 8,
            }}>
              <TextInput
                style={{
                  flex: 1, backgroundColor: COLORS.background,
                  borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 10,
                  fontSize: 15, color: COLORS.text, maxHeight: 100,
                }}
                placeholder="Escribi un mensaje..."
                placeholderTextColor={COLORS.textMuted}
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={{
                  width: 42, height: 42, borderRadius: RADIUS.full,
                  backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center',
                  marginBottom: 2, opacity: sending || !newMessage.trim() ? 0.5 : 1,
                }}
                onPress={sendMessage}
                disabled={sending || !newMessage.trim()}
              >
                {sending ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Ionicons name="send" size={18} color={COLORS.white} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </KeyboardAvoidingView>
  );
}
