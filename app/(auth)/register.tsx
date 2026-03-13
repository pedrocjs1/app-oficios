import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Completá nombre, email y contraseña');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setLoading(false);
      Alert.alert('Error', error.message);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        email,
        name,
        phone: phone || null,
        role: 'client',
      });

      if (profileError) {
        setLoading(false);
        Alert.alert('Error', 'No se pudo crear el perfil. Intentá de nuevo.');
        return;
      }
    }

    setLoading(false);
    // El auth listener redirige automáticamente
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView className="flex-1" contentContainerClassName="px-6 py-10">
        {/* Header */}
        <TouchableOpacity className="mb-6" onPress={() => router.back()}>
          <Text className="text-secondary font-body text-base">← Volver</Text>
        </TouchableOpacity>

        <Text className="text-2xl font-heading text-secondary mb-2">Crear cuenta</Text>
        <Text className="text-sm font-body text-gray-500 mb-8">
          Encontrá profesionales verificados cerca tuyo
        </Text>

        <View className="gap-4">
          <View>
            <Text className="text-sm font-body-medium text-secondary mb-1">Nombre completo *</Text>
            <TextInput
              className="border border-gray-200 rounded-btn px-4 py-3 text-base font-body"
              placeholder="Juan García"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View>
            <Text className="text-sm font-body-medium text-secondary mb-1">Email *</Text>
            <TextInput
              className="border border-gray-200 rounded-btn px-4 py-3 text-base font-body"
              placeholder="tu@email.com"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View>
            <Text className="text-sm font-body-medium text-secondary mb-1">Teléfono (opcional)</Text>
            <TextInput
              className="border border-gray-200 rounded-btn px-4 py-3 text-base font-body"
              placeholder="261 XXX-XXXX"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View>
            <Text className="text-sm font-body-medium text-secondary mb-1">Contraseña *</Text>
            <TextInput
              className="border border-gray-200 rounded-btn px-4 py-3 text-base font-body"
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            className="bg-primary rounded-btn py-4 items-center mt-4"
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-body-medium text-base">Crear cuenta</Text>
            )}
          </TouchableOpacity>

          <Text className="text-center text-xs font-body text-gray-400 mt-2">
            Al registrarte aceptás los términos y condiciones de OficioYa
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
