import test from "node:test";
import assert from "node:assert/strict";
import { assignGroupSplits, assignSplit, buildDataset, detectLeakage, evidenceQuality, reviewerConsensus, sha256, validateTrainingRecord } from "../src/pi5-training-data.js";

const hash = (value) => sha256(String(value));
const dimensions = { climate: 3.1, water: 3.2, chemicals: 3.0, materials: 3.4, wasteCircularity: 3.5, durability: 3.8 };
function record(id, group = `group-${id}`) {
  return {
    recordId: `record-${id}`,
    sampleId: `sample-${id}`,
    lineageGroupKey: group,
    category: id % 2 ? "camisa" : "camiseta",
    features: { carbonKg: 3.2, waterL: 2100, wastePct: 10 },
    target: { globalScore: 3.3, dimensionScores: dimensions, tier: "gold" },
    quality: { coverage: 90, confidence: 85, evidenceQuality: 92, reviewerCount: 2, adjudicated: false },
    provenance: { methodologyVersion: "0.2", benchmarkVersion: "2026-07", modelVersion: "rules", inputHash: hash(`input-${id}`), labelHash: hash(`label-${id}`) },
    assetHashes: [hash(`asset-${id}`)],
  };
}

test("valida registro ouro completo", () => {
  const result = validateTrainingRecord(record(1));
  assert.equal(result.valid, true);
  assert.ok(result.evidenceQualityScore >= 80);
});

test("bloqueia baixa cobertura e revisão única", () => {
  const item = record(2); item.quality.coverage = 60; item.quality.reviewerCount = 1;
  const result = validateTrainingRecord(item);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("quality.coverage:below_80"));
  assert.ok(result.errors.includes("quality.reviewerCount:below_2"));
});

test("consenso exige concordância dentro das tolerâncias", () => {
  const labels = [
    { globalScore: 3.2, dimensionScores: dimensions, categoryLabel: "camisa", evidenceQualityScore: 90, reviewerConfidence: 85, reviewDecision: "accept" },
    { globalScore: 3.4, dimensionScores: { ...dimensions, water: 3.4 }, categoryLabel: "camisa", evidenceQualityScore: 92, reviewerConfidence: 82, reviewDecision: "accept_with_warning" },
  ];
  const result = reviewerConsensus(labels);
  assert.equal(result.status, "consensus");
  assert.equal(result.globalScore, 3.3);
});

test("divisão é determinística por grupo", () => {
  assert.equal(assignSplit("family-1", "secret"), assignSplit("family-1", "secret"));
});

test("detecta vazamento do mesmo grupo entre splits", () => {
  const a = { ...record(3, "same"), split: "train" };
  const b = { ...record(4, "same"), split: "test" };
  assert.ok(detectLeakage([a, b]).some((issue) => issue.type === "lineage_split_leakage"));
});

test("construtor separa registros inválidos em quarentena", () => {
  const rows = Array.from({ length: 30 }, (_, i) => { const category = (i + 10) % 2 ? "camisa" : "camiseta"; return record(i + 10, `${category}-family-${Math.floor(i / 2)}`); });
  const invalid = record(999); invalid.quality.evidenceQuality = 30;
  const result = buildDataset([...rows, invalid], { salt: "private-salt", version: "test" });
  assert.equal(result.manifest.recordCount, 30);
  assert.equal(result.quarantine.length, 1);
  assert.equal(Object.values(result.manifest.splitCounts).reduce((a, b) => a + b, 0), 30);
  assert.ok(result.manifest.splitCounts.validation > 0);
  assert.ok(result.manifest.splitCounts.test > 0);
});
