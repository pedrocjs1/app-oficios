import { useState } from 'react';
import { Image, View, Text, ImageStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

type Props = {
  uri: string | null | undefined;
  style: ImageStyle;
  fallbackIcon?: string;
  fallbackText?: string;
};

function Fallback({ style, fallbackIcon, fallbackText }: Omit<Props, 'uri'>) {
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
      <Ionicons name={(fallbackIcon || 'image-outline') as any} size={24} color={COLORS.textMuted} />
      {fallbackText && (
        <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 4 }}>
          {fallbackText}
        </Text>
      )}
    </View>
  );
}

export function SafeImage({ uri, style, fallbackIcon = 'image-outline', fallbackText }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!uri || failed) {
    return <Fallback style={style} fallbackIcon={fallbackIcon} fallbackText={fallbackText} />;
  }

  return (
    <View style={style as any}>
      {/* Show fallback underneath while loading / if 0-byte image renders invisible */}
      {!loaded && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
          <Fallback style={{ width: '100%', height: '100%' } as any} fallbackIcon={fallbackIcon} fallbackText={fallbackText} />
        </View>
      )}
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%', borderRadius: (style as any)?.borderRadius }}
        onLoad={(e) => {
          // Check if image has actual dimensions (0-byte images may report 0x0)
          const { width, height } = e.nativeEvent.source;
          if (width > 0 && height > 0) {
            setLoaded(true);
          } else {
            setFailed(true);
          }
        }}
        onError={() => setFailed(true)}
      />
    </View>
  );
}
