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
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, SHADOWS, RADIUS } from '@/constants/theme';

type Category = { id: string; name: string; common_problems: string[] };

const URGENCY_OPTIONS = [
  { value: 'normal' as const, label: 'Normal', desc: 'En los próximos días', icon: 'time-outline' as const, color: COLORS.success },
  { value: 'urgent' as const, label: 'Urgente', desc: 'Hoy o mañana', icon: 'alert-circle-outline' as const, color: COLORS.warning },
  { value: 'emergency' as const, label: 'Emergencia', desc: 'Ahora mismo', icon: 'warning-outline' as const, color: COLORS.danger },
];

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Electricista': 'flash',
  'Gasista': 'flame',
  'Plomero': 'water',
  'Limpieza y mantenimiento': 'sparkles',
};

function getCategoryIcon(name: string): keyof typeof Ionicons.glyphMap {
  return CATEGORY_ICONS[name] || 'construct';
}

export default function NewRequestScreen() {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
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
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const stepTitles = ['Tipo de servicio', 'Descripción', 'Urgencia'];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, SHADOWS.sm, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => {
              if (step > 1) setStep(step - 1);
              else router.back();
            }}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.secondary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Nuevo pedido</Text>
            <Text style={styles.headerSubtitle}>Paso {step}: {stepTitles[step - 1]}</Text>
          </View>
        </View>

        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={styles.stepDotContainer}>
              <View
                style={[
                  styles.stepDot,
                  s < step && styles.stepDotCompleted,
                  s === step && styles.stepDotActive,
                  s > step && styles.stepDotInactive,
                ]}
              >
                {s < step ? (
                  <Ionicons name="checkmark" size={14} color={COLORS.white} />
                ) : (
                  <Text style={[
                    styles.stepDotText,
                    s === step ? { color: COLORS.white } : { color: COLORS.textMuted },
                  ]}>
                    {s}
                  </Text>
                )}
              </View>
              {s < 3 && (
                <View style={[styles.stepLine, s < step && styles.stepLineActive]} />
              )}
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 1: Category and Problem */}
        {step === 1 && (
          <View style={{ gap: 20 }}>
            <Text style={styles.sectionTitle}>¿Qué tipo de servicio necesitás?</Text>

            <View style={styles.categoryGrid}>
              {categories.map((cat) => {
                const isSelected = selectedCategory?.id === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      SHADOWS.sm,
                      isSelected && styles.categoryCardSelected,
                    ]}
                    onPress={() => {
                      setSelectedCategory(cat);
                      setSelectedProblem('');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.categoryIconContainer,
                      isSelected && { backgroundColor: COLORS.primary + '18' },
                    ]}>
                      <Ionicons
                        name={getCategoryIcon(cat.name)}
                        size={28}
                        color={isSelected ? COLORS.primary : COLORS.textSecondary}
                      />
                    </View>
                    <Text style={[
                      styles.categoryName,
                      isSelected && { color: COLORS.primary },
                    ]}>
                      {cat.name}
                    </Text>
                    {isSelected && (
                      <View style={styles.categoryCheck}>
                        <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedCategory && (
              <View style={{ gap: 12 }}>
                <Text style={styles.sectionTitle}>¿Cuál es el problema?</Text>
                <View style={styles.problemPillsContainer}>
                  {[...selectedCategory.common_problems, 'Otro'].map((problem) => {
                    const isSelected = selectedProblem === problem;
                    return (
                      <TouchableOpacity
                        key={problem}
                        style={[
                          styles.problemPill,
                          isSelected && styles.problemPillSelected,
                        ]}
                        onPress={() => setSelectedProblem(problem)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.problemPillText,
                          isSelected && styles.problemPillTextSelected,
                        ]}>
                          {problem}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {selectedCategory && selectedProblem ? (
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => setStep(2)}
                activeOpacity={0.8}
              >
                <Text style={styles.continueButtonText}>Continuar</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Step 2: Description and Photos */}
        {step === 2 && (
          <View style={{ gap: 20 }}>
            <Text style={styles.sectionTitle}>Describí el problema</Text>

            <View style={[styles.inputCard, SHADOWS.sm]}>
              <View style={styles.textareaHeader}>
                <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                <Text style={styles.inputCardLabel}>Descripción</Text>
              </View>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Contanos qué pasó, cuándo empezó, qué intentaste hacer..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <View style={[styles.inputCard, SHADOWS.sm]}>
              <View style={styles.textareaHeader}>
                <Ionicons name="camera-outline" size={20} color={COLORS.primary} />
                <Text style={styles.inputCardLabel}>Fotos del problema</Text>
                <Text style={styles.optionalTag}>Opcional, hasta 4</Text>
              </View>
              <View style={styles.photoGrid}>
                {photos.map((uri, i) => (
                  <View key={i} style={styles.photoPreview}>
                    <Image
                      source={{ uri }}
                      style={styles.photoImage}
                    />
                    <TouchableOpacity
                      style={styles.photoDeleteOverlay}
                      onPress={() => setPhotos(photos.filter((_, j) => j !== i))}
                    >
                      <Ionicons name="close-circle" size={24} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < 4 && (
                  <TouchableOpacity
                    style={styles.photoAddButton}
                    onPress={pickPhoto}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera" size={28} color={COLORS.textMuted} />
                    <Text style={styles.photoAddText}>Agregar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.navButtons}>
              <TouchableOpacity
                style={styles.backNavButton}
                onPress={() => setStep(1)}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
                <Text style={styles.backNavButtonText}>Atrás</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.continueButton, { flex: 1 }]}
                onPress={() => {
                  if (!description) {
                    Alert.alert('Error', 'Describí brevemente el problema');
                    return;
                  }
                  setStep(3);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.continueButtonText}>Continuar</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: Urgency and Confirm */}
        {step === 3 && (
          <View style={{ gap: 20 }}>
            <Text style={styles.sectionTitle}>¿Qué tan urgente es?</Text>

            <View style={{ gap: 12 }}>
              {URGENCY_OPTIONS.map((opt) => {
                const isSelected = urgency === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.urgencyCard,
                      SHADOWS.sm,
                      isSelected && { borderColor: opt.color, borderWidth: 2 },
                    ]}
                    onPress={() => setUrgency(opt.value)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.urgencyIconContainer, { backgroundColor: opt.color + '18' }]}>
                      <Ionicons name={opt.icon} size={26} color={opt.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.urgencyLabel,
                        isSelected && { color: opt.color },
                      ]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.urgencyDesc}>{opt.desc}</Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.urgencyCheck, { backgroundColor: opt.color }]}>
                        <Ionicons name="checkmark" size={16} color={COLORS.white} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Summary card */}
            <View style={[styles.summaryCard, SHADOWS.sm]}>
              <View style={styles.summaryHeader}>
                <Ionicons name="clipboard-outline" size={20} color={COLORS.primary} />
                <Text style={styles.summaryTitle}>Resumen del pedido</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Categoría</Text>
                <Text style={styles.summaryValue}>{selectedCategory?.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Problema</Text>
                <Text style={styles.summaryValue}>{selectedProblem}</Text>
              </View>
              <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.summaryLabel}>Descripción</Text>
                <Text style={styles.summaryValue} numberOfLines={2}>{description}</Text>
              </View>
              {photos.length > 0 && (
                <Text style={styles.summaryPhotos}>{photos.length} foto{photos.length !== 1 ? 's' : ''} adjunta{photos.length !== 1 ? 's' : ''}</Text>
              )}
            </View>

            <View style={styles.navButtons}>
              <TouchableOpacity
                style={styles.backNavButton}
                onPress={() => setStep(2)}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
                <Text style={styles.backNavButtonText}>Atrás</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.publishButton, { flex: 1 }, loading && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="rocket-outline" size={20} color={COLORS.white} />
                    <Text style={styles.publishButtonText}>Publicar pedido</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = {
  header: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.secondary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  stepIndicator: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  stepDotContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  stepDotCompleted: {
    backgroundColor: COLORS.primary,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepDotInactive: {
    backgroundColor: COLORS.borderLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepDotText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.secondary,
  },
  categoryGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  categoryCard: {
    width: '47%' as any,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.text,
    textAlign: 'center' as const,
  },
  categoryCheck: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
  },
  problemPillsContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  problemPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  problemPillSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  problemPillText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: COLORS.textSecondary,
  },
  problemPillTextSelected: {
    color: COLORS.primary,
    fontWeight: '600' as const,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  continueButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  inputCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
  },
  textareaHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 12,
  },
  inputCardLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.secondary,
  },
  optionalTag: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 'auto' as const,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    height: 120,
    textAlignVertical: 'top' as const,
  },
  photoGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    overflow: 'hidden' as const,
  },
  photoImage: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
  },
  photoDeleteOverlay: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  photoAddButton: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderStyle: 'dashed' as const,
    borderColor: COLORS.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 2,
  },
  photoAddText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
  },
  navButtons: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 4,
  },
  backNavButton: {
    flex: 0.5,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    backgroundColor: COLORS.card,
  },
  backNavButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  urgencyCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  urgencyIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  urgencyLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  urgencyDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  urgencyCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
  },
  summaryHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.secondary,
  },
  summaryRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500' as const,
  },
  summaryPhotos: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  publishButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  publishButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700' as const,
  },
};
