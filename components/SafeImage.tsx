import { useState } from 'react';
import { Image, View, Text, ImageStyle, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '@/constants/theme';

type Props = {
  uri: string | null | undefined;
  style: ImageStyle;
  fallbackIcon?: string;
  fallbackText?: string;
};

/**
 * Image component that shows a placeholder when the image fails to load.
 * Handles broken URLs from failed uploads gracefully.
 */
export function SafeImage({ uri, style, fallbackIcon = 'image-outline', fallbackText }: Props) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View
        style={[
          style as any,
          {
            backgroundColor: COLORS.borderLight,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <Ionicons name={fallbackIcon as any} size={24} color={COLORS.textMuted} />
        {fallbackText && (
          <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 4 }}>
            {fallbackText}
          </Text>
        )}
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
