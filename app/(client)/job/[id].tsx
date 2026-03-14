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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

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
  professionals: { users: { name: string } | null } | null;
};

export default function ClientJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
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
      .select('*, professionals(users(name))')
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

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-6 pt-14 pb-4">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-secondary font-body text-sm">← Volver</Text>
        </TouchableOpacity>
        <View className="flex-row items-center justify-between mt-2">
          <View>
            <Text className="text-lg font-heading text-secondary">{profName}</Text>
            <Text className="text-sm font-body text-gray-400">
              Precio acordado: ${job?.agreed_price?.toLocaleString('es-AR')}
            </Text>
          </View>
          {job?.status === 'completed_by_professional' && (
            <TouchableOpacity
              className="bg-primary rounded-btn px-4 py-2"
              onPress={confirmJob}
            >
              <Text className="text-white font-body-medium text-sm">Confirmar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Mensajes */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4 pt-4"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <View
              key={msg.id}
              className={`mb-3 max-w-[80%] ${isMe ? 'self-end' : 'self-start'}`}
            >
              <View
                className={`rounded-2xl px-4 py-3 ${
                  msg.flagged
                    ? 'bg-yellow-50 border border-yellow-200'
                    : isMe
                    ? 'bg-primary'
                    : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`font-body text-sm ${
                    msg.flagged ? 'text-yellow-700 italic' : isMe ? 'text-white' : 'text-gray-800'
                  }`}
                >
                  {msg.content}
                </Text>
              </View>
              <Text className={`text-xs font-body text-gray-400 mt-1 ${isMe ? 'text-right' : ''}`}>
                {new Date(msg.created_at).toLocaleTimeString('es-AR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          );
        })}
        <View className="h-4" />
      </ScrollView>

      {/* Input de mensaje */}
      {job?.status !== 'confirmed' && (
        <View className="flex-row items-center px-4 py-3 border-t border-gray-100 bg-white gap-3">
          <TextInput
            className="flex-1 bg-gray-100 rounded-full px-4 py-3 text-sm font-body"
            placeholder="Escribí un mensaje..."
            placeholderTextColor="#9CA3AF"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            className="bg-primary rounded-full w-11 h-11 items-center justify-center"
            onPress={sendMessage}
            disabled={sending || !newMessage.trim()}
          >
            {sending ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white text-lg">↑</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
