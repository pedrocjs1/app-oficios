import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function ProfessionalEditProfileScreen() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    supabase
      .from('professionals')
      .select('bio')
      .eq('user_id', user?.id)
      .single()
      .then(({ data }) => {
        if (data?.bio) setBio(data.bio);
        setLoadingProfile(false);
      });
  }, []);

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
      const response = await fetch(avatarUri);
      const blob = await response.blob();
      const path = `${user?.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

      if (!uploadError) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        avatar_url = data.publicUrl;
      }
    }

    // Update users table
    const { error: userError } = await supabase
      .from('users')
      .update({
        name: name.trim(),
        phone: phone.trim() || null,
        avatar_url,
      })
      .eq('id', user?.id);

    // Update professionals table
    const { error: proError } = await supabase
      .from('professionals')
      .update({ bio: bio.trim() || null })
      .eq('user_id', user?.id);

    setLoading(false);

    if (userError || proError) {
      Alert.alert('Error', 'No se pudo guardar los cambios');
      return;
    }

    setUser({ ...user!, name: name.trim(), phone: phone.trim() || null, avatar_url });
    Alert.alert('Listo', 'Perfil actualizado', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  if (loadingProfile) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#1A3C5E" size="large" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-secondary px-6 pt-14 pb-4">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-white/80 font-body">← Volver</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-heading text-white mt-3">Editar perfil</Text>
      </View>

      <View className="px-6 pt-6 gap-5">
        {/* Avatar */}
        <View className="items-center">
          <TouchableOpacity onPress={pickAvatar}>
            {avatarUri || user?.avatar_url ? (
              <Image
                source={{ uri: avatarUri ?? user?.avatar_url ?? undefined }}
                className="w-24 h-24 rounded-full"
              />
            ) : (
              <View className="w-24 h-24 rounded-full bg-secondary/10 items-center justify-center">
                <Text className="text-4xl font-heading text-secondary">
                  {user?.name?.charAt(0).toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <View className="absolute bottom-0 right-0 bg-secondary rounded-full w-8 h-8 items-center justify-center">
              <Text className="text-white text-sm">+</Text>
            </View>
          </TouchableOpacity>
          <Text className="text-xs font-body text-gray-400 mt-2">Toca para cambiar foto</Text>
        </View>

        {/* Nombre */}
        <View>
          <Text className="text-sm font-body-medium text-secondary mb-2">Nombre completo</Text>
          <TextInput
            className="border border-gray-200 rounded-card px-4 py-3 text-base font-body"
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Email (solo lectura) */}
        <View>
          <Text className="text-sm font-body-medium text-secondary mb-2">Email</Text>
          <View className="border border-gray-100 bg-gray-50 rounded-card px-4 py-3">
            <Text className="text-base font-body text-gray-400">{user?.email}</Text>
          </View>
          <Text className="text-xs font-body text-gray-400 mt-1">
            El email no se puede cambiar
          </Text>
        </View>

        {/* Telefono */}
        <View>
          <Text className="text-sm font-body-medium text-secondary mb-2">Telefono</Text>
          <TextInput
            className="border border-gray-200 rounded-card px-4 py-3 text-base font-body"
            value={phone}
            onChangeText={setPhone}
            placeholder="Ej: 11 2345-6789"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
          />
        </View>

        {/* Bio */}
        <View>
          <Text className="text-sm font-body-medium text-secondary mb-2">
            Sobre mi (visible para clientes)
          </Text>
          <TextInput
            className="border border-gray-200 rounded-card px-4 py-3 text-base font-body h-28"
            value={bio}
            onChangeText={setBio}
            placeholder="Conta brevemente tu experiencia, especialidades, etc."
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
            maxLength={300}
          />
          <Text className="text-xs font-body text-gray-400 mt-1 text-right">
            {bio.length}/300
          </Text>
        </View>

        {/* Guardar */}
        <TouchableOpacity
          className="bg-secondary rounded-btn py-4 items-center mt-2"
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-body-medium text-base">Guardar cambios</Text>
          )}
        </TouchableOpacity>
      </View>

      <View className="h-10" />
    </ScrollView>
  );
}
