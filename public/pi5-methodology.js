export const PI5_WEIGHTS = { climate: 0.30, water: 0.20, chemicals: 0.15, materials: 0.15, wasteCircularity: 0.10, durability: 0.10 };
export const PI5_LABELS = { climate: "Clima", water: "Água", chemicals: "Químicos", materials: "Materiais", wasteCircularity: "Resíduos e circularidade", durability: "Durabilidade" };
export const PI5_BENCHMARKS = {
  generic: { carbonKg: 4.0, waterL: 2500, wastePct: 15, durabilityUses: 40 },
  camiseta: { carbonKg: 3.2, waterL: 2200, wastePct: 12, durabilityUses: 40 },
  camisa: { carbonKg: 4.5, waterL: 3200, wastePct: 14, durabilityUses: 55 },
  calca: { carbonKg: 7.5, waterL: 4200, wastePct: 16, durabilityUses: 90 },
  vestido: { carbonKg: 6.0, waterL: 3600, wastePct: 16, durabilityUses: 55 },
  jaqueta: { carbonKg: 12.0, waterL: 5000, wastePct: 18, durabilityUses: 110 },
};
const clamp = (value, min = 0, max = 5) => Math.min(max, Math.max(min, Number(value) || 0));
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const scoreRatio = (ratio) => clamp(2.5 - Math.log2(Math.max(0.0625, number(ratio, 1))));
export function normalizeCategory(value = "") {
  const text = String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (text.includes("camiseta")) return "camiseta";
  if (text.includes("camisa")) return "camisa";
  if (text.includes("calca")) return "calca";
  if (text.includes("vestido")) return "vestido";
  if (text.includes("jaqueta") || text.includes("casaco")) return "jaqueta";
  return "generic";
}
export function calculatePI5Local(input = {}) {
  const category = normalizeCategory(input.category || input.name);
  const benchmark = PI5_BENCHMARKS[category] || PI5_BENCHMARKS.generic;
  const carbonKg = Math.max(0, number(input.carbonKg));
  const waterL = Math.max(0, number(input.waterL));
  const wastePct = Math.max(0, number(input.wastePct, benchmark.wastePct));
  const chemicalControl = clamp(number(input.chemicalControl, 2.5));
  const materialCircularity = clamp(number(input.materialCircularity, 2.5));
  const durabilityUses = Math.max(1, number(input.durabilityUses, benchmark.durabilityUses));
  const coverage = Math.min(100, Math.max(0, number(input.coverage, 35)));
  const confidence = Math.min(100, Math.max(0, number(input.confidence, 25)));
  const dimensions = {
    climate: scoreRatio(carbonKg / Math.max(0.001, benchmark.carbonKg)),
    water: scoreRatio(waterL / Math.max(0.001, benchmark.waterL)),
    chemicals: chemicalControl,
    materials: materialCircularity,
    wasteCircularity: scoreRatio(wastePct / Math.max(0.1, benchmark.wastePct)),
    durability: scoreRatio(benchmark.durabilityUses / durabilityUses),
  };
  const raw = Object.entries(PI5_WEIGHTS).reduce((sum, [key, weight]) => sum + dimensions[key] * weight, 0);
  const critical = Object.values(dimensions).some((value) => value < 1);
  const score = critical ? Math.min(2.5, raw) : raw;
  return { predictionId: crypto.randomUUID?.() || `pi5-${Date.now()}`, methodology: "PHYLLOS Impact 5", methodologyVersion: "0.1.0", modelVersion: "pi5-rules-0.1.0", category, benchmark, score: Number(score.toFixed(2)), dimensions: Object.fromEntries(Object.entries(dimensions).map(([key, value]) => [key, Number(value.toFixed(2))])), coverage, confidence, publicationStatus: coverage < 60 ? "insufficient" : coverage < 80 ? "experimental" : confidence >= 70 ? "contextualized" : "limited-confidence", critical, features: { carbonKg, waterL, wastePct, chemicalControl, materialCircularity, durabilityUses, coverage, confidence }, calculatedAt: new Date().toISOString() };
}
