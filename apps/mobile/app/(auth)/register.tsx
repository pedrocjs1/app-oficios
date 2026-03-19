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
  StatusBar,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, SHADOWS, RADIUS } from '@/constants/theme';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { setToken, setUser } = useAuthStore();

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Completa nombre, email y contrasena');
      return;
    }

    setLoading(true);

    try {
      // 1. Register via our backend API
      const { user, token } = await api.register({
        email,
        password,
        name,
        phone: phone || null,
        role: 'client',
      });
      setToken(token);
      setUser(user);

      // 2. Also sign into Supabase for realtime subscriptions
      await supabase.auth.signInWithPassword({ email, password });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo crear la cuenta. Intenta de nuevo.');
    }

    setLoading(false);
    // El auth listener redirige automaticamente
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" />

      {/* Gradient Header */}
      <LinearGradient
        colors={[COLORS.primary, '#E85D2C']}
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 28,
          paddingHorizontal: 20,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: RADIUS.full,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: RADIUS.full,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="person-add" size={24} color={COLORS.white} />
          </View>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.white }}>
              Crear cuenta
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
              Encontra profesionales verificados cerca tuyo
            </Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Form Card */}
          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: RADIUS.lg,
              padding: 20,
              ...SHADOWS.md,
              gap: 20,
            }}
          >
            {/* Name */}
            <View>
              <Text style={styles.label}>Nombre completo *</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Juan Garcia"
                  placeholderTextColor={COLORS.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Email */}
            <View>
              <Text style={styles.label}>Email *</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="tu@email.com"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Phone */}
            <View>
              <Text style={styles.label}>Telefono (opcional)</Text>
              <View style={styles.inputRow}>
                <Ionicons name="call" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="261 XXX-XXXX"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>

            {/* Password */}
            <View>
              <Text style={styles.label}>Contrasena *</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Minimo 6 caracteres"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={22}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: RADIUS.md,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 28,
              ...SHADOWS.sm,
            }}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 16 }}>
                  Crear cuenta
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Terms */}
          <Text
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: COLORS.textMuted,
              marginTop: 16,
              lineHeight: 18,
            }}
          >
            Al registrarte aceptas los terminos y condiciones de OficioYa
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 50,
    backgroundColor: COLORS.white,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
});
