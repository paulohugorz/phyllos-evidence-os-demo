import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useApp } from '@/src/context/AppContext';
import { colors } from '@/src/lib/theme';

export default function Index() {
  const { loading, onboardingDone } = useApp();
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}><ActivityIndicator size="large" color={colors.ink} /></View>;
  return <Redirect href={onboardingDone ? '/(tabs)' : '/onboarding'} />;
}
