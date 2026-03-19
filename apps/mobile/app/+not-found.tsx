import { Link, Stack } from 'expo-router';
import { View, Text } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Pantalla no encontrada' }} />
      <View className="flex-1 items-center justify-center p-6 bg-white">
        <Text className="text-6xl mb-4">🔍</Text>
        <Text className="text-xl font-heading text-secondary mb-2">Pantalla no encontrada</Text>
        <Link href="/(auth)/login">
          <Text className="text-primary font-body-medium mt-4">Volver al inicio</Text>
        </Link>
      </View>
    </>
  );
}
