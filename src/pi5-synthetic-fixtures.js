import { sha256, clamp, DIMENSIONS } from "./pi5-training-data.js";

export const DEFAULT_CATEGORIES = ["camiseta", "camisa", "calca", "vestido", "jaqueta", "generic"];

export const FEATURE_NAMES = [
  "renewableEnergyShare",
  "recycledContentShare",
  "certifiedMaterialShare",
  "waterIntensity",
  "chemicalRisk",
  "wasteRate",
  "durabilityCycles",
  "transportDistanceKm",
  "repairability",
  "traceabilityCoverage",
  "processEfficiency",
  "supplierEvidenceQuality",
];

const CATEGORY_PROFILES = {
  camiseta: { recycledContentShare: 0.35, waterIntensity: 0.62, durabilityCycles: 45, chemicalRisk: 0.42, wasteRate: 0.18 },
  camisa: { certifiedMaterialShare: 0.48, waterIntensity: 0.55, durabilityCycles: 62, chemicalRisk: 0.35, wasteRate: 0.20 },
  calca: { recycledContentShare: 0.25, waterIntensity: 0.70, durabilityCycles: 95, chemicalRisk: 0.50, wasteRate: 0.24 },
  vestido: { certifiedMaterialShare: 0.38, waterIntensity: 0.58, durabilityCycles: 55, chemicalRisk: 0.46, wasteRate: 0.28 },
  jaqueta: { recycledContentShare: 0.30, waterIntensity: 0.40, durabilityCycles: 125, chemicalRisk: 0.55, wasteRate: 0.22 },
  generic: { recycledContentShare: 0.28, waterIntensity: 0.52, durabilityCycles: 70, chemicalRisk: 0.44, wasteRate: 0.23 },
};

function xmur3(text) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRandom(seed = "pi5-synthetic-v3") {
  return mulberry32(xmur3(String(seed))());
}

function normal(random) {
  const u = Math.max(1e-12, random());
  const v = Math.max(1e-12, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function jitter(random, center, spread, min = 0, max = 1) {
  return clamp(center + normal(random) * spread, min, max);
}

function round(value, digits = 4) {
  return Number(Number(value).toFixed(digits));
}

function categoryProfile(category) {
  return CATEGORY_PROFILES[category] || CATEGORY_PROFILES.generic;
}

export function generateFeatureVector(category, random, lineageVariation = {}) {
  const profile = categoryProfile(category);
  const base = {
    renewableEnergyShare: jitter(random, 0.48, 0.22),
    recycledContentShare: jitter(random, profile.recycledContentShare ?? 0.28, 0.18),
    certifiedMaterialShare: jitter(random, profile.certifiedMaterialShare ?? 0.40, 0.20),
    waterIntensity: jitter(random, profile.waterIntensity ?? 0.52, 0.16),
    chemicalRisk: jitter(random, profile.chemicalRisk ?? 0.44, 0.15),
    wasteRate: jitter(random, profile.wasteRate ?? 0.23, 0.08),
    durabilityCycles: clamp((profile.durabilityCycles ?? 70) + normal(random) * 18, 15, 180),
    transportDistanceKm: clamp(800 + Math.abs(normal(random)) * 3200, 50, 12000),
    repairability: jitter(random, category === "jaqueta" ? 0.68 : 0.45, 0.22),
    traceabilityCoverage: jitter(random, 0.64, 0.20),
    processEfficiency: jitter(random, 0.58, 0.18),
    supplierEvidenceQuality: jitter(random, 0.72, 0.15),
  };
  const merged = { ...base, ...lineageVariation };
  return Object.fromEntries(Object.entries(merged).map(([key, value]) => [key, round(value)]));
}

export function syntheticTargets(features, random, noiseStd = 0.14) {
  const n = (scale = noiseStd) => normal(random) * scale;
  const transport = clamp(features.transportDistanceKm / 12000, 0, 1);
  const durabilityNorm = clamp(features.durabilityCycles / 150, 0, 1);

  const climate = clamp(
    1.15 + 2.0 * features.renewableEnergyShare + 0.85 * features.processEfficiency - 0.75 * transport + n(),
    0,
    5,
  );
  const water = clamp(
    4.75 - 3.25 * features.waterIntensity + 0.55 * features.traceabilityCoverage + n(),
    0,
    5,
  );
  const chemicals = clamp(
    4.7 - 3.6 * features.chemicalRisk + 0.55 * features.certifiedMaterialShare + n(),
    0,
    5,
  );
  const materials = clamp(
    0.85 + 1.9 * features.recycledContentShare + 1.35 * features.certifiedMaterialShare + 0.55 * features.supplierEvidenceQuality + n(),
    0,
    5,
  );
  const wasteCircularity = clamp(
    1.0 + 1.25 * features.recycledContentShare + 1.05 * features.repairability + 0.9 * features.processEfficiency - 1.8 * features.wasteRate + n(),
    0,
    5,
  );
  const durability = clamp(
    0.65 + 3.3 * durabilityNorm + 0.75 * features.repairability + n(),
    0,
    5,
  );

  const dimensionScores = { climate, water, chemicals, materials, wasteCircularity, durability };
  const weights = { climate: 0.20, water: 0.16, chemicals: 0.16, materials: 0.18, wasteCircularity: 0.14, durability: 0.16 };
  const globalScore = DIMENSIONS.reduce((sum, dimension) => sum + dimensionScores[dimension] * weights[dimension], 0);
  return {
    globalScore: round(clamp(globalScore + n(noiseStd * 0.45), 0, 5), 3),
    dimensionScores: Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, round(dimensionScores[dimension], 3)])),
  };
}

function makeHashes(recordId, features, target, assetCount = 6) {
  return {
    inputHash: sha256({ recordId, features }),
    labelHash: sha256({ recordId, target }),
    assetHashes: Array.from({ length: assetCount }, (_, index) => sha256(`${recordId}:asset:${index + 1}`)),
  };
}

export function generateSyntheticRecords({
  count = 720,
  seed = "pi5-synthetic-v3",
  categories = DEFAULT_CATEGORIES,
  invalidRate = 0.08,
  lineageSize = 2,
  methodologyVersion = "pi5-methodology-synthetic-v3",
  benchmarkVersion = "pi5-benchmark-synthetic-v3",
  modelVersion = "synthetic-generator-v3",
} = {}) {
  if (!Number.isInteger(count) || count < categories.length * 6) throw new Error("count insuficiente para splits por categoria");
  if (!(invalidRate >= 0 && invalidRate < 0.5)) throw new Error("invalidRate deve estar entre 0 e 0.5");
  const random = seededRandom(seed);
  const records = [];

  for (let index = 0; index < count; index += 1) {
    const category = categories[index % categories.length];
    const categoryIndex = Math.floor(index / categories.length);
    const lineageIndex = Math.floor(categoryIndex / lineageSize);
    const withinLineage = categoryIndex % lineageSize;
    const lineageGroupKey = `synthetic:${category}:lineage:${String(lineageIndex + 1).padStart(4, "0")}`;
    const lineageRandom = seededRandom(`${seed}:${lineageGroupKey}`);
    const lineageVariation = {
      traceabilityCoverage: jitter(lineageRandom, 0.64, 0.16),
      supplierEvidenceQuality: jitter(lineageRandom, 0.72, 0.12),
    };
    const features = generateFeatureVector(category, random, lineageVariation);
    if (withinLineage > 0) {
      for (const key of FEATURE_NAMES) {
        const spread = key === "durabilityCycles" ? 3.5 : key === "transportDistanceKm" ? 120 : 0.025;
        const min = 0;
        const max = key === "durabilityCycles" ? 180 : key === "transportDistanceKm" ? 12000 : 1;
        features[key] = round(clamp(features[key] + normal(random) * spread, min, max));
      }
    }
    const target = syntheticTargets(features, random);
    const recordId = `record:synthetic:${String(index + 1).padStart(6, "0")}`;
    const hashes = makeHashes(recordId, features, target);
    const intentionallyInvalid = random() < invalidRate;
    const invalidKind = intentionallyInvalid ? ["low_coverage", "silver", "low_evidence", "single_reviewer"][index % 4] : null;
    const quality = {
      coverage: invalidKind === "low_coverage" ? 62 : round(jitter(random, 0.93, 0.035, 0.80, 1) * 100, 2),
      confidence: round(jitter(random, 0.86, 0.05, 0.70, 0.99) * 100, 2),
      evidenceQuality: invalidKind === "low_evidence" ? 68 : round(jitter(random, 0.91, 0.04, 0.80, 0.99) * 100, 2),
      reviewerCount: invalidKind === "single_reviewer" ? 1 : 2,
      adjudicated: false,
      reliabilityScore: round(jitter(random, 0.90, 0.045, 0.80, 0.99) * 100, 2),
    };
    records.push({
      recordId,
      sampleId: `sample:synthetic:${String(index + 1).padStart(6, "0")}`,
      lineageGroupKey,
      category,
      features,
      target: { ...target, tier: invalidKind === "silver" ? "silver" : "gold" },
      quality,
      provenance: {
        methodologyVersion,
        benchmarkVersion,
        modelVersion,
        inputHash: hashes.inputHash,
        labelHash: hashes.labelHash,
        protocolVersion: "pi5-synthetic-labeling-v3",
        protocolHash: sha256("pi5-synthetic-labeling-v3"),
      },
      assetHashes: hashes.assetHashes,
      metadata: {
        synthetic: true,
        purpose: "infrastructure_validation_only",
        generatorVersion: "3.0.0",
        seed,
        intentionallyInvalid,
        invalidKind,
      },
    });
  }
  return records;
}
