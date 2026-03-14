import { useState, useEffect } from 'react';
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

type Category = { id: string; name: string };

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

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name')
      .order('sort_order')
      .then(({ data, error }) => {
        if (error) {
          console.warn('Error loading categories:', error);
        }
        setCategories(data ?? []);
        setLoadingCategories(false);
      });
  }, []);

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

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
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const { data, error } = await supabase.storage
        .from('professional-docs')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (error) return null;
      const { data: urlData } = supabase.storage.from('professional-docs').getPublicUrl(data.path);
      return urlData.publicUrl;
    } catch {
      return null;
    }
  }

  function validateStep1(): boolean {
    if (!name.trim()) {
      Alert.alert('Error', 'Ingresá tu nombre completo');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Ingresá tu email');
      return false;
    }
    if (!password || password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    if (selectedCategoryIds.length === 0) {
      Alert.alert('Error', 'Seleccioná al menos una categoría de servicio');
      return false;
    }
    return true;
  }

  async function handleRegister() {
    setLoading(true);

    try {
      // 1. Create auth user
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error || !data.user) {
        Alert.alert('Error', error?.message ?? 'Error al registrar. Intentá de nuevo.');
        setLoading(false);
        return;
      }

      const userId = data.user.id;

      // 2. Create user profile
      const { error: userError } = await supabase.from('users').insert({
        id: userId,
        email,
        name: name.trim(),
        phone: phone.trim() || null,
        role: 'professional',
      });

      if (userError) {
        Alert.alert('Error', 'No se pudo crear el perfil. Intentá de nuevo.');
        setLoading(false);
        return;
      }

      // 3. Upload documents
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

      // 4. Create professional profile
      const { data: profData, error: profError } = await supabase
        .from('professionals')
        .insert({
          user_id: userId,
          bio: bio.trim() || null,
          license_number: licenseNumber.trim() || null,
          license_photo_url: licensePhotoUrl,
          dni_photo_url: dniPhotoUrl,
          selfie_url: selfieUrl,
          status: 'pending_verification',
        })
        .select('id')
        .single();

      if (profError || !profData) {
        Alert.alert('Error', 'No se pudo crear el perfil profesional. Intentá de nuevo.');
        setLoading(false);
        return;
      }

      // 5. Assign selected categories (uses admin client to bypass RLS)
      if (selectedCategoryIds.length > 0) {
        const categoryRows = selectedCategoryIds.map((categoryId) => ({
          professional_id: profData.id,
          category_id: categoryId,
        }));

        const { error: catError } = await supabase
          .from('professional_categories')
          .insert(categoryRows);

        if (catError) {
          console.warn('Error assigning categories:', catError);
          // Non-blocking - categories can be assigned later by admin
        }
      }

      // Sign out so the auth listener doesn't auto-redirect to professional area
      await supabase.auth.signOut();

      Alert.alert(
        '¡Registro enviado!',
        'Tu perfil está en revisión. Te notificaremos cuando sea aprobado. Podrás iniciar sesión cuando tu cuenta sea verificada.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (e) {
      Alert.alert('Error', 'Ocurrió un error inesperado. Intentá de nuevo.');
      console.warn('Registration error:', e);
    } finally {
      setLoading(false);
    }
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
        <Text className="text-sm font-body text-gray-500 mb-4">
          Tu perfil será verificado antes de publicarlo. Puede tardar 24-48hs.
        </Text>

        {/* Step indicator */}
        <View className="flex-row gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-secondary' : 'bg-gray-200'}`}
            />
          ))}
        </View>

        {/* Step 1: Personal data */}
        {step === 1 && (
          <View className="gap-4">
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

            <TouchableOpacity
              className="bg-secondary rounded-btn py-4 items-center mt-2"
              onPress={() => {
                if (validateStep1()) setStep(2);
              }}
            >
              <Text className="text-white font-body-medium text-base">Continuar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Professional data + categories */}
        {step === 2 && (
          <View className="gap-4">
            <Text className="text-base font-heading text-secondary">Datos profesionales</Text>

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
              maxLength={300}
            />

            {/* Category selection */}
            <Text className="text-base font-heading text-secondary mt-2">
              ¿En qué categorías trabajás? *
            </Text>
            <Text className="text-xs font-body text-gray-400 -mt-2">
              Seleccioná al menos una categoría
            </Text>

            {loadingCategories ? (
              <ActivityIndicator color="#1A3C5E" />
            ) : (
              <View className="gap-2">
                {categories.map((cat) => {
                  const selected = selectedCategoryIds.includes(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      className={`flex-row items-center border-2 rounded-btn px-4 py-3 ${
                        selected ? 'border-primary bg-primary/5' : 'border-gray-200'
                      }`}
                      onPress={() => toggleCategory(cat.id)}
                    >
                      <View
                        className={`w-5 h-5 rounded border-2 items-center justify-center mr-3 ${
                          selected ? 'border-primary bg-primary' : 'border-gray-300'
                        }`}
                      >
                        {selected && (
                          <Text className="text-white text-xs font-bold">✓</Text>
                        )}
                      </View>
                      <Text
                        className={`font-body-medium text-base ${
                          selected ? 'text-primary' : 'text-gray-600'
                        }`}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                className="flex-1 border border-gray-200 rounded-btn py-4 items-center"
                onPress={() => setStep(1)}
              >
                <Text className="text-gray-500 font-body-medium">Atrás</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-secondary rounded-btn py-4 items-center"
                onPress={() => {
                  if (validateStep2()) setStep(3);
                }}
              >
                <Text className="text-white font-body-medium">Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: Documentation */}
        {step === 3 && (
          <View className="gap-4">
            <Text className="text-base font-heading text-secondary">Documentación</Text>
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

            {/* Summary */}
            <View className="bg-gray-50 rounded-card p-4 mt-2">
              <Text className="font-body-medium text-secondary mb-2">Resumen</Text>
              <Text className="font-body text-sm text-gray-600">
                Nombre: <Text className="font-body-medium">{name}</Text>
              </Text>
              <Text className="font-body text-sm text-gray-600 mt-1">
                Email: <Text className="font-body-medium">{email}</Text>
              </Text>
              <Text className="font-body text-sm text-gray-600 mt-1">
                Categorías:{' '}
                <Text className="font-body-medium">
                  {categories
                    .filter((c) => selectedCategoryIds.includes(c.id))
                    .map((c) => c.name)
                    .join(', ')}
                </Text>
              </Text>
            </View>

            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                className="flex-1 border border-gray-200 rounded-btn py-4 items-center"
                onPress={() => setStep(2)}
              >
                <Text className="text-gray-500 font-body-medium">Atrás</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-secondary rounded-btn py-4 items-center"
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-body-medium text-base">Enviar solicitud</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text className="text-center text-xs font-body text-gray-400">
              Al registrarte aceptás los términos y condiciones de OficioYa
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
