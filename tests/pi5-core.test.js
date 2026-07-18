import test from "node:test";
import assert from "node:assert/strict";
import { calculatePI5, DEFAULT_PI5_MODEL, PI5MLOpsStore } from "../src/pi5-mlops.js";
import { verifySnapshotIntegrity } from "../src/pi5-core.js";

const evaluatedAt = "2026-07-18T12:00:00.000Z";

function verifiedProvenance() {
  return Object.fromEntries([
    "carbonKg", "waterL", "chemicalControl", "materialCircularity", "wastePct", "durabilityUses",
  ].map((field) => [field, {
    sourceType: "verified_measurement",
    epistemicStatus: "verified",
    actorId: "expert-1",
    method: "controlled_measurement",
    evidenceIds: [`evidence-${field}`],
    capturedAt: evaluatedAt,
  }]));
}

class MemoryRepository {
  constructor() { this.events = []; }
  async append(event) {
    const existing = this.events.find((item) => item.id === event.id);
    if (existing) return existing;
    this.events.push(event);
    return event;
  }
  async list() { return this.events; }
  async summary({ minimumForTraining = 70 } = {}) {
    const predictions = this.events.filter((item) => item.eventType === "prediction").length;
    const validatedFeedback = this.events.filter((item) => item.eventType === "expert_feedback" && item.labelStatus === "validated").length;
    return { predictions, validatedFeedback, minimumForTraining, readyForTraining: validatedFeedback >= minimumForTraining, durable: false, persistenceMode: "memory" };
  }
  async health() { return { ok: true, durable: false, mode: "memory" }; }
  async exportJsonl() { return this.events.map(JSON.stringify).join("\n") + (this.events.length ? "\n" : ""); }
  async close() {}
}

test("dados ausentes são neutros e bloqueiam publicação, não geram score excelente", () => {
  const result = calculatePI5({ category: "camisa" }, DEFAULT_PI5_MODEL, { calculatedAt: evaluatedAt });
  assert.equal(result.score, 2.5);
  assert.equal(result.coverage, 0);
  assert.equal(result.publicationStatus, "insufficient_data");
  assert.equal(result.gate.publishable, false);
  assert.ok(result.nextBestEvidence.length >= 1);
});

test("proveniência verificada deriva cobertura, confiança e resultado contextualizado", () => {
  const result = calculatePI5({
    entityId: "piece-1",
    category: "camisa",
    carbonKg: 3.5,
    waterL: 2400,
    chemicalControl: 3.8,
    materialCircularity: 3.6,
    wastePct: 9,
    durabilityUses: 80,
    provenance: verifiedProvenance(),
  }, DEFAULT_PI5_MODEL, { calculatedAt: evaluatedAt });
  assert.equal(result.qualityMode, "evidence-derived");
  assert.equal(result.coverage, 100);
  assert.ok(result.confidence >= 95);
  assert.equal(result.publicationStatus, "contextualized");
  assert.equal(result.gate.comparable, true);
  assert.ok(result.scoreInterval.lower <= result.score);
  assert.ok(result.scoreInterval.upper >= result.score);
});

test("calibração restrita não remove trava crítica", () => {
  const model = {
    ...DEFAULT_PI5_MODEL,
    calibration: { featureOrder: ["base_score"], means: [0], stds: [1], weights: [0], intercept: 5 },
    calibrationPolicy: { maxAbsoluteAdjustment: 0.5, preserveCriticalCap: true },
  };
  const result = calculatePI5({
    category: "camisa",
    carbonKg: 40,
    waterL: 2400,
    chemicalControl: 3,
    materialCircularity: 3,
    wastePct: 10,
    durabilityUses: 80,
    provenance: verifiedProvenance(),
  }, model, { calculatedAt: evaluatedAt });
  assert.equal(result.critical, true);
  assert.ok(result.score <= 2.5);
  assert.ok(Math.abs(result.calibrationDelta) <= 0.5);
  assert.ok(result.scoreInterval.upper <= 2.5);
});

test("snapshot detecta alteração e permite replay determinístico", async () => {
  const repository = new MemoryRepository();
  const store = new PI5MLOpsStore({ repository, modelPath: "/tmp/model-not-found.json" });
  const prediction = await store.predict({
    entityId: "piece-2",
    category: "camiseta",
    carbonKg: 2.8,
    waterL: 1800,
    chemicalControl: 3.4,
    materialCircularity: 3.2,
    wastePct: 8,
    durabilityUses: 60,
    provenance: verifiedProvenance(),
  });
  assert.equal(verifySnapshotIntegrity(prediction.snapshot).valid, true);
  const replay = await store.replay(prediction.snapshot);
  assert.equal(replay.integrity.valid, true);
  assert.equal(replay.replay.matches, true);

  const tampered = structuredClone(prediction.snapshot);
  tampered.prediction.score = 5;
  assert.equal(verifySnapshotIntegrity(tampered).valid, false);
  await assert.rejects(() => store.replay(tampered), /Snapshot PI5 inválido/);
});

test("feedback profissional preserva dimensão, versão e qualificação", async () => {
  const repository = new MemoryRepository();
  const store = new PI5MLOpsStore({ repository, modelPath: "/tmp/model-not-found.json" });
  const feedback = await store.feedback({
    predictionId: "prediction-1",
    expertScore: 3.7,
    dimensionLabels: { climate: 3.5, water: 3.9 },
    validatedBy: "expert-9",
    validatorRole: "engenheira_ambiental",
    validatorExpertise: ["textil", "agua"],
  });
  assert.equal(feedback.labelStatus, "validated");
  assert.equal(feedback.validator.id, "expert-9");
  assert.equal(feedback.dimensionLabels.water, 3.9);
  assert.ok(feedback.methodologyVersion);
  await assert.rejects(() => store.feedback({ predictionId: "p", expertScore: 4, validatedBy: "e", dimensionLabels: { climate: 8 } }), /entre 0 e 5/);
});
