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
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, SHADOWS, RADIUS } from '@/constants/theme';

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
  professionals: { user_id: string; users: { name: string; avatar_url: string | null } | null } | null;
};

export default function ClientJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [job, setJob] = useState<Job | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchJob();
    fetchMessages();

    const channel = supabase
      .channel(`job-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `job_id=eq.${id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function fetchJob() {
    const { data } = await supabase
      .from('jobs')
      .select('*, professionals!jobs_professional_id_fkey(user_id, users!professionals_user_id_fkey(name, avatar_url))')
      .eq('id', id)
      .single();
    setJob(data);
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

    const { error } = await supabase.from('messages').insert({
      job_id: id,
      sender_id: user?.id,
      content,
    });

    if (error) {
      Alert.alert('Error', 'No se pudo enviar el mensaje');
      setNewMessage(content);
    }

    setSending(false);
  }

  async function confirmJob() {
    Alert.alert(
      'Confirmar trabajo',
      '¿El profesional completó el trabajo correctamente?',
      [
        { text: 'No todavía', style: 'cancel' },
        {
          text: 'Sí, confirmar',
          onPress: async () => {
            const { error } = await supabase
              .from('jobs')
              .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
              .eq('id', id);
            if (error) {
              Alert.alert('Error', 'No se pudo confirmar el trabajo. Intentá de nuevo.');
              return;
            }
            await fetchJob();
            Alert.alert('¡Gracias!', 'Ahora podés dejar una reseña al profesional.');
          },
        },
      ]
    );
  }

  const profName = job?.professionals?.users?.name ?? 'Profesional';

  const statusLabel = (() => {
    switch (job?.status) {
      case 'pending_start': return 'Pendiente';
      case 'in_progress': return 'En progreso';
      case 'completed_by_professional': return 'Completado';
      case 'confirmed': return 'Confirmado';
      default: return '';
    }
  })();

  const statusColor = (() => {
    switch (job?.status) {
      case 'in_progress': return COLORS.primary;
      case 'completed_by_professional': return COLORS.warning;
      case 'confirmed': return COLORS.success;
      default: return COLORS.textMuted;
    }
  })();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }, SHADOWS.md]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.secondary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{profName}</Text>
            <View style={styles.headerMeta}>
              <Text style={styles.headerPrice}>
                ${job?.agreed_price?.toLocaleString('es-AR')}
              </Text>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
          {job?.status === 'completed_by_professional' && (
            <TouchableOpacity style={styles.confirmButton} onPress={confirmJob}>
              <Ionicons name="checkmark" size={18} color={COLORS.white} />
              <Text style={styles.confirmButtonText}>Confirmar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Confirmed banner */}
      {job?.status === 'confirmed' && (
        <View style={styles.confirmedBanner}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
          <Text style={styles.confirmedBannerText}>Trabajo confirmado</Text>
        </View>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <View
              key={msg.id}
              style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowOther]}
            >
              <View
                style={[
                  styles.bubble,
                  msg.flagged
                    ? styles.bubbleFlagged
                    : isMe
                    ? styles.bubbleMe
                    : styles.bubbleOther,
                ]}
              >
                {msg.flagged && (
                  <View style={styles.flaggedIcon}>
                    <Ionicons name="warning-outline" size={14} color={COLORS.warning} />
                  </View>
                )}
                <Text
                  style={[
                    styles.bubbleText,
                    msg.flagged
                      ? styles.bubbleTextFlagged
                      : isMe
                      ? styles.bubbleTextMe
                      : styles.bubbleTextOther,
                  ]}
                >
                  {msg.content}
                </Text>
              </View>
              <Text
                style={[
                  styles.timestamp,
                  isMe ? styles.timestampMe : styles.timestampOther,
                ]}
              >
                {new Date(msg.created_at).toLocaleTimeString('es-AR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          );
        })}
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Input */}
      {job?.status !== 'confirmed' && (
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.textInput}
            placeholder="Escribi un mensaje..."
            placeholderTextColor={COLORS.textMuted}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { opacity: sending || !newMessage.trim() ? 0.5 : 1 },
            ]}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  headerPrice: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: RADIUS.full,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.successLight,
    paddingVertical: 10,
    gap: 6,
  },
  confirmedBannerText: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  bubbleRow: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  bubbleRowMe: {
    alignSelf: 'flex-end',
  },
  bubbleRowOther: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  bubbleFlagged: {
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  flaggedIcon: {
    marginBottom: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: COLORS.white,
  },
  bubbleTextOther: {
    color: COLORS.text,
  },
  bubbleTextFlagged: {
    color: '#92400E',
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  timestampMe: {
    textAlign: 'right',
  },
  timestampOther: {
    textAlign: 'left',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
