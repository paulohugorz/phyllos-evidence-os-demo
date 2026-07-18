import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/src/lib/theme';

export function Screen({ children, contentStyle }: PropsWithChildren<{ contentStyle?: ViewStyle }>) {
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView style={styles.scroll} contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled">{children}</ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.paper }, scroll: { flex: 1 }, content: { padding: 18, paddingBottom: 120, gap: 16 } });
