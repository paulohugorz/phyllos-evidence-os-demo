import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/Screen';
import { Badge, Button, Card, Eyebrow, Subtitle, Title } from '@/src/components/UI';
import { useApp } from '@/src/context/AppContext';
import { colors } from '@/src/lib/theme';

const portal = process.env.EXPO_PUBLIC_WEB_PORTAL_URL || 'https://phyllos-evidence-os-demo.onrender.com';
export default function Home() {
  const { pieces, impacts, pending, syncPending, pipelineSummary } = useApp();
  const active = pieces.filter((p) => p.stage !== 'delivered').length;
  const calculated = Object.values(impacts).filter((items) => items.length).length;
  const quick = [
    { icon: 'add-circle-outline', label: 'Cadastrar peça', desc: 'Comece com nome e categoria.', action: () => router.push('/piece/new') },
    { icon: 'camera-outline', label: 'Registrar tecido', desc: 'Fotografe e descreva o material.', action: () => router.push('/identify') },
    { icon: 'leaf-outline', label: 'Calcular PI5', desc: 'Compare o impacto na escala 0–5.', action: () => router.push('/(tabs)/impact') },
    { icon: 'globe-outline', label: 'Abrir portal completo', desc: 'Acesse lacunas, visão geral e dossiê.', action: () => Linking.openURL(portal) },
  ];
  return <Screen><View style={styles.hero}><Eyebrow>PHYLLOS EVIDENCE OS</Eyebrow><Title>Bom trabalho. O que precisa acontecer agora?</Title><Subtitle>Registre enquanto produz. A PHYLLOS organiza os dados e preserva o contexto.</Subtitle></View><View style={styles.metrics}><Card><Text style={styles.metricNumber}>{active}</Text><Text style={styles.metricLabel}>produções ativas</Text></Card><Card><Text style={styles.metricNumber}>{calculated}</Text><Text style={styles.metricLabel}>peças com PI5</Text></Card></View>{pending.length > 0 && <Card><Badge tone="warn">{pending.length} item(ns) offline</Badge><Text style={styles.syncText}>Há cálculos esperando conexão com o servidor PI5.</Text><Button label="Sincronizar agora" onPress={() => syncPending()} /></Card>}<View style={styles.section}><Text style={styles.sectionTitle}>Links rápidos</Text>{quick.map((item) => <Pressable key={item.label} onPress={item.action} style={({ pressed }) => [styles.quick, pressed && { opacity: .7 }]}><View style={styles.icon}><Ionicons name={item.icon as any} size={25} color={colors.ink} /></View><View style={{ flex: 1 }}><Text style={styles.quickTitle}>{item.label}</Text><Text style={styles.quickDesc}>{item.desc}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.muted} /></Pressable>)}</View><Card><Text style={styles.sectionTitle}>Esteira PI5</Text><Text style={styles.quickDesc}>{pipelineSummary ? `${pipelineSummary.validatedFeedback ?? 0} validações profissionais · modelo ${pipelineSummary.modelVersion}` : 'Resumo indisponível no momento. O aplicativo continua funcionando offline.'}</Text></Card></Screen>;
}
const styles = StyleSheet.create({ hero: { gap: 10, paddingVertical: 8 }, metrics: { flexDirection: 'row', gap: 10 }, metricNumber: { fontSize: 38, fontWeight: '600', color: colors.ink }, metricLabel: { color: colors.muted, fontSize: 14 }, syncText: { fontSize: 15, lineHeight: 22, color: colors.muted }, section: { gap: 10 }, sectionTitle: { fontSize: 22, fontWeight: '600', color: colors.ink }, quick: { minHeight: 86, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 13 }, icon: { width: 48, height: 48, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }, quickTitle: { fontSize: 17, fontWeight: '700', color: colors.ink }, quickDesc: { fontSize: 14, lineHeight: 20, color: colors.muted } });
