import { Linking, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { Button, Card, Eyebrow, Subtitle, Title } from '@/src/components/UI';
import { useApp } from '@/src/context/AppContext';
import { colors } from '@/src/lib/theme';

const modules = [
  ['Produtos', 'Cria a identidade da peça e reúne material, quantidade e contexto.'],
  ['Produção', 'Acompanha etapa, prazo, imagens, perdas e decisões do ateliê.'],
  ['PI5', 'Transforma os dados da produção em score ambiental comparável.'],
  ['Lacunas', 'Mostra quais informações ainda faltam para aumentar cobertura e confiança.'],
  ['Dossiê', 'Congela um snapshot das evidências e limitações disponíveis.'],
];
const portal = process.env.EXPO_PUBLIC_WEB_PORTAL_URL || 'https://phyllos-evidence-os-demo.onrender.com';
export default function Help() {
  const { restartOnboarding } = useApp();
  return <Screen><View style={{ gap: 8 }}><Eyebrow>INÍCIO E AJUDA</Eyebrow><Title>Entenda o fluxo da PHYLLOS.</Title><Subtitle>Cada módulo reaproveita o que já foi registrado. A usuária não precisa preencher a mesma informação várias vezes.</Subtitle></View><Card><Text style={styles.flowTitle}>Fluxo principal</Text><Text style={styles.flow}>PRODUTOS → PRODUÇÃO → PI5 → LACUNAS → DOSSIÊ</Text></Card>{modules.map(([name, text], index) => <Card key={name}><Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text><Text style={styles.module}>{name}</Text><Text style={styles.description}>{text}</Text></Card>)}<Card><Text style={styles.module}>Consultas rápidas</Text><Text style={styles.description}>• Onde cadastro uma nova peça? Produção → Cadastrar peça.</Text><Text style={styles.description}>• Onde fotografo o tecido? Início → Registrar tecido ou abra uma peça.</Text><Text style={styles.description}>• O PI5 funciona offline? Sim. O resultado entra na fila e sincroniza depois.</Text><Text style={styles.description}>• Onde vejo o dossiê? No portal web completo.</Text></Card><Button label="Rever onboarding" onPress={async () => { await restartOnboarding(); router.replace('/onboarding'); }} /><Button secondary label="Abrir portal web completo" onPress={() => Linking.openURL(portal)} /></Screen>;
}
const styles = StyleSheet.create({ flowTitle: { fontSize: 14, fontWeight: '700', color: colors.muted }, flow: { fontSize: 18, lineHeight: 28, fontWeight: '700', color: colors.ink }, number: { color: colors.gold, fontSize: 14, letterSpacing: 2 }, module: { fontSize: 23, fontWeight: '600', color: colors.ink }, description: { fontSize: 15, lineHeight: 23, color: colors.muted } });
