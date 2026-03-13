import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function ProfessionalLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1A3C5E',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          paddingBottom: 4,
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pedidos',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 22 }}>{focused ? '📋' : '📄'}</Text>,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Ganancias',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 22 }}>{focused ? '💰' : '💵'}</Text>,
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
      <Tabs.Screen name="request/[id]" options={{ href: null }} />
      <Tabs.Screen name="job/[id]" options={{ href: null }} />
    </Tabs>
  );
}
