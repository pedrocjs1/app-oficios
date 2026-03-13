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
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

export default function RegisterProfessionalScreen() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licensePhoto, setLicensePhoto] = useState<string | null>(null);
  const [dniPhoto, setDniPhoto] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function pickImage(setter: (uri: string) => void) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setter(result.assets[0].uri);
    }
  }

  async function uploadImage(uri: string, path: string): Promise<string | null> {
    const response = await fetch(uri);
    const blob = await response.blob();
    const { data, error } = await supabase.storage
      .from('professional-docs')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
    if (error) return null;
    const { data: urlData } = supabase.storage.from('professional-docs').getPublicUrl(data.path);
    return urlData.publicUrl;
  }

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Completá los datos obligatorios');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error || !data.user) {
      setLoading(false);
      Alert.alert('Error', error?.message ?? 'Error al registrar');
      return;
    }

    const userId = data.user.id;

    // Crear usuario
    await supabase.from('users').insert({
      id: userId,
      email,
      name,
      phone: phone || null,
      role: 'professional',
    });

    // Subir documentos si se seleccionaron
    let licensePhotoUrl: string | null = null;
    let dniPhotoUrl: string | null = null;
    let selfieUrl: string | null = null;

    if (licensePhoto) {
      licensePhotoUrl = await uploadImage(licensePhoto, `${userId}/license.jpg`);
    }
    if (dniPhoto) {
      dniPhotoUrl = await uploadImage(dniPhoto, `${userId}/dni.jpg`);
    }
    if (selfie) {
      selfieUrl = await uploadImage(selfie, `${userId}/selfie.jpg`);
    }

    // Crear perfil profesional
    await supabase.from('professionals').insert({
      user_id: userId,
      bio: bio || null,
      license_number: licenseNumber || null,
      license_photo_url: licensePhotoUrl,
      dni_photo_url: dniPhotoUrl,
      selfie_url: selfieUrl,
      status: 'pending_verification',
    });

    setLoading(false);
    Alert.alert(
      '¡Registro enviado!',
      'Tu perfil está en revisión. Te notificaremos cuando sea aprobado.',
      [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
    );
  }

  const PhotoButton = ({
    label,
    value,
    onPress,
  }: {
    label: string;
    value: string | null;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      className={`border-2 rounded-card p-4 items-center ${value ? 'border-primary bg-primary/10' : 'border-dashed border-gray-300'}`}
      onPress={onPress}
    >
      <Text className={`font-body-medium text-sm ${value ? 'text-primary' : 'text-gray-500'}`}>
        {value ? '✓ ' + label + ' cargada' : '+ ' + label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView className="flex-1" contentContainerClassName="px-6 py-10">
        <TouchableOpacity className="mb-6" onPress={() => router.back()}>
          <Text className="text-secondary font-body text-base">← Volver</Text>
        </TouchableOpacity>

        <Text className="text-2xl font-heading text-secondary mb-1">
          Registrate como profesional
        </Text>
        <Text className="text-sm font-body text-gray-500 mb-8">
          Tu perfil será verificado antes de publicarlo. Puede tardar 24-48hs.
        </Text>

        <View className="gap-4">
          {/* Datos personales */}
          <Text className="text-base font-heading text-secondary">Datos personales</Text>

          <TextInput
            className="border border-gray-200 rounded-btn px-4 py-3 text-base font-body"
            placeholder="Nombre completo *"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            className="border border-gray-200 rounded-btn px-4 py-3 text-base font-body"
            placeholder="Email *"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            className="border border-gray-200 rounded-btn px-4 py-3 text-base font-body"
            placeholder="Teléfono"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <TextInput
            className="border border-gray-200 rounded-btn px-4 py-3 text-base font-body"
            placeholder="Contraseña (mínimo 6 caracteres) *"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {/* Datos profesionales */}
          <Text className="text-base font-heading text-secondary mt-4">Datos profesionales</Text>

          <TextInput
            className="border border-gray-200 rounded-btn px-4 py-3 text-base font-body"
            placeholder="Número de matrícula (si aplica)"
            placeholderTextColor="#9CA3AF"
            value={licenseNumber}
            onChangeText={setLicenseNumber}
          />

          <TextInput
            className="border border-gray-200 rounded-btn px-4 py-3 text-base font-body h-24"
            placeholder="Contanos sobre tu experiencia (opcional)"
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
            value={bio}
            onChangeText={setBio}
          />

          {/* Documentos */}
          <Text className="text-base font-heading text-secondary mt-4">Documentación</Text>
          <Text className="text-xs font-body text-gray-400 -mt-2">
            Subir documentos acelera la verificación
          </Text>

          <PhotoButton
            label="Foto de matrícula/habilitación"
            value={licensePhoto}
            onPress={() => pickImage(setLicensePhoto)}
          />
          <PhotoButton
            label="Foto del DNI (frente)"
            value={dniPhoto}
            onPress={() => pickImage(setDniPhoto)}
          />
          <PhotoButton
            label="Selfie sosteniendo tu DNI"
            value={selfie}
            onPress={() => pickImage(setSelfie)}
          />

          <TouchableOpacity
            className="bg-secondary rounded-btn py-4 items-center mt-4"
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-body-medium text-base">Enviar solicitud</Text>
            )}
          </TouchableOpacity>

          <Text className="text-center text-xs font-body text-gray-400">
            Al registrarte aceptás los términos y condiciones de OficioYa
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
