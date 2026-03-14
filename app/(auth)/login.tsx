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
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { COLORS, SHADOWS, RADIUS } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const insets = useSafeAreaInsets();

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Completá todos los campos');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />

      {/* Gradient Header */}
      <LinearGradient
        colors={[COLORS.secondary, '#2A3F55']}
        style={{
          paddingTop: insets.top + 40,
          paddingBottom: 50,
          paddingHorizontal: 24,
          alignItems: 'center',
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="construct" size={32} color={COLORS.primary} />
          <Text style={{ fontSize: 36, fontWeight: '700', color: COLORS.white }}>
            OficioYa
          </Text>
        </View>
        <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>
          Servicios del hogar a tu alcance
        </Text>
      </LinearGradient>

      {/* Form */}
      <View style={{ flex: 1, paddingHorizontal: 24, marginTop: -24 }}>
        <View
          style={{
            backgroundColor: COLORS.card,
            borderRadius: RADIUS.lg,
            padding: 24,
            gap: 20,
            ...SHADOWS.lg,
          }}
        >
          {/* Email */}
          <View>
            <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 8 }}>
              Email
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: RADIUS.md,
                paddingHorizontal: 14,
                backgroundColor: COLORS.background,
              }}
            >
              <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />
              <TextInput
                style={{ flex: 1, paddingVertical: 14, paddingLeft: 10, fontSize: 15, color: COLORS.text }}
                placeholder="tu@email.com"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Password */}
          <View>
            <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 8 }}>
              Contraseña
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: RADIUS.md,
                paddingHorizontal: 14,
                backgroundColor: COLORS.background,
              }}
            >
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />
              <TextInput
                style={{ flex: 1, paddingVertical: 14, paddingLeft: 10, fontSize: 15, color: COLORS.text }}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: RADIUS.md,
              paddingVertical: 16,
              alignItems: 'center',
              marginTop: 4,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: '600' }}>
                Ingresar
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 28 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
          <Text style={{ marginHorizontal: 16, color: COLORS.textMuted, fontSize: 13 }}>
            ¿No tenés cuenta?
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
        </View>

        {/* Register buttons */}
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(auth)/register')}
            style={{
              borderWidth: 1.5,
              borderColor: COLORS.primary,
              borderRadius: RADIUS.md,
              paddingVertical: 15,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: COLORS.card,
              ...SHADOWS.sm,
            }}
          >
            <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
            <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 15 }}>
              Crear cuenta de cliente
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(auth)/register-professional')}
            style={{
              borderWidth: 1.5,
              borderColor: COLORS.secondary,
              borderRadius: RADIUS.md,
              paddingVertical: 15,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: COLORS.card,
              ...SHADOWS.sm,
            }}
          >
            <Ionicons name="briefcase-outline" size={20} color={COLORS.secondary} />
            <Text style={{ color: COLORS.secondary, fontWeight: '600', fontSize: 15 }}>
              Registrarme como profesional
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
