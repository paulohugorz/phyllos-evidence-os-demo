import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { Button, Eyebrow, Subtitle, Title } from '@/src/components/UI';
import { useApp } from '@/src/context/AppContext';
import { colors } from '@/src/lib/theme';

const slides = [
  { eyebrow: 'BEM-VINDA À PHYLLOS', title: 'Sua produção organizada na palma da mão.', text: 'Cadastre peças, acompanhe prazos, fotografe evidências e registre decisões enquanto o trabalho acontece.', art: '01' },
  { eyebrow: 'DADOS QUE SE CONECTAM', title: 'Cada registro alimenta os próximos módulos.', text: 'Produtos alimentam Produção. Produção alimenta o PI5. Lacunas orientam o que falta e o Dossiê preserva as evidências.', art: '02' },
  { eyebrow: 'FUNCIONA NO ATELIÊ', title: 'Use com ou sem internet.', text: 'Os dados ficam no aparelho. Cálculos feitos offline entram na fila e são sincronizados com a esteira PI5 quando a conexão voltar.', art: '03' },
];
export default function Onboarding() {
  const [step, setStep] = useState(0);
  const { completeOnboarding } = useApp();
  const current = slides[step];
  async function next() { if (step < slides.length - 1) setStep(step + 1); else { await completeOnboarding(); router.replace('/(tabs)'); } }
  return <Screen contentStyle={styles.content}><View style={styles.art}><Text style={styles.artNumber}>{current.art}</Text><View style={styles.circle} /><Text style={styles.brand}>PHYLLOS</Text></View><View style={styles.copy}><Eyebrow>{current.eyebrow}</Eyebrow><Title>{current.title}</Title><Subtitle>{current.text}</Subtitle></View><View style={styles.dots}>{slides.map((_, i) => <View key={i} style={[styles.dot, i === step && styles.dotActive]} />)}</View><View style={styles.actions}>{step > 0 && <Button secondary label="Voltar" onPress={() => setStep(step - 1)} />}<Button label={step === slides.length - 1 ? 'Começar agora' : 'Continuar'} onPress={next} /></View></Screen>;
}
const styles = StyleSheet.create({ content: { flexGrow: 1, justifyContent: 'space-between' }, art: { minHeight: 300, backgroundColor: colors.ink, padding: 28, overflow: 'hidden', justifyContent: 'space-between' }, artNumber: { color: colors.gold, fontSize: 14, letterSpacing: 3 }, circle: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: colors.gold, right: -70, top: 40 }, brand: { color: colors.white, fontSize: 36, letterSpacing: 8, fontWeight: '300' }, copy: { gap: 12 }, dots: { flexDirection: 'row', gap: 8 }, dot: { width: 26, height: 4, backgroundColor: colors.line }, dotActive: { backgroundColor: colors.ink }, actions: { gap: 10 } });
