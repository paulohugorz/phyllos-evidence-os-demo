import { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors } from '@/src/lib/theme';

export function Eyebrow({ children }: PropsWithChildren) { return <Text style={styles.eyebrow}>{children}</Text>; }
export function Title({ children }: PropsWithChildren) { return <Text style={styles.title}>{children}</Text>; }
export function Subtitle({ children }: PropsWithChildren) { return <Text style={styles.subtitle}>{children}</Text>; }
export function Card({ children }: PropsWithChildren) { return <View style={styles.card}>{children}</View>; }
export function Field({ label, ...props }: TextInputProps & { label: string }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor="#8A817A" style={styles.input} {...props} /></View>; }
export function Button({ label, onPress, secondary, disabled, loading }: { label: string; onPress?: () => void; secondary?: boolean; disabled?: boolean; loading?: boolean }) { return <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, (disabled || loading) && styles.disabled, pressed && styles.pressed]}>{loading ? <ActivityIndicator color={secondary ? colors.ink : colors.white} /> : <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{label}</Text>}</Pressable>; }
export function Badge({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'good' | 'warn' | 'danger' }>) { return <View style={[styles.badge, tone === 'good' && styles.good, tone === 'warn' && styles.warn, tone === 'danger' && styles.danger]}><Text style={styles.badgeText}>{children}</Text></View>; }

const styles = StyleSheet.create({
  eyebrow: { fontSize: 12, letterSpacing: 2.2, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  title: { fontSize: 34, lineHeight: 38, color: colors.ink, fontWeight: '500' },
  subtitle: { fontSize: 16, lineHeight: 24, color: colors.muted },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 12 },
  field: { gap: 7 }, label: { fontSize: 13, fontWeight: '700', color: colors.ink },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FBFAF7', paddingHorizontal: 14, fontSize: 17, color: colors.ink },
  button: { minHeight: 52, backgroundColor: colors.ink, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  buttonSecondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink }, buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 }, buttonSecondaryText: { color: colors.ink },
  disabled: { opacity: .5 }, pressed: { opacity: .78 },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.sand, paddingHorizontal: 10, paddingVertical: 6 }, good: { backgroundColor: '#DCE9E2' }, warn: { backgroundColor: '#F2E6CD' }, danger: { backgroundColor: '#F1D9D4' }, badgeText: { fontSize: 12, fontWeight: '700', color: colors.ink },
});
