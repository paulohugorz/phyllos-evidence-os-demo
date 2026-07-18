import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Piece } from '@/src/lib/types';
import { colors } from '@/src/lib/theme';
import { Badge } from './UI';

const stageLabel: Record<string, string> = { planned: 'Planejamento', materials: 'Materiais', cutting: 'Corte', sewing: 'Costura', fitting: 'Prova', quality: 'Qualidade', ready: 'Pronta', delivered: 'Entregue' };
export function PieceCard({ piece, onPress }: { piece: Piece; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: .75 }]}>
    {piece.images[0] ? <Image source={{ uri: piece.images[0] }} style={styles.image} /> : <View style={styles.placeholder}><Text style={styles.placeholderText}>PH</Text></View>}
    <View style={styles.content}><Text style={styles.name}>{piece.name}</Text><Text style={styles.meta}>{piece.category} · {piece.material || 'material a definir'}</Text><View style={styles.row}><Badge>{stageLabel[piece.stage]}</Badge><Text style={styles.quantity}>{piece.quantity} peça(s)</Text></View></View>
  </Pressable>;
}
const styles = StyleSheet.create({ card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', minHeight: 118 }, image: { width: 112, height: '100%' }, placeholder: { width: 112, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }, placeholderText: { fontSize: 28, fontWeight: '600', color: colors.ink }, content: { flex: 1, padding: 14, gap: 7 }, name: { fontSize: 20, fontWeight: '600', color: colors.ink }, meta: { fontSize: 14, lineHeight: 20, color: colors.muted }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, quantity: { color: colors.muted, fontSize: 13 } });
