import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { Button, Field, Subtitle } from '@/src/components/UI';
import { useApp } from '@/src/context/AppContext';
import { colors } from '@/src/lib/theme';

const categories = ['Camisa', 'Camiseta', 'Calça', 'Vestido', 'Jaqueta', 'Saia', 'Outro'];
export default function NewPiece() {
  const { addPiece } = useApp();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(''); const [category, setCategory] = useState(''); const [quantity, setQuantity] = useState('1'); const [client, setClient] = useState(''); const [material, setMaterial] = useState('');
  async function save() { if (!name.trim() || !category) return Alert.alert('Complete o cadastro', 'Informe o nome e selecione uma categoria.'); setSaving(true); const piece = await addPiece({ name: name.trim(), category, client, material, quantity: Math.max(1, Number(quantity) || 1), stage: 'planned', wastePct: 15, carbonKg: 4, waterL: 2500, chemicalControl: 2.5, materialCircularity: 2.5, durabilityUses: 40, coverage: 35, confidence: 25 }); setSaving(false); router.replace(`/piece/${piece.id}` as any); }
  return <Screen><Subtitle>Comece com o essencial. Os demais dados podem ser completados durante a produção.</Subtitle><Field label="Nome da peça *" value={name} onChangeText={setName} placeholder="Ex.: Vestido Aurora" /><Text style={styles.label}>Categoria *</Text><View style={styles.chips}>{categories.map((item) => <Text key={item} onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipActive]}>{item}</Text>)}</View><Field label="Quantidade" keyboardType="numeric" value={quantity} onChangeText={setQuantity} /><Field label="Cliente ou projeto" value={client} onChangeText={setClient} placeholder="Opcional" /><Field label="Material principal" value={material} onChangeText={setMaterial} placeholder="Pode ser preenchido depois" /><Button label="Criar peça" loading={saving} onPress={save} /></Screen>;
}
const styles = StyleSheet.create({ label: { fontSize: 13, fontWeight: '700', color: colors.ink }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: colors.ink }, chipActive: { backgroundColor: colors.ink, color: colors.white, borderColor: colors.ink } });
