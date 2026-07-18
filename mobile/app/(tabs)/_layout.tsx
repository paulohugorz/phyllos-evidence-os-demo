import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/lib/theme';

export default function TabsLayout() {
  return <Tabs screenOptions={{ headerStyle: { backgroundColor: colors.paper }, headerShadowVisible: false, headerTintColor: colors.ink, tabBarActiveTintColor: colors.ink, tabBarInactiveTintColor: '#7C746E', tabBarStyle: { height: 74, paddingTop: 8, paddingBottom: 12, backgroundColor: colors.white, borderTopColor: colors.line }, tabBarLabelStyle: { fontSize: 12, fontWeight: '600' } }}>
    <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="production" options={{ title: 'Produção', tabBarIcon: ({ color, size }) => <Ionicons name="shirt-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="impact" options={{ title: 'PI5', tabBarIcon: ({ color, size }) => <Ionicons name="leaf-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="help" options={{ title: 'Ajuda', tabBarIcon: ({ color, size }) => <Ionicons name="help-circle-outline" color={color} size={size} /> }} />
  </Tabs>;
}
