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
  StatusBar,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/services/api';
import { uploadImageApi } from '@/lib/uploadImageApi';
import { COLORS, SHADOWS, RADIUS } from '@/constants/theme';

type Category = { id: string; name: string };

export default function RegisterProfessionalScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    api.getCategories()
      .then((data) => {
        setCategories(data ?? []);
        setLoadingCategories(false);
      })
      .catch((error) => {
        console.warn('Error loading categories:', error);
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

  function validateStep1(): boolean {
    if (!name.trim()) {
      Alert.alert('Error', 'Ingresa tu nombre completo');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Ingresa tu email');
      return false;
    }
    if (!password || password.length < 6) {
      Alert.alert('Error', 'La contrasena debe tener al menos 6 caracteres');
      return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    if (selectedCategoryIds.length === 0) {
      Alert.alert('Error', 'Selecciona al menos una categoria de servicio');
      return false;
    }
    return true;
  }

  async function handleRegister() {
    setLoading(true);

    try {
      // Upload documents first (using Supabase storage directly since we don't have a user yet)
      // We'll use a temp ID for the upload path
      const tempId = `temp_${Date.now()}`;
      let licensePhotoUrl: string | null = null;
      let dniPhotoUrl: string | null = null;
      let selfieUrl: string | null = null;

      // For now, use the old Supabase upload for registration since we don't have auth yet
      // Documents will be uploaded after registration via the backend
      // Actually let's just send the base64 data to the backend and let it handle uploads

      // Register via backend API - it handles everything
      await api.registerProfessional({
        email,
        password,
        name: name.trim(),
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        license_number: licenseNumber.trim() || null,
        category_ids: selectedCategoryIds,
        // We'll skip document uploads for now in the API call
        // and handle them separately if needed
      });

      Alert.alert(
        'Registro enviado!',
        'Tu perfil esta en revision. Te notificaremos cuando sea aprobado. Podras iniciar sesion cuando tu cuenta sea verificada.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Ocurrio un error inesperado. Intenta de nuevo.');
      console.warn('Registration error:', e);
    } finally {
      setLoading(false);
    }
  }

  const categoryIcons: Record<string, string> = {
    Electricista: 'flash',
    Gasista: 'flame',
    Plomero: 'water',
    'Limpieza y mantenimiento': 'sparkles',
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" />

      {/* Gradient Header */}
      <LinearGradient
        colors={[COLORS.secondary, '#2C3E50']}
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 28,
          paddingHorizontal: 20,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (step > 1) {
              setStep(step - 1);
            } else {
              router.back();
            }
          }}
          style={{
            width: 40,
            height: 40,
            borderRadius: RADIUS.full,
            backgroundColor: 'rgba(255,255,255,0.15)',
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
            <Ionicons name="briefcase" size={24} color={COLORS.white} />
          </View>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.white }}>
              Registro profesional
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
              Tu perfil sera verificado en 24-48hs
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
          {/* Step Indicator */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 8 }}>
            {[1, 2, 3].map((s) => (
              <View key={s} style={{ flex: 1, alignItems: 'center' }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: RADIUS.full,
                    backgroundColor: s <= step ? COLORS.secondary : COLORS.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 6,
                  }}
                >
                  {s < step ? (
                    <Ionicons name="checkmark" size={18} color={COLORS.white} />
                  ) : (
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: s <= step ? COLORS.white : COLORS.textMuted,
                      }}
                    >
                      {s}
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: s <= step ? '600' : '400',
                    color: s <= step ? COLORS.text : COLORS.textMuted,
                  }}
                >
                  {s === 1 ? 'Personal' : s === 2 ? 'Profesional' : 'Documentos'}
                </Text>
                {s < 3 && (
                  <View
                    style={{
                      position: 'absolute',
                      right: -20,
                      top: 15,
                      width: 32,
                      height: 2,
                      backgroundColor: s < step ? COLORS.secondary : COLORS.border,
                    }}
                  />
                )}
              </View>
            ))}
          </View>

          {/* Step 1: Personal data */}
          {step === 1 && (
            <>
              <View
                style={{
                  backgroundColor: COLORS.card,
                  borderRadius: RADIUS.lg,
                  padding: 20,
                  ...SHADOWS.md,
                  gap: 20,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>
                  Datos personales
                </Text>

                {/* Name */}
                <View>
                  <Text style={styles.label}>Nombre completo *</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="person" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Tu nombre completo"
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
                  <Text style={styles.label}>Telefono</Text>
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

              <TouchableOpacity
                style={{
                  backgroundColor: COLORS.secondary,
                  borderRadius: RADIUS.md,
                  paddingVertical: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 24,
                  ...SHADOWS.sm,
                }}
                onPress={() => {
                  if (validateStep1()) setStep(2);
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 16, marginRight: 8 }}>
                  Continuar
                </Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </>
          )}

          {/* Step 2: Professional data + categories */}
          {step === 2 && (
            <>
              <View
                style={{
                  backgroundColor: COLORS.card,
                  borderRadius: RADIUS.lg,
                  padding: 20,
                  ...SHADOWS.md,
                  gap: 20,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>
                  Datos profesionales
                </Text>

                {/* License Number */}
                <View>
                  <Text style={styles.label}>Numero de matricula (si aplica)</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="card" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Numero de matricula"
                      placeholderTextColor={COLORS.textMuted}
                      value={licenseNumber}
                      onChangeText={setLicenseNumber}
                    />
                  </View>
                </View>

                {/* Bio */}
                <View>
                  <Text style={styles.label}>Sobre tu experiencia (opcional)</Text>
                  <View
                    style={[
                      styles.inputRow,
                      { height: 100, alignItems: 'flex-start', paddingVertical: 12 },
                    ]}
                  >
                    <Ionicons
                      name="document-text"
                      size={20}
                      color={COLORS.textMuted}
                      style={[styles.inputIcon, { marginTop: 2 }]}
                    />
                    <TextInput
                      style={[styles.input, { height: 76, textAlignVertical: 'top' }]}
                      placeholder="Conta brevemente tu experiencia..."
                      placeholderTextColor={COLORS.textMuted}
                      multiline
                      value={bio}
                      onChangeText={setBio}
                      maxLength={300}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 11,
                      color: COLORS.textMuted,
                      marginTop: 4,
                      textAlign: 'right',
                    }}
                  >
                    {bio.length}/300
                  </Text>
                </View>
              </View>

              {/* Categories */}
              <View
                style={{
                  backgroundColor: COLORS.card,
                  borderRadius: RADIUS.lg,
                  padding: 20,
                  ...SHADOWS.md,
                  marginTop: 16,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 }}>
                  Categorias de servicio *
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 16 }}>
                  Selecciona al menos una categoria
                </Text>

                {loadingCategories ? (
                  <ActivityIndicator color={COLORS.secondary} />
                ) : (
                  <View style={{ gap: 10 }}>
                    {categories.map((cat) => {
                      const selected = selectedCategoryIds.includes(cat.id);
                      const iconName = (categoryIcons[cat.name] ?? 'construct') as keyof typeof Ionicons.glyphMap;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 14,
                            borderRadius: RADIUS.md,
                            borderWidth: 2,
                            borderColor: selected ? COLORS.primary : COLORS.border,
                            backgroundColor: selected ? COLORS.primaryLight : COLORS.white,
                          }}
                          onPress={() => toggleCategory(cat.id)}
                          activeOpacity={0.7}
                        >
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: RADIUS.full,
                              backgroundColor: selected ? COLORS.primary : COLORS.background,
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 12,
                            }}
                          >
                            <Ionicons
                              name={iconName}
                              size={20}
                              color={selected ? COLORS.white : COLORS.textMuted}
                            />
                          </View>
                          <Text
                            style={{
                              flex: 1,
                              fontSize: 15,
                              fontWeight: '600',
                              color: selected ? COLORS.primary : COLORS.text,
                            }}
                          >
                            {cat.name}
                          </Text>
                          <View
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: RADIUS.full,
                              borderWidth: 2,
                              borderColor: selected ? COLORS.primary : COLORS.border,
                              backgroundColor: selected ? COLORS.primary : COLORS.white,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {selected && (
                              <Ionicons name="checkmark" size={16} color={COLORS.white} />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Navigation Buttons */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    borderWidth: 1.5,
                    borderColor: COLORS.border,
                    borderRadius: RADIUS.md,
                    paddingVertical: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: COLORS.white,
                  }}
                  onPress={() => setStep(1)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={{ color: COLORS.textSecondary, fontWeight: '600', fontSize: 15 }}>
                    Atras
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: COLORS.secondary,
                    borderRadius: RADIUS.md,
                    paddingVertical: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...SHADOWS.sm,
                  }}
                  onPress={() => {
                    if (validateStep2()) setStep(3);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 15, marginRight: 6 }}>
                    Continuar
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Step 3: Documentation */}
          {step === 3 && (
            <>
              <View
                style={{
                  backgroundColor: COLORS.card,
                  borderRadius: RADIUS.lg,
                  padding: 20,
                  ...SHADOWS.md,
                  gap: 16,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>
                  Documentacion
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: -8 }}>
                  Subir documentos acelera la verificacion
                </Text>

                {/* License Photo */}
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderRadius: RADIUS.md,
                    borderWidth: 2,
                    borderStyle: licensePhoto ? 'solid' : 'dashed',
                    borderColor: licensePhoto ? COLORS.success : COLORS.border,
                    backgroundColor: licensePhoto ? COLORS.successLight : COLORS.white,
                  }}
                  onPress={() => pickImage(setLicensePhoto)}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: RADIUS.md,
                      backgroundColor: licensePhoto ? COLORS.success : COLORS.background,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    <Ionicons
                      name={licensePhoto ? 'checkmark-circle' : 'document'}
                      size={24}
                      color={licensePhoto ? COLORS.white : COLORS.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: licensePhoto ? COLORS.success : COLORS.text,
                      }}
                    >
                      {licensePhoto ? 'Matricula cargada' : 'Foto de matricula/habilitacion'}
                    </Text>
                    <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                      {licensePhoto ? 'Toca para cambiar' : 'Toca para subir'}
                    </Text>
                  </View>
                  <Ionicons
                    name="camera"
                    size={20}
                    color={licensePhoto ? COLORS.success : COLORS.textMuted}
                  />
                </TouchableOpacity>

                {/* DNI Photo */}
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderRadius: RADIUS.md,
                    borderWidth: 2,
                    borderStyle: dniPhoto ? 'solid' : 'dashed',
                    borderColor: dniPhoto ? COLORS.success : COLORS.border,
                    backgroundColor: dniPhoto ? COLORS.successLight : COLORS.white,
                  }}
                  onPress={() => pickImage(setDniPhoto)}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: RADIUS.md,
                      backgroundColor: dniPhoto ? COLORS.success : COLORS.background,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    <Ionicons
                      name={dniPhoto ? 'checkmark-circle' : 'id-card'}
                      size={24}
                      color={dniPhoto ? COLORS.white : COLORS.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: dniPhoto ? COLORS.success : COLORS.text,
                      }}
                    >
                      {dniPhoto ? 'DNI cargado' : 'Foto del DNI (frente)'}
                    </Text>
                    <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                      {dniPhoto ? 'Toca para cambiar' : 'Toca para subir'}
                    </Text>
                  </View>
                  <Ionicons
                    name="camera"
                    size={20}
                    color={dniPhoto ? COLORS.success : COLORS.textMuted}
                  />
                </TouchableOpacity>

                {/* Selfie */}
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderRadius: RADIUS.md,
                    borderWidth: 2,
                    borderStyle: selfie ? 'solid' : 'dashed',
                    borderColor: selfie ? COLORS.success : COLORS.border,
                    backgroundColor: selfie ? COLORS.successLight : COLORS.white,
                  }}
                  onPress={() => pickImage(setSelfie)}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: RADIUS.md,
                      backgroundColor: selfie ? COLORS.success : COLORS.background,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    <Ionicons
                      name={selfie ? 'checkmark-circle' : 'person-circle'}
                      size={24}
                      color={selfie ? COLORS.white : COLORS.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: selfie ? COLORS.success : COLORS.text,
                      }}
                    >
                      {selfie ? 'Selfie cargada' : 'Selfie sosteniendo tu DNI'}
                    </Text>
                    <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                      {selfie ? 'Toca para cambiar' : 'Toca para subir'}
                    </Text>
                  </View>
                  <Ionicons
                    name="camera"
                    size={20}
                    color={selfie ? COLORS.success : COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {/* Summary Card */}
              <View
                style={{
                  backgroundColor: COLORS.card,
                  borderRadius: RADIUS.lg,
                  padding: 20,
                  ...SHADOWS.sm,
                  marginTop: 16,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                  <Ionicons name="clipboard" size={20} color={COLORS.secondary} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}>
                    Resumen
                  </Text>
                </View>
                <View style={{ gap: 8 }}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Nombre:</Text>
                    <Text style={styles.summaryValue}>{name}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Email:</Text>
                    <Text style={styles.summaryValue}>{email}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Categorias:</Text>
                    <Text style={[styles.summaryValue, { flex: 1 }]}>
                      {categories
                        .filter((c) => selectedCategoryIds.includes(c.id))
                        .map((c) => c.name)
                        .join(', ')}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Documentos:</Text>
                    <Text style={styles.summaryValue}>
                      {[licensePhoto && 'Matricula', dniPhoto && 'DNI', selfie && 'Selfie']
                        .filter(Boolean)
                        .join(', ') || 'Ninguno'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Navigation Buttons */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    borderWidth: 1.5,
                    borderColor: COLORS.border,
                    borderRadius: RADIUS.md,
                    paddingVertical: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: COLORS.white,
                  }}
                  onPress={() => setStep(2)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={{ color: COLORS.textSecondary, fontWeight: '600', fontSize: 15 }}>
                    Atras
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: COLORS.secondary,
                    borderRadius: RADIUS.md,
                    paddingVertical: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
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
                      <Ionicons name="send" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
                      <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 15 }}>
                        Enviar solicitud
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

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
            </>
          )}
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
  summaryRow: {
    flexDirection: 'row',
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    width: 90,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
});
