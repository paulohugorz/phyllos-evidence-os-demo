import { PI5Result, Piece } from './types';

const API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://phyllos-evidence-os-demo.onrender.com').replace(/\/$/, '');

const benchmarks: Record<string, { carbonKg: number; waterL: number; wastePct: number; durabilityUses: number }> = {
  generic: { carbonKg: 4, waterL: 2500, wastePct: 15, durabilityUses: 40 },
  camiseta: { carbonKg: 3.2, waterL: 2200, wastePct: 12, durabilityUses: 40 },
  camisa: { carbonKg: 4.5, waterL: 3200, wastePct: 14, durabilityUses: 55 },
  calca: { carbonKg: 7.5, waterL: 4200, wastePct: 16, durabilityUses: 90 },
  vestido: { carbonKg: 6, waterL: 3600, wastePct: 16, durabilityUses: 55 },
  jaqueta: { carbonKg: 12, waterL: 5000, wastePct: 18, durabilityUses: 110 },
};

function categoryKey(value = '') {
  const name = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (name.includes('camiseta')) return 'camiseta';
  if (name.includes('camisa')) return 'camisa';
  if (name.includes('calca')) return 'calca';
  if (name.includes('vestido')) return 'vestido';
  if (name.includes('jaqueta') || name.includes('casaco')) return 'jaqueta';
  return 'generic';
}

const clamp = (value: number, min = 0, max = 5) => Math.min(max, Math.max(min, Number(value) || 0));
const logScore = (ratio: number) => clamp(2.5 - Math.log2(Math.max(0.0625, ratio || 1)));
const round = (value: number) => Number(value.toFixed(2));

export function pieceToPI5Input(piece: Piece) {
  return {
    entityId: piece.id,
    category: piece.category,
    name: piece.name,
    carbonKg: piece.carbonKg,
    waterL: piece.waterL,
    wastePct: piece.wastePct,
    chemicalControl: piece.chemicalControl,
    materialCircularity: piece.materialCircularity,
    durabilityUses: piece.durabilityUses,
    coverage: piece.coverage,
    confidence: piece.confidence,
    material: piece.material,
    quantity: piece.quantity,
  };
}

export function calculateOffline(input: Record<string, any>): PI5Result {
  const category = categoryKey(input.category || input.name);
  const b = benchmarks[category] || benchmarks.generic;
  const dimensions = {
    climate: logScore(Number(input.carbonKg || 0) / Math.max(0.001, b.carbonKg)),
    water: logScore(Number(input.waterL || 0) / Math.max(0.001, b.waterL)),
    chemicals: clamp(Number(input.chemicalControl ?? 2.5)),
    materials: clamp(Number(input.materialCircularity ?? 2.5)),
    wasteCircularity: logScore(Number(input.wastePct ?? b.wastePct) / Math.max(0.1, b.wastePct)),
    durability: logScore(b.durabilityUses / Math.max(1, Number(input.durabilityUses || b.durabilityUses))),
  };
  let score = dimensions.climate * .3 + dimensions.water * .2 + dimensions.chemicals * .15 + dimensions.materials * .15 + dimensions.wasteCircularity * .1 + dimensions.durability * .1;
  const critical = Object.values(dimensions).some((value) => value < 1);
  if (critical) score = Math.min(2.5, score);
  const coverage = Number(input.coverage || 35);
  const confidence = Number(input.confidence || 25);
  return {
    predictionId: `offline-${Date.now()}`,
    methodology: 'PHYLLOS Impact 5',
    methodologyVersion: '0.1.0',
    modelVersion: 'pi5-mobile-offline-0.1.0',
    modelType: 'rules_baseline',
    category,
    score: round(score),
    dimensions: Object.fromEntries(Object.entries(dimensions).map(([key, value]) => [key, round(value)])) as PI5Result['dimensions'],
    coverage,
    confidence,
    publicationStatus: coverage < 60 ? 'insufficient' : coverage < 80 ? 'experimental' : confidence >= 70 ? 'contextualized' : 'limited-confidence',
    critical,
    calculatedAt: new Date().toISOString(),
    source: 'offline',
    pendingSync: true,
  };
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}

export async function predictPI5(input: Record<string, unknown>): Promise<PI5Result> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/api/v1/pi5/predict`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`PI5 ${response.status}`);
    return { ...(await response.json()), source: 'server', pendingSync: false } as PI5Result;
  } catch {
    return calculateOffline(input);
  }
}

export async function predictPI5Online(input: Record<string, unknown>): Promise<PI5Result> {
  const response = await fetchWithTimeout(`${API_BASE}/api/v1/pi5/predict`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`PI5 ${response.status}`);
  return { ...(await response.json()), source: 'server', pendingSync: false } as PI5Result;
}

export async function fetchPI5Summary() {
  const response = await fetchWithTimeout(`${API_BASE}/api/v1/pi5/summary`, { method: 'GET' }, 8000);
  if (!response.ok) throw new Error('Resumo indisponível');
  return response.json();
}
