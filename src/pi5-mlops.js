import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createPI5Repository } from "./pi5-persistence.js";
import { randomUUID } from "node:crypto";
import {
  FIELD_DEFINITIONS,
  compareReplay,
  enrichPI5Prediction,
  evidenceQuality,
  preparePI5Input,
  verifySnapshotIntegrity,
} from "./pi5-core.js";

const clamp = (value, min = 0, max = 5) => Math.min(max, Math.max(min, Number(value) || 0));
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const safeLogScore = (ratio) => clamp(2.5 - Math.log2(Math.max(0.0625, number(ratio, 1))));

export const DEFAULT_PI5_MODEL = {
  methodology: "PHYLLOS Impact 5",
  methodologyVersion: "0.2.0",
  benchmarkVersion: "pi5-benchmarks-0.1.0",
  modelVersion: "pi5-rules-0.2.0",
  modelType: "governed_rules_baseline",
  status: "champion",
  trainedExamples: 0,
  weights: { climate: 0.30, water: 0.20, chemicals: 0.15, materials: 0.15, wasteCircularity: 0.10, durability: 0.10 },
  benchmarks: {
    generic: { carbonKg: 4.0, waterL: 2500, wastePct: 15, durabilityUses: 40 },
    camiseta: { carbonKg: 3.2, waterL: 2200, wastePct: 12, durabilityUses: 40 },
    camisa: { carbonKg: 4.5, waterL: 3200, wastePct: 14, durabilityUses: 55 },
    calca: { carbonKg: 7.5, waterL: 4200, wastePct: 16, durabilityUses: 90 },
    vestido: { carbonKg: 6.0, waterL: 3600, wastePct: 16, durabilityUses: 55 },
    jaqueta: { carbonKg: 12.0, waterL: 5000, wastePct: 18, durabilityUses: 110 },
  },
  calibrationPolicy: { maxAbsoluteAdjustment: 0.5, preserveCriticalCap: true, mayChangePublicationGate: false },
  promotionPolicy: { minValidatedExamples: 70, minImprovementPct: 2, maxGlobalMae: 0.55, maxSubgroupMae: 0.85 },
};

function normalizedCategory(value = "") {
  const name = String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (name.includes("camiseta")) return "camiseta";
  if (name.includes("camisa")) return "camisa";
  if (name.includes("calca")) return "calca";
  if (name.includes("vestido")) return "vestido";
  if (name.includes("jaqueta") || name.includes("casaco")) return "jaqueta";
  return "generic";
}

function calibrationPredict(model, raw) {
  const calibration = model.calibration;
  if (!calibration?.featureOrder?.length) return raw.score;
  const values = calibration.featureOrder.map((key) => number(raw.mlFeatures[key]));
  const standardized = values.map((value, index) => (value - number(calibration.means[index])) / Math.max(1e-8, number(calibration.stds[index], 1)));
  return clamp(number(calibration.intercept) + standardized.reduce((sum, value, index) => sum + value * number(calibration.weights[index]), 0));
}

function preparedFromSnapshot(snapshot) {
  const records = snapshot.provenance || {};
  const weights = snapshot.methodology?.weights || DEFAULT_PI5_MODEL.weights;
  const dimensionQuality = {};
  let computedCoverage = 0;
  let weightedQuality = 0;
  let suppliedWeight = 0;
  for (const [field, record] of Object.entries(records)) {
    const dimension = FIELD_DEFINITIONS[field]?.dimension;
    if (!dimension) continue;
    const quality = evidenceQuality(record, snapshot.calculatedAt);
    dimensionQuality[dimension] = { field, quality, supplied: Boolean(record.supplied), sourceType: record.sourceType };
    const weight = number(weights[dimension]);
    if (record.supplied) {
      computedCoverage += weight;
      weightedQuality += weight * quality;
      suppliedWeight += weight;
    }
  }
  return {
    values: snapshot.normalizedInput || {},
    records,
    conflicts: snapshot.conflicts || [],
    dimensionQuality,
    coverage: number(snapshot.prediction?.coverage),
    confidence: number(snapshot.prediction?.confidence),
    computedCoverage: round(computedCoverage * 100, 1),
    computedConfidence: suppliedWeight ? round(weightedQuality / suppliedWeight * 100, 1) : 0,
    reportedCoverage: null,
    reportedConfidence: null,
    qualityMode: "snapshot-replay",
    evaluatedAt: snapshot.calculatedAt,
  };
}

export function calculatePI5(input = {}, model = DEFAULT_PI5_MODEL, options = {}) {
  const calculatedAt = options.calculatedAt || new Date().toISOString();
  const category = normalizedCategory(input.category || input.productCategory || input.name || options.category);
  const benchmark = model.benchmarks?.[category] || model.benchmarks?.generic || DEFAULT_PI5_MODEL.benchmarks.generic;
  const weights = model.weights || DEFAULT_PI5_MODEL.weights;
  const prepared = options.prepared || preparePI5Input(input, { benchmark, weights, evaluatedAt: calculatedAt });
  const carbonKg = Math.max(0, number(prepared.values.carbonKg, benchmark.carbonKg));
  const waterL = Math.max(0, number(prepared.values.waterL, benchmark.waterL));
  const wastePct = Math.max(0, number(prepared.values.wastePct, benchmark.wastePct));
  const chemicalControl = clamp(number(prepared.values.chemicalControl, 2.5));
  const materialCircularity = clamp(number(prepared.values.materialCircularity, 2.5));
  const durabilityUses = Math.max(1, number(prepared.values.durabilityUses, benchmark.durabilityUses));

  const dimensions = {
    climate: safeLogScore(carbonKg / Math.max(0.001, benchmark.carbonKg)),
    water: safeLogScore(waterL / Math.max(0.001, benchmark.waterL)),
    chemicals: chemicalControl,
    materials: materialCircularity,
    wasteCircularity: safeLogScore(wastePct / Math.max(0.1, benchmark.wastePct)),
    durability: safeLogScore(benchmark.durabilityUses / durabilityUses),
  };
  const weightedScore = Object.entries(weights).reduce((sum, [key, weight]) => sum + number(dimensions[key]) * number(weight), 0);
  const critical = Object.values(dimensions).some((value) => value < 1);
  const baseScore = critical ? Math.min(2.5, weightedScore) : weightedScore;
  const mlFeatures = {
    base_score: baseScore,
    climate: dimensions.climate,
    water: dimensions.water,
    chemicals: dimensions.chemicals,
    materials: dimensions.materials,
    waste_circularity: dimensions.wasteCircularity,
    durability: dimensions.durability,
    coverage: prepared.coverage / 100,
    confidence: prepared.confidence / 100,
  };
  const rawCalibrated = calibrationPredict(model, { score: baseScore, mlFeatures });
  const maxAdjustment = Math.max(0, number(model.calibrationPolicy?.maxAbsoluteAdjustment, 0.5));
  const adjustment = Math.min(maxAdjustment, Math.max(-maxAdjustment, rawCalibrated - baseScore));
  let score = clamp(baseScore + adjustment);
  if (critical && model.calibrationPolicy?.preserveCriticalCap !== false) score = Math.min(2.5, score);

  const prediction = {
    predictionId: options.predictionId || randomUUID(),
    methodology: model.methodology || DEFAULT_PI5_MODEL.methodology,
    methodologyVersion: model.methodologyVersion || DEFAULT_PI5_MODEL.methodologyVersion,
    benchmarkVersion: model.benchmarkVersion || DEFAULT_PI5_MODEL.benchmarkVersion,
    modelVersion: model.modelVersion || DEFAULT_PI5_MODEL.modelVersion,
    modelType: model.modelType || DEFAULT_PI5_MODEL.modelType,
    category,
    benchmark,
    score: round(score, 2),
    baseScore: round(baseScore, 2),
    dimensions: Object.fromEntries(Object.entries(dimensions).map(([key, value]) => [key, round(value, 2)])),
    coverage: prepared.coverage,
    confidence: prepared.confidence,
    critical,
    features: { carbonKg, waterL, wastePct, chemicalControl, materialCircularity, durabilityUses, coverage: prepared.coverage, confidence: prepared.confidence },
    mlFeatures,
    calculatedAt,
  };

  return enrichPI5Prediction({
    input,
    prepared,
    prediction,
    model,
    benchmark,
    weights,
    calculatedAt,
    createSnapshot: options.createSnapshot !== false,
  });
}

export class PI5MLOpsStore {
  constructor({ repository, dataDir, connectionString, sslMode, modelPath = join(process.cwd(), "models", "pi5", "champion.json") } = {}) {
    this.modelPath = modelPath;
    this.repository = createPI5Repository({ repository, dataDir, connectionString, sslMode });
  }
  async currentModel() {
    try {
      const saved = JSON.parse(await readFile(this.modelPath, "utf8"));
      return {
        ...DEFAULT_PI5_MODEL,
        ...saved,
        weights: { ...DEFAULT_PI5_MODEL.weights, ...(saved.weights || {}) },
        benchmarks: { ...DEFAULT_PI5_MODEL.benchmarks, ...(saved.benchmarks || {}) },
        calibrationPolicy: { ...DEFAULT_PI5_MODEL.calibrationPolicy, ...(saved.calibrationPolicy || {}) },
        promotionPolicy: { ...DEFAULT_PI5_MODEL.promotionPolicy, ...(saved.promotionPolicy || {}) },
      };
    } catch {
      return DEFAULT_PI5_MODEL;
    }
  }
  async append(eventType, payload = {}) {
    const event = { id: payload.id || randomUUID(), eventType, occurredAt: payload.occurredAt || new Date().toISOString(), ...payload };
    return this.repository.append(event);
  }
  async predict(input = {}) {
    const model = await this.currentModel();
    const prediction = calculatePI5(input, model);
    const event = await this.append("prediction", {
      entityId: input.entityId || input.productId || "unknown",
      category: prediction.category,
      modelVersion: prediction.modelVersion,
      methodologyVersion: prediction.methodologyVersion,
      benchmarkVersion: prediction.benchmarkVersion,
      predictionId: prediction.predictionId,
      snapshotId: prediction.snapshot?.snapshotId,
      gateState: prediction.gate.state,
      inputs: input,
      prediction,
    });
    return { ...prediction, eventId: event.id };
  }
  async feedback(input = {}) {
    const expertScore = number(input.expertScore, NaN);
    if (!input.predictionId) throw new Error("predictionId é obrigatório");
    if (!Number.isFinite(expertScore) || expertScore < 0 || expertScore > 5) throw new Error("expertScore deve estar entre 0 e 5");
    if (!String(input.validatedBy || "").trim()) throw new Error("validatedBy é obrigatório");
    const dimensionLabels = input.dimensionLabels && typeof input.dimensionLabels === "object" ? input.dimensionLabels : {};
    for (const [dimension, value] of Object.entries(dimensionLabels)) {
      if (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 5) throw new Error(`dimensionLabels.${dimension} deve estar entre 0 e 5`);
    }
    const model = await this.currentModel();
    const validatedAt = input.validatedAt || new Date().toISOString();
    return this.append("expert_feedback", {
      ...input,
      validationId: input.validationId || randomUUID(),
      expertScore: round(expertScore, 2),
      dimensionLabels: Object.fromEntries(Object.entries(dimensionLabels).map(([key, value]) => [key, round(Number(value), 2)])),
      validatedAt,
      modelVersion: input.modelVersion || model.modelVersion,
      methodologyVersion: input.methodologyVersion || model.methodologyVersion,
      labelStatus: "validated",
      validator: {
        id: String(input.validatedBy),
        role: input.validatorRole || "professional_reviewer",
        expertise: Array.isArray(input.validatorExpertise) ? input.validatorExpertise.map(String) : [],
      },
    });
  }
  async replay(snapshot = {}) {
    const integrity = verifySnapshotIntegrity(snapshot);
    if (!integrity.valid) {
      const error = new Error("Snapshot PI5 inválido ou alterado");
      error.code = "INVALID_PI5_SNAPSHOT";
      error.integrity = integrity;
      throw error;
    }
    const category = snapshot.benchmark?.category || "generic";
    const benchmark = snapshot.benchmark?.values || DEFAULT_PI5_MODEL.benchmarks.generic;
    const replayModel = {
      ...DEFAULT_PI5_MODEL,
      methodology: snapshot.methodology?.methodology || DEFAULT_PI5_MODEL.methodology,
      methodologyVersion: snapshot.methodology?.methodologyVersion || DEFAULT_PI5_MODEL.methodologyVersion,
      benchmarkVersion: snapshot.benchmark?.benchmarkVersion || DEFAULT_PI5_MODEL.benchmarkVersion,
      modelVersion: snapshot.model?.modelVersion || DEFAULT_PI5_MODEL.modelVersion,
      modelType: snapshot.model?.modelType || DEFAULT_PI5_MODEL.modelType,
      weights: snapshot.methodology?.weights || DEFAULT_PI5_MODEL.weights,
      benchmarks: { generic: benchmark, [category]: benchmark },
      calibration: snapshot.model?.calibration || null,
    };
    const actual = calculatePI5(
      { ...snapshot.normalizedInput, category, entityId: snapshot.entityId },
      replayModel,
      {
        calculatedAt: snapshot.calculatedAt,
        predictionId: snapshot.predictionId,
        prepared: preparedFromSnapshot(snapshot),
        category,
        createSnapshot: false,
      },
    );
    const expected = {
      ...snapshot.prediction,
      publicationStatus: snapshot.prediction?.gate?.state,
    };
    return {
      integrity,
      replay: compareReplay(expected, actual),
      predictionId: snapshot.predictionId,
      snapshotId: snapshot.snapshotId,
      actual,
      replayedAt: new Date().toISOString(),
    };
  }
  async lines() {
    return (await this.repository.list()).map((event) => JSON.stringify(event));
  }
  async summary() {
    const model = await this.currentModel();
    const minimumForTraining = model.promotionPolicy?.minValidatedExamples || 70;
    const persistence = await this.repository.summary({ minimumForTraining });
    return { modelVersion: model.modelVersion, modelType: model.modelType, methodologyVersion: model.methodologyVersion, benchmarkVersion: model.benchmarkVersion, ...persistence };
  }
  async health() {
    const model = await this.currentModel();
    return { modelVersion: model.modelVersion, modelType: model.modelType, methodologyVersion: model.methodologyVersion, ...(await this.repository.health()) };
  }
  async exportJsonl() { return this.repository.exportJsonl(); }
  async close() { return this.repository.close(); }
}
