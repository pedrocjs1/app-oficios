import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/services/api';
import { uploadImageApi } from '@/lib/uploadImageApi';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, SHADOWS, RADIUS } from '@/constants/theme';

export default function ClientEditProfileScreen() {
  const { user, setUser } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacio');
      return;
    }

    setLoading(true);

    let avatar_url = user?.avatar_url ?? null;

    if (avatarUri) {
      const path = `${user?.id}/avatar.jpg`;
      const uploaded = await uploadImageApi(avatarUri, 'avatars', path);
      if (uploaded) avatar_url = uploaded;
    }

    try {
      await api.updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        avatar_url: avatar_url ?? undefined,
      });
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Error', e.message || 'No se pudo guardar los cambios');
      return;
    }

    setLoading(false);

    setUser({ ...user!, name: name.trim(), phone: phone.trim() || null, avatar_url });
    Alert.alert('Listo', 'Perfil actualizado', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 16,
          paddingHorizontal: 20,
          backgroundColor: COLORS.white,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.borderLight,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: RADIUS.full,
            backgroundColor: COLORS.background,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 18,
            fontWeight: '700',
            color: COLORS.text,
          }}
        >
          Editar perfil
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8}>
            <View>
              {avatarUri || user?.avatar_url ? (
                <Image
                  source={{ uri: avatarUri ?? user?.avatar_url ?? undefined }}
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: RADIUS.full,
                    borderWidth: 3,
                    borderColor: COLORS.primaryLight,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: RADIUS.full,
                    backgroundColor: COLORS.primaryLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 3,
                    borderColor: COLORS.primaryLight,
                  }}
                >
                  <Text style={{ fontSize: 36, fontWeight: '700', color: COLORS.primary }}>
                    {user?.name?.charAt(0).toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 32,
                  height: 32,
                  borderRadius: RADIUS.full,
                  backgroundColor: COLORS.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: COLORS.white,
                }}
              >
                <Ionicons name="camera" size={16} color={COLORS.white} />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 8 }}>
            Toca para cambiar foto
          </Text>
        </View>

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
            <Text style={styles.label}>Nombre completo</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Tu nombre"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          {/* Email (readonly) */}
          <View>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputRow, { backgroundColor: COLORS.background }]}>
              <Ionicons name="lock-closed" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
              <Text style={{ flex: 1, fontSize: 15, color: COLORS.textMuted }}>{user?.email}</Text>
            </View>
            <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>
              El email no se puede cambiar
            </Text>
          </View>

          {/* Phone */}
          <View>
            <Text style={styles.label}>Telefono</Text>
            <View style={styles.inputRow}>
              <Ionicons name="call" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Ej: 11 2345-6789"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
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
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color={COLORS.white} style={{ marginRight: 8 }} />
              <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 16 }}>
                Guardar cambios
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
