import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { Button, Eyebrow, Subtitle, Title } from '@/src/components/UI';
import { PieceCard } from '@/src/components/PieceCard';
import { useApp } from '@/src/context/AppContext';
import { colors } from '@/src/lib/theme';

export default function Production() {
  const { pieces } = useApp();
  return <Screen><View style={styles.intro}><Eyebrow>PRODUÇÃO MÓVEL</Eyebrow><Title>Acompanhe as peças enquanto o trabalho acontece.</Title><Subtitle>Abra uma peça para mudar a etapa, adicionar fotos e atualizar os dados usados pelo PI5.</Subtitle><Button label="+ Cadastrar nova peça" onPress={() => router.push('/piece/new')} /></View>{pieces.length ? pieces.map((piece) => <PieceCard key={piece.id} piece={piece} onPress={() => router.push(`/piece/${piece.id}` as any)} />) : <View style={styles.empty}><Text style={styles.emptyTitle}>Nenhuma peça cadastrada</Text><Text style={styles.emptyText}>O primeiro cadastro pode começar apenas com nome, categoria e quantidade.</Text></View>}</Screen>;
}
const styles = StyleSheet.create({ intro: { gap: 10 }, empty: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, padding: 28, gap: 8 }, emptyTitle: { fontSize: 22, fontWeight: '600', color: colors.ink }, emptyText: { fontSize: 16, lineHeight: 24, color: colors.muted } });
