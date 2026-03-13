import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Completá todos los campos');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
    // La redirección la maneja el auth listener en _layout.tsx
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 px-6 justify-center">
        {/* Logo / Header */}
        <View className="mb-10 items-center">
          <Text className="text-4xl font-heading text-primary">OficioYa</Text>
          <Text className="text-base font-body text-gray-500 mt-1">
            Servicios del hogar a tu alcance
          </Text>
        </View>

        {/* Formulario */}
        <View className="gap-4">
          <View>
            <Text className="text-sm font-body-medium text-secondary mb-1">Email</Text>
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
            <Text className="text-sm font-body-medium text-secondary mb-1">Contraseña</Text>
            <TextInput
              className="border border-gray-200 rounded-btn px-4 py-3 text-base font-body"
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            className="bg-primary rounded-btn py-4 items-center mt-2"
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-body-medium text-base">Ingresar</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Separador */}
        <View className="flex-row items-center my-6">
          <View className="flex-1 h-px bg-gray-200" />
          <Text className="mx-4 text-gray-400 font-body text-sm">o</Text>
          <View className="flex-1 h-px bg-gray-200" />
        </View>

        {/* Registro */}
        <View className="gap-3">
          <TouchableOpacity
            className="border border-primary rounded-btn py-4 items-center"
            onPress={() => router.push('/(auth)/register')}
          >
            <Text className="text-primary font-body-medium text-base">Crear cuenta de cliente</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="border border-secondary rounded-btn py-4 items-center"
            onPress={() => router.push('/(auth)/register-professional')}
          >
            <Text className="text-secondary font-body-medium text-base">Registrarme como profesional</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
