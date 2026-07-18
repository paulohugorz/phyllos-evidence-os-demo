import { createHash } from "node:crypto";

export const DIMENSIONS = ["climate", "water", "chemicals", "materials", "wasteCircularity", "durability"];

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  const content = typeof value === "string" ? value : stableStringify(value);
  return createHash("sha256").update(content).digest("hex");
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

export function evidenceQuality(record = {}) {
  const q = record.quality || {};
  const provenance = record.provenance || {};
  let score = 0;
  score += clamp(q.coverage ?? 0, 0, 100) * 0.30;
  score += clamp(q.confidence ?? 0, 0, 100) * 0.25;
  score += clamp(q.evidenceQuality ?? 0, 0, 100) * 0.25;
  score += Math.min(100, Math.max(0, Number(q.reviewerCount || 0) * 35)) * 0.10;
  score += (provenance.inputHash && provenance.labelHash ? 100 : 0) * 0.10;
  return Number(score.toFixed(2));
}

export function validateTrainingRecord(record = {}) {
  const errors = [];
  const required = ["recordId", "sampleId", "lineageGroupKey", "category", "features", "target", "quality", "provenance"];
  for (const key of required) if (record[key] === undefined || record[key] === null || record[key] === "") errors.push(`missing:${key}`);
  if (record.target) {
    if (!(Number(record.target.globalScore) >= 0 && Number(record.target.globalScore) <= 5)) errors.push("target.globalScore:range");
    if (!["gold", "silver"].includes(record.target.tier)) errors.push("target.tier:invalid");
    for (const dimension of DIMENSIONS) {
      const value = record.target.dimensionScores?.[dimension];
      if (!(Number(value) >= 0 && Number(value) <= 5)) errors.push(`target.dimensionScores.${dimension}:range`);
    }
  }
  if (Number(record.quality?.coverage) < 80) errors.push("quality.coverage:below_80");
  if (Number(record.quality?.confidence) < 70) errors.push("quality.confidence:below_70");
  if (Number(record.quality?.evidenceQuality) < 80) errors.push("quality.evidenceQuality:below_80");
  if (Number(record.quality?.reviewerCount) < 2) errors.push("quality.reviewerCount:below_2");
  for (const key of ["inputHash", "labelHash"]) {
    if (!/^[a-f0-9]{64}$/.test(String(record.provenance?.[key] || ""))) errors.push(`provenance.${key}:invalid_hash`);
  }
  return { valid: errors.length === 0, errors, evidenceQualityScore: evidenceQuality(record) };
}

export function reviewerConsensus(labels = [], { maxGlobalRange = 0.5, maxDimensionRange = 0.75 } = {}) {
  if (labels.length < 2) return { status: "awaiting_second_review", reviewerCount: labels.length };
  const accepted = labels.every((label) => ["accept", "accept_with_warning"].includes(label.reviewDecision));
  if (!accepted) return { status: "adjudication_required", reason: "review_decision_conflict", reviewerCount: labels.length };
  const globalValues = labels.map((label) => Number(label.globalScore));
  const globalRange = Math.max(...globalValues) - Math.min(...globalValues);
  const dimensionRanges = Object.fromEntries(DIMENSIONS.map((dimension) => {
    const values = labels.map((label) => Number(label.dimensionScores?.[dimension]));
    return [dimension, Math.max(...values) - Math.min(...values)];
  }));
  const categories = new Set(labels.map((label) => label.categoryLabel).filter(Boolean));
  if (categories.size > 1) return { status: "adjudication_required", reason: "category_conflict", globalRange, dimensionRanges };
  if (globalRange > maxGlobalRange) return { status: "adjudication_required", reason: "global_score_disagreement", globalRange, dimensionRanges };
  if (Object.values(dimensionRanges).some((value) => value > maxDimensionRange)) return { status: "adjudication_required", reason: "dimension_disagreement", globalRange, dimensionRanges };
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    status: "consensus",
    reviewerCount: labels.length,
    globalScore: Number(mean(globalValues).toFixed(3)),
    dimensionScores: Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, Number(mean(labels.map((label) => Number(label.dimensionScores[dimension]))).toFixed(3))])),
    categoryLabel: [...categories][0] || null,
    globalRange: Number(globalRange.toFixed(3)),
    dimensionRanges,
  };
}

export function assignSplit(lineageGroupKey, salt, ratios = { train: 0.70, validation: 0.15, test: 0.15 }) {
  const total = ratios.train + ratios.validation + ratios.test;
  if (Math.abs(total - 1) > 1e-9) throw new Error("split ratios must sum to 1");
  const digest = sha256(`${salt}:${lineageGroupKey}`);
  const bucket = parseInt(digest.slice(0, 12), 16) / 0xffffffffffff;
  if (bucket < ratios.train) return "train";
  if (bucket < ratios.train + ratios.validation) return "validation";
  return "test";
}


export function assignGroupSplits(records = [], salt, ratios = { train: 0.70, validation: 0.15, test: 0.15 }) {
  const groups = new Map();
  for (const record of records) {
    const current = groups.get(record.lineageGroupKey) || { key: record.lineageGroupKey, categories: new Set(), records: [] };
    current.categories.add(record.category);
    current.records.push(record);
    groups.set(record.lineageGroupKey, current);
  }
  const conflicts = [...groups.values()].filter((group) => group.categories.size !== 1).map((group) => group.key);
  const assignment = new Map();
  const byCategory = new Map();
  for (const group of groups.values()) {
    if (group.categories.size !== 1) continue;
    const category = [...group.categories][0];
    const list = byCategory.get(category) || [];
    list.push(group);
    byCategory.set(category, list);
  }
  for (const list of byCategory.values()) {
    list.sort((a, b) => sha256(`${salt}:${a.key}`).localeCompare(sha256(`${salt}:${b.key}`)));
    const n = list.length;
    let validationCount = n >= 3 ? Math.max(1, Math.floor(n * ratios.validation)) : 0;
    let testCount = n >= 3 ? Math.max(1, Math.floor(n * ratios.test)) : 0;
    while (validationCount + testCount >= n && testCount > 0) testCount -= 1;
    while (validationCount + testCount >= n && validationCount > 0) validationCount -= 1;
    list.forEach((group, index) => {
      const split = index < testCount ? "test" : index < testCount + validationCount ? "validation" : "train";
      assignment.set(group.key, split);
    });
  }
  return { assignment, conflicts };
}

export function detectLeakage(records = []) {
  const issues = [];
  const sampleIds = new Map();
  const assetHashes = new Map();
  const groups = new Map();
  for (const record of records) {
    if (sampleIds.has(record.sampleId)) issues.push({ type: "duplicate_sample", sampleId: record.sampleId, records: [sampleIds.get(record.sampleId), record.recordId] });
    else sampleIds.set(record.sampleId, record.recordId);
    for (const hash of record.assetHashes || []) {
      if (assetHashes.has(hash)) issues.push({ type: "duplicate_asset", hash, records: [assetHashes.get(hash), record.recordId] });
      else assetHashes.set(hash, record.recordId);
    }
    const prior = groups.get(record.lineageGroupKey);
    if (prior && prior !== record.split) issues.push({ type: "lineage_split_leakage", lineageGroupKey: record.lineageGroupKey, splits: [prior, record.split] });
    else if (record.split) groups.set(record.lineageGroupKey, record.split);
  }
  return issues;
}

export function buildDataset(records = [], { datasetName = "phyllos-pi5-gold", version = "1.0.0", protocolVersion = "pi5-labeling-1.0", salt = "replace-me" } = {}) {
  const accepted = [];
  const quarantine = [];
  for (const input of records) {
    const record = structuredClone(input);
    const validation = validateTrainingRecord(record);
    if (!validation.valid || record.target.tier !== "gold") {
      quarantine.push({ ...record, validation });
      continue;
    }
    accepted.push(record);
  }
  const { assignment, conflicts } = assignGroupSplits(accepted, salt);
  const conflictingRecords = accepted.filter((record) => conflicts.includes(record.lineageGroupKey));
  for (const record of conflictingRecords) quarantine.push({ ...record, validation: { valid: false, errors: ["lineage_group_category_conflict"] } });
  const assignable = accepted.filter((record) => !conflicts.includes(record.lineageGroupKey));
  for (const record of assignable) {
    record.split = assignment.get(record.lineageGroupKey);
    record.recordHash = sha256({ ...record, recordHash: undefined });
  }
  const leakage = detectLeakage(assignable);
  const blockedIds = new Set(leakage.flatMap((issue) => issue.records || []));
  const clean = assignable.filter((record) => !blockedIds.has(record.recordId));
  const leaked = assignable.filter((record) => blockedIds.has(record.recordId));
  quarantine.push(...leaked.map((record) => ({ ...record, validation: { valid: false, errors: ["leakage_or_duplicate"] } })));
  const splits = { train: [], validation: [], test: [] };
  for (const record of clean) splits[record.split].push(record);
  for (const split of Object.values(splits)) split.sort((a, b) => a.recordId.localeCompare(b.recordId));
  const contentHash = sha256(clean.map((record) => record.recordHash).sort());
  const manifest = {
    datasetName,
    version,
    createdAt: new Date().toISOString(),
    protocolVersion,
    recordCount: clean.length,
    splitCounts: Object.fromEntries(Object.entries(splits).map(([key, value]) => [key, value.length])),
    contentHash,
    qualitySummary: {
      quarantined: quarantine.length,
      leakageIssues: leakage.length,
      meanEvidenceQuality: clean.length ? Number((clean.reduce((sum, record) => sum + evidenceQuality(record), 0) / clean.length).toFixed(2)) : null,
      categories: Object.fromEntries([...new Set(clean.map((r) => r.category))].sort().map((category) => [category, clean.filter((r) => r.category === category).length])),
    },
    files: {},
    limitations: ["Dataset pequeno deve ser interpretado por categoria e qualidade de evidência, não apenas por métrica global."],
    recommendedUses: ["Calibração controlada do PI5", "Avaliação por categoria", "Análise de incerteza e abstenção"],
    prohibitedUses: ["Certificação ambiental automática", "Claims públicos sem revisão", "Treino com registros sintéticos ou sem consenso"],
  };
  return { splits, quarantine, leakage, manifest };
}
