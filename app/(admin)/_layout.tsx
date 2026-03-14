import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B1A',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#1A3C5E',
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 4,
          height: Platform.OS === 'ios' ? 80 : 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>📊</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="professionals"
        options={{
          title: 'Profesionales',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>👷</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Usuarios',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>👥</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Pedidos',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20 }}>📋</Text>
          ),
        }}
      />
    </Tabs>
  );
}
