import { mkdir, readFile, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const clamp = (value, min = 0, max = 5) => Math.min(max, Math.max(min, Number(value) || 0));
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const safeLogScore = (ratio) => clamp(2.5 - Math.log2(Math.max(0.0625, number(ratio, 1))));

export const DEFAULT_PI5_MODEL = {
  methodology: "PHYLLOS Impact 5",
  methodologyVersion: "0.1.0",
  modelVersion: "pi5-rules-0.1.0",
  modelType: "rules_baseline",
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

export function calculatePI5(input = {}, model = DEFAULT_PI5_MODEL) {
  const category = normalizedCategory(input.category || input.productCategory || input.name);
  const benchmark = model.benchmarks?.[category] || model.benchmarks?.generic || DEFAULT_PI5_MODEL.benchmarks.generic;
  const carbonKg = Math.max(0, number(input.carbonKg ?? input.carbonPerUnit));
  const waterL = Math.max(0, number(input.waterL ?? input.waterPerUnit));
  const wastePct = Math.max(0, number(input.wastePct ?? input.weightedWaste, benchmark.wastePct));
  const chemicalControl = clamp(number(input.chemicalControl, 2.5));
  const materialCircularity = clamp(number(input.materialCircularity, 2.5));
  const durabilityUses = Math.max(1, number(input.durabilityUses, benchmark.durabilityUses));
  const coverage = Math.min(100, Math.max(0, number(input.coverage, 35)));
  const confidence = Math.min(100, Math.max(0, number(input.confidence, 25)));

  const dimensions = {
    climate: safeLogScore(carbonKg / Math.max(0.001, benchmark.carbonKg)),
    water: safeLogScore(waterL / Math.max(0.001, benchmark.waterL)),
    chemicals: chemicalControl,
    materials: materialCircularity,
    wasteCircularity: safeLogScore(wastePct / Math.max(0.1, benchmark.wastePct)),
    durability: safeLogScore(benchmark.durabilityUses / durabilityUses),
  };
  const weights = model.weights || DEFAULT_PI5_MODEL.weights;
  const baseScore = Object.entries(weights).reduce((sum, [key, weight]) => sum + number(dimensions[key]) * number(weight), 0);
  const critical = Object.values(dimensions).some((value) => value < 1);
  let score = critical ? Math.min(2.5, baseScore) : baseScore;
  const mlFeatures = {
    base_score: score,
    climate: dimensions.climate,
    water: dimensions.water,
    chemicals: dimensions.chemicals,
    materials: dimensions.materials,
    waste_circularity: dimensions.wasteCircularity,
    durability: dimensions.durability,
    coverage: coverage / 100,
    confidence: confidence / 100,
  };
  score = calibrationPredict(model, { score, mlFeatures });
  const publicationStatus = coverage < 60 ? "insufficient" : coverage < 80 ? "experimental" : confidence >= 70 ? "contextualized" : "limited-confidence";
  return {
    predictionId: randomUUID(), methodology: model.methodology || DEFAULT_PI5_MODEL.methodology,
    methodologyVersion: model.methodologyVersion || DEFAULT_PI5_MODEL.methodologyVersion,
    modelVersion: model.modelVersion || DEFAULT_PI5_MODEL.modelVersion,
    modelType: model.modelType || "rules_baseline", category, benchmark, score: round(score, 2),
    dimensions: Object.fromEntries(Object.entries(dimensions).map(([key, value]) => [key, round(value, 2)])),
    coverage: round(coverage, 1), confidence: round(confidence, 1), publicationStatus, critical,
    features: { carbonKg, waterL, wastePct, chemicalControl, materialCircularity, durabilityUses, coverage, confidence },
    mlFeatures,
    calculatedAt: new Date().toISOString(),
  };
}

export class PI5MLOpsStore {
  constructor({ dataDir = process.env.PI5_DATA_DIR || join(process.cwd(), ".runtime", "pi5"), modelPath = join(process.cwd(), "models", "pi5", "champion.json") } = {}) {
    this.dataDir = dataDir;
    this.modelPath = modelPath;
    this.eventsPath = join(dataDir, "production-events.jsonl");
  }
  async ensure() { await mkdir(this.dataDir, { recursive: true }); }
  async currentModel() {
    try { return { ...DEFAULT_PI5_MODEL, ...JSON.parse(await readFile(this.modelPath, "utf8")) }; }
    catch { return DEFAULT_PI5_MODEL; }
  }
  async append(eventType, payload = {}) {
    await this.ensure();
    const event = { id: randomUUID(), eventType, occurredAt: new Date().toISOString(), ...payload };
    await appendFile(this.eventsPath, `${JSON.stringify(event)}\n`, "utf8");
    return event;
  }
  async predict(input = {}) {
    const model = await this.currentModel();
    const prediction = calculatePI5(input, model);
    const event = await this.append("prediction", { entityId: input.entityId || input.productId || "unknown", category: prediction.category, modelVersion: prediction.modelVersion, inputs: input, prediction });
    return { ...prediction, eventId: event.id };
  }
  async feedback(input = {}) {
    const expertScore = number(input.expertScore, NaN);
    if (!input.predictionId) throw new Error("predictionId é obrigatório");
    if (!Number.isFinite(expertScore) || expertScore < 0 || expertScore > 5) throw new Error("expertScore deve estar entre 0 e 5");
    if (!String(input.validatedBy || "").trim()) throw new Error("validatedBy é obrigatório");
    return this.append("expert_feedback", { ...input, expertScore: round(expertScore, 2), labelStatus: "validated" });
  }
  async lines() {
    try { return (await readFile(this.eventsPath, "utf8")).split("\n").filter(Boolean); }
    catch { return []; }
  }
  async summary() {
    const events = (await this.lines()).map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
    const predictions = events.filter((item) => item.eventType === "prediction");
    const feedback = events.filter((item) => item.eventType === "expert_feedback" && item.labelStatus === "validated");
    const model = await this.currentModel();
    return { modelVersion: model.modelVersion, modelType: model.modelType, predictions: predictions.length, validatedFeedback: feedback.length, minimumForTraining: model.promotionPolicy?.minValidatedExamples || 70, readyForTraining: feedback.length >= (model.promotionPolicy?.minValidatedExamples || 70), lastEventAt: events.at(-1)?.occurredAt || null, persistenceMode: process.env.PI5_DATA_DIR ? "configured-directory" : "ephemeral-demo" };
  }
  async exportJsonl() { return (await this.lines()).join("\n") + ((await this.lines()).length ? "\n" : ""); }
}
