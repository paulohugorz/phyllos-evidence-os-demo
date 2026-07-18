import test from "node:test";
import assert from "node:assert/strict";
import { PI5TrainingOperations } from "../src/pi5-training-operations.js";
import { sha256 } from "../src/pi5-training-data.js";

const dimensions = { climate: 3.1, water: 3.2, chemicals: 3.0, materials: 3.4, wasteCircularity: 3.5, durability: 3.8 };

function setup({ disagreement = false } = {}) {
  const store = new PI5TrainingOperations();
  const org = store.createOrganization({ canonicalKey: "org:brand", name: "Marca", organizationType: "brand" });
  const system = store.createActor({ canonicalKey: "actor:system", displayName: "Sistema", actorType: "system" });
  const operator = store.createActor({ canonicalKey: "actor:operator", displayName: "Operador", actorType: "user", organizationId: org.id });
  const expert1 = store.createActor({ canonicalKey: "actor:expert-1", displayName: "Especialista 1", actorType: "expert" });
  const expert2 = store.createActor({ canonicalKey: "actor:expert-2", displayName: "Especialista 2", actorType: "expert" });
  const adjudicator = store.createActor({ canonicalKey: "actor:adjudicator", displayName: "Adjudicador", actorType: "expert" });
  for (const expert of [expert1, expert2, adjudicator]) store.qualifyExpert({ actorId: expert.id, authorizedCategories: ["camisa"], conflictPolicyAccepted: true, yearsExperience: 8 });
  const product = store.createProduct({ organizationId: org.id, canonicalKey: "product:shirt", productFamilyKey: "family:shirt", category: "camisa", name: "Camisa" });
  const sample = store.registerSample({ productId: product.id, canonicalKey: "sample:001", lineageGroupKey: "lineage:001", collectionStatus: "accepted", collectedBy: operator.id });
  for (let i = 0; i < 4; i += 1) store.addEvidence({ sampleId: sample.id, evidenceType: i ? "image" : "supplier_document", sha256: sha256(`evidence-${i}`), authenticityStatus: "verified", capturedBy: operator.id });
  for (let i = 0; i < 5; i += 1) store.addMeasurement({ sampleId: sample.id, metricCode: `metric_${i}`, numericValue: i + 1, unit: "unit", sourceType: "manual_measured", epistemicStatus: "measured", recordedBy: operator.id, idempotencyKey: `measurement-${i}`, qualityStatus: "accepted", qualityScore: 100 });
  const prediction = store.registerPrediction({
    sampleId: sample.id,
    predictionKey: "prediction:001",
    methodologyVersion: "0.2.0",
    benchmarkVersion: "2026-07",
    modelVersion: "pi5-rules-0.2.0",
    inputSnapshot: { carbonKg: 3.2, waterL: 2100, wastePct: 10 },
    resultSnapshot: { score: 3.25, coverage: 90, confidence: 85, publicationStatus: "contextualized" },
    coverage: 90,
    confidence: 85,
  });
  const session = store.openLabelingSession({ sampleId: sample.id, predictionId: prediction.id, createdBy: system.id });
  const assignment1 = store.assignReviewer({ labelingSessionId: session.id, expertActorId: expert1.id, assignedBy: system.id });
  const assignment2 = store.assignReviewer({ labelingSessionId: session.id, expertActorId: expert2.id, assignedBy: system.id });
  store.submitLabel({ assignmentId: assignment1.id, globalScore: 3.3, dimensionScores: dimensions, categoryLabel: "camisa", evidenceQualityScore: 92, reviewerConfidence: 88, reviewDecision: "accept" });
  store.submitLabel({ assignmentId: assignment2.id, globalScore: disagreement ? 4.4 : 3.4, dimensionScores: disagreement ? { ...dimensions, water: 4.5 } : { ...dimensions, water: 3.4 }, categoryLabel: "camisa", evidenceQualityScore: 90, reviewerConfidence: 86, reviewDecision: "accept" });
  return { store, org, system, operator, expert1, expert2, adjudicator, product, sample, prediction, session, assignment1, assignment2 };
}

test("pacote cego não expõe predição nem rótulos de outros revisores", () => {
  const { store, session } = setup();
  const packet = store.getBlindReviewPacket(session.id);
  assert.equal(packet.prediction, undefined);
  assert.equal(packet.labels, undefined);
  assert.equal(packet.product.category, "camisa");
  assert.equal(packet.evidence.length, 4);
});

test("medição idempotente rejeita conteúdo divergente", () => {
  const { store, sample, operator } = setup();
  const first = store.addMeasurement({ sampleId: sample.id, metricCode: "mass", numericValue: 100, unit: "g", sourceType: "manual_measured", epistemicStatus: "measured", recordedBy: operator.id, idempotencyKey: "same", qualityStatus: "accepted", qualityScore: 90 });
  const repeated = store.addMeasurement({ sampleId: sample.id, metricCode: "mass", numericValue: 100, unit: "g", sourceType: "manual_measured", epistemicStatus: "measured", recordedBy: operator.id, idempotencyKey: "same", qualityStatus: "accepted", qualityScore: 90 });
  assert.equal(first.id, repeated.id);
  assert.throws(() => store.addMeasurement({ sampleId: sample.id, metricCode: "mass", numericValue: 999, unit: "g", sourceType: "manual_measured", epistemicStatus: "measured", recordedBy: operator.id, idempotencyKey: "same", qualityStatus: "accepted", qualityScore: 90 }), /Conflito de idempotência/);
});

test("duas revisões concordantes formam consenso", () => {
  const { store, session } = setup();
  const result = store.consensus(session.id);
  assert.equal(result.status, "consensus");
  assert.equal(result.reviewerCount, 2);
});

test("discordância relevante exige adjudicação", () => {
  const { store, session } = setup({ disagreement: true });
  const result = store.consensus(session.id);
  assert.equal(result.status, "adjudication_required");
});

test("rótulo ouro só congela com confiabilidade suficiente", () => {
  const { store, session, system } = setup();
  const reliability = store.sampleReliability(session.sampleId);
  assert.ok(reliability.reliabilityScore >= 80);
  const gold = store.freezeGoldLabel({ labelingSessionId: session.id, frozenBy: system.id });
  assert.equal(gold.labelTier, "gold");
  assert.match(gold.labelHash, /^[a-f0-9]{64}$/);
});

test("adjudicação produz rótulo congelável após conflito", () => {
  const { store, session, system, adjudicator } = setup({ disagreement: true });
  store.adjudicate({ labelingSessionId: session.id, adjudicatorActorId: adjudicator.id, decision: "gold", finalGlobalScore: 3.5, finalDimensionScores: dimensions, finalCategoryLabel: "camisa", rationale: "Revisão das evidências e medições." });
  const gold = store.freezeGoldLabel({ labelingSessionId: session.id, frozenBy: system.id });
  assert.equal(gold.globalScore, 3.5);
  assert.ok(gold.adjudicationId);
});

test("exportação elegível preserva linhagem e hashes", () => {
  const { store, session, system } = setup();
  store.freezeGoldLabel({ labelingSessionId: session.id, frozenBy: system.id });
  const rows = store.exportEligibleRecords();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].lineageGroupKey, "lineage:001");
  assert.match(rows[0].recordHash, /^[a-f0-9]{64}$/);
  assert.equal(rows[0].quality.reviewerCount, 2);
});

test("estado operacional possui hash reprodutível da cadeia de eventos", () => {
  const { store } = setup();
  const status = store.status();
  assert.match(status.stateHash, /^[a-f0-9]{64}$/);
  assert.ok(status.events > 0);
});
