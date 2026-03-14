import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

type Category = { id: string; name: string; common_problems: string[] };

const URGENCY_OPTIONS = [
  { value: 'normal', label: 'Normal', desc: 'En los próximos días' },
  { value: 'urgent', label: 'Urgente', desc: 'Hoy o mañana' },
  { value: 'emergency', label: 'Emergencia', desc: 'Ahora mismo' },
] as const;

export default function NewRequestScreen() {
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedProblem, setSelectedProblem] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [urgency, setUrgency] = useState<'normal' | 'urgent' | 'emergency'>('normal');
  const [loading, setLoading] = useState(false);
  const [fetchingCategories, setFetchingCategories] = useState(true);

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        setCategories(data ?? []);
        setFetchingCategories(false);
      });
  }, []);

  async function pickPhoto() {
    if (photos.length >= 4) {
      Alert.alert('Límite', 'Podés subir hasta 4 fotos');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  }

  async function uploadPhoto(uri: string, requestId: string, index: number): Promise<string> {
    const response = await fetch(uri);
    const blob = await response.blob();
    const path = `${requestId}/${index}.jpg`;
    await supabase.storage.from('request-photos').upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    const { data } = supabase.storage.from('request-photos').getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit() {
    if (!selectedCategory || !selectedProblem || !description) {
      Alert.alert('Error', 'Completá todos los campos');
      return;
    }

    setLoading(true);

    try {
      let location = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          location = `POINT(${loc.coords.longitude} ${loc.coords.latitude})`;
        }
      } catch {
        // Continuar sin ubicación
      }

      const { data: request, error } = await supabase
        .from('service_requests')
        .insert({
          client_id: user?.id,
          category_id: selectedCategory.id,
          problem_type: selectedProblem,
          description: description.trim(),
          urgency,
          location,
          photos: '[]',
        })
        .select()
        .single();

      if (error || !request) {
        Alert.alert('Error', 'No se pudo crear el pedido. Intentá de nuevo.');
        return;
      }

      // Subir fotos si hay
      if (photos.length > 0) {
        try {
          const photoUrls = await Promise.all(
            photos.map((uri, i) => uploadPhoto(uri, request.id, i))
          );
          await supabase
            .from('service_requests')
            .update({ photos: JSON.stringify(photoUrls) })
            .eq('id', request.id);
        } catch {
          console.warn('Error uploading photos');
          // Continue - request was created successfully, photos can be added later
        }
      }

      Alert.alert(
        '¡Pedido publicado!',
        'Los profesionales de tu zona recibirán una notificación.',
        [{ text: 'Ver mis pedidos', onPress: () => router.replace('/(client)') }]
      );
    } catch (e) {
      console.warn('Error creating request:', e);
      Alert.alert('Error', 'Ocurrió un error inesperado. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (fetchingCategories) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#FF6B1A" size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 pt-14 pb-4 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-secondary font-body">← Cancelar</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-heading text-secondary mt-3">Nuevo pedido</Text>

        {/* Pasos */}
        <View className="flex-row gap-2 mt-4">
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-gray-200'}`}
            />
          ))}
        </View>
      </View>

      <View className="px-6 pt-6">
        {/* Paso 1: Categoría y problema */}
        {step === 1 && (
          <View className="gap-4">
            <Text className="text-lg font-heading text-secondary">¿Qué tipo de servicio necesitás?</Text>

            <View className="gap-3">
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  className={`border-2 rounded-card p-4 ${
                    selectedCategory?.id === cat.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200'
                  }`}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setSelectedProblem('');
                  }}
                >
                  <Text
                    className={`font-body-medium text-base ${
                      selectedCategory?.id === cat.id ? 'text-primary' : 'text-secondary'
                    }`}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedCategory && (
              <View className="mt-4">
                <Text className="text-base font-heading text-secondary mb-3">
                  ¿Cuál es el problema?
                </Text>
                <View className="gap-2">
                  {selectedCategory.common_problems.map((problem) => (
                    <TouchableOpacity
                      key={problem}
                      className={`border rounded-btn px-4 py-3 ${
                        selectedProblem === problem
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200'
                      }`}
                      onPress={() => setSelectedProblem(problem)}
                    >
                      <Text
                        className={`font-body text-sm ${
                          selectedProblem === problem ? 'text-primary' : 'text-gray-600'
                        }`}
                      >
                        {problem}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    className={`border rounded-btn px-4 py-3 ${
                      selectedProblem === 'Otro' ? 'border-primary bg-primary/5' : 'border-gray-200'
                    }`}
                    onPress={() => setSelectedProblem('Otro')}
                  >
                    <Text
                      className={`font-body text-sm ${
                        selectedProblem === 'Otro' ? 'text-primary' : 'text-gray-600'
                      }`}
                    >
                      Otro
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {selectedCategory && selectedProblem && (
              <TouchableOpacity
                className="bg-primary rounded-btn py-4 items-center mt-2"
                onPress={() => setStep(2)}
              >
                <Text className="text-white font-body-medium">Continuar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Paso 2: Descripción y fotos */}
        {step === 2 && (
          <View className="gap-4">
            <Text className="text-lg font-heading text-secondary">Describí el problema</Text>

            <TextInput
              className="border border-gray-200 rounded-card px-4 py-3 text-base font-body h-28"
              placeholder="Contanos qué pasó, cuándo empezó, qué intentaste hacer..."
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />

            <View>
              <Text className="text-sm font-body-medium text-secondary mb-3">
                Fotos del problema (opcional, hasta 4)
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {photos.map((uri, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setPhotos(photos.filter((_, j) => j !== i))}
                  >
                    <Image
                      source={{ uri }}
                      className="w-20 h-20 rounded-card"
                    />
                    <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
                      <Text className="text-white text-xs">✕</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {photos.length < 4 && (
                  <TouchableOpacity
                    className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-card items-center justify-center"
                    onPress={pickPhoto}
                  >
                    <Text className="text-gray-400 text-2xl">+</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                className="flex-1 border border-gray-200 rounded-btn py-4 items-center"
                onPress={() => setStep(1)}
              >
                <Text className="text-gray-500 font-body-medium">Atrás</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-primary rounded-btn py-4 items-center"
                onPress={() => {
                  if (!description) {
                    Alert.alert('Error', 'Describí brevemente el problema');
                    return;
                  }
                  setStep(3);
                }}
              >
                <Text className="text-white font-body-medium">Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Paso 3: Urgencia y confirmar */}
        {step === 3 && (
          <View className="gap-4">
            <Text className="text-lg font-heading text-secondary">¿Qué tan urgente es?</Text>

            <View className="gap-3">
              {URGENCY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  className={`border-2 rounded-card p-4 flex-row items-center ${
                    urgency === opt.value ? 'border-primary bg-primary/5' : 'border-gray-200'
                  }`}
                  onPress={() => setUrgency(opt.value)}
                >
                  <View className="flex-1">
                    <Text
                      className={`font-body-medium text-base ${
                        urgency === opt.value ? 'text-primary' : 'text-secondary'
                      }`}
                    >
                      {opt.label}
                    </Text>
                    <Text className="text-sm font-body text-gray-400">{opt.desc}</Text>
                  </View>
                  {urgency === opt.value && (
                    <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                      <Text className="text-white text-xs">✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Resumen */}
            <View className="bg-gray-50 rounded-card p-4 mt-2">
              <Text className="font-body-medium text-secondary mb-2">Resumen del pedido</Text>
              <Text className="font-body text-sm text-gray-600">
                Categoría: <Text className="font-body-medium">{selectedCategory?.name}</Text>
              </Text>
              <Text className="font-body text-sm text-gray-600 mt-1">
                Problema: <Text className="font-body-medium">{selectedProblem}</Text>
              </Text>
              <Text className="font-body text-sm text-gray-600 mt-1" numberOfLines={2}>
                Descripción: {description}
              </Text>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 border border-gray-200 rounded-btn py-4 items-center"
                onPress={() => setStep(2)}
              >
                <Text className="text-gray-500 font-body-medium">Atrás</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-primary rounded-btn py-4 items-center"
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-body-medium">Publicar pedido</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View className="h-10" />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}
