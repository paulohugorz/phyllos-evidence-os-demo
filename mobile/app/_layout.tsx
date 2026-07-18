import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '@/src/context/AppContext';
import { colors } from '@/src/lib/theme';

export default function RootLayout() {
  return <SafeAreaProvider><AppProvider><StatusBar style="dark" /><Stack screenOptions={{ headerStyle: { backgroundColor: colors.paper }, headerTintColor: colors.ink, headerShadowVisible: false, contentStyle: { backgroundColor: colors.paper }, headerTitleStyle: { fontWeight: '600' } }}><Stack.Screen name="index" options={{ headerShown: false }} /><Stack.Screen name="onboarding" options={{ headerShown: false }} /><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="piece/new" options={{ title: 'Cadastrar peça', presentation: 'modal' }} /><Stack.Screen name="piece/[id]" options={{ title: 'Detalhes da peça' }} /><Stack.Screen name="identify" options={{ title: 'Identificar tecido' }} /></Stack></AppProvider></SafeAreaProvider>;
}
