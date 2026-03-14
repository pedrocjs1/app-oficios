import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';

export default function ClientLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B1A',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          paddingBottom: Platform.OS === 'ios' ? 20 : 4,
          height: Platform.OS === 'ios' ? 80 : 60,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 22 }}>{focused ? '🏠' : '🏡'}</Text>,
        }}
      />
      <Tabs.Screen
        name="new-request"
        options={{
          title: 'Pedir ayuda',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 22 }}>➕</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 22 }}>{focused ? '👤' : '👥'}</Text>,
        }}
      />
      {/* Pantallas sin tab */}
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="request/[id]" options={{ href: null }} />
      <Tabs.Screen name="job/[id]" options={{ href: null }} />
    </Tabs>
  );
}
