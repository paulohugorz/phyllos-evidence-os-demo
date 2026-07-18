import { createHash, randomUUID } from "node:crypto";

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, Number(value) || 0));
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const finite = (value) => Number.isFinite(Number(value));

export const PI5_SNAPSHOT_SCHEMA_VERSION = "pi5-snapshot-1.0.0";

export const SOURCE_RELIABILITY = Object.freeze({
  verified_measurement: 0.98,
  third_party_document: 0.92,
  primary_document: 0.88,
  direct_measurement: 0.85,
  supplier_document: 0.80,
  supplier_declaration: 0.65,
  user_input: 0.55,
  user_observation: 0.50,
  model_estimate: 0.35,
  benchmark_default: 0.25,
  methodological_default: 0.20,
  missing: 0,
});

export const FIELD_DEFINITIONS = Object.freeze({
  carbonKg: { dimension: "climate", aliases: ["carbonKg", "carbonPerUnit"], neutral: (benchmark) => benchmark.carbonKg, action: "Medir ou documentar as emissões por unidade" },
  waterL: { dimension: "water", aliases: ["waterL", "waterPerUnit"], neutral: (benchmark) => benchmark.waterL, action: "Confirmar o consumo de água por unidade" },
  chemicalControl: { dimension: "chemicals", aliases: ["chemicalControl"], neutral: () => 2.5, action: "Registrar controle químico, processo ou certificação aplicável" },
  materialCircularity: { dimension: "materials", aliases: ["materialCircularity"], neutral: () => 2.5, action: "Confirmar composição, origem e circularidade dos materiais" },
  wastePct: { dimension: "wasteCircularity", aliases: ["wastePct", "weightedWaste"], neutral: (benchmark) => benchmark.wastePct, action: "Medir a perda real de corte e resíduos do lote" },
  durabilityUses: { dimension: "durability", aliases: ["durabilityUses"], neutral: (benchmark) => benchmark.durabilityUses, action: "Registrar ensaio, histórico ou estimativa justificada de durabilidade" },
});

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function hashCanonical(value) {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

function firstDefined(input, aliases) {
  for (const alias of aliases) {
    const candidate = input?.[alias];
    if (candidate && typeof candidate === "object" && "value" in candidate) return { value: candidate.value, wrapped: candidate };
    if (candidate !== undefined && candidate !== null && candidate !== "") return { value: candidate, wrapped: null };
  }
  return { value: undefined, wrapped: null };
}

function provenanceFor(input, field, wrapped) {
  return {
    ...(input?.provenance?.[field] || {}),
    ...(wrapped?.provenance || {}),
  };
}

function normalizeConflict(conflict = {}, index = 0) {
  return {
    id: String(conflict.id || `conflict-${index + 1}`),
    field: conflict.field ? String(conflict.field) : null,
    level: ["critical", "warning", "info"].includes(conflict.level) ? conflict.level : "warning",
    code: String(conflict.code || "data_conflict"),
    message: String(conflict.message || "Dados conflitantes precisam de revisão"),
  };
}

function normalizeRecord({ field, value, supplied, defaultSource, meta, evaluatedAt }) {
  const sourceType = String(meta.sourceType || (supplied ? "user_input" : defaultSource));
  const epistemicStatus = String(meta.epistemicStatus || meta.status || (supplied ? "declared" : "estimated"));
  const evidenceIds = Array.isArray(meta.evidenceIds) ? meta.evidenceIds.map(String) : [];
  const derivedFrom = Array.isArray(meta.derivedFrom) ? meta.derivedFrom.map(String) : [];
  const conflicts = Array.isArray(meta.conflicts) ? meta.conflicts.map(normalizeConflict) : [];
  return {
    id: String(meta.id || `provenance:${field}:${hashCanonical({ field, value, sourceType, evaluatedAt }).slice(0, 16)}`),
    field,
    value,
    supplied,
    sourceType,
    epistemicStatus,
    capturedAt: meta.capturedAt || evaluatedAt,
    validUntil: meta.validUntil || null,
    actorId: meta.actorId ? String(meta.actorId) : null,
    deviceId: meta.deviceId ? String(meta.deviceId) : null,
    method: meta.method ? String(meta.method) : null,
    evidenceIds,
    derivedFrom,
    uncertaintyPct: finite(meta.uncertaintyPct) ? clamp(Number(meta.uncertaintyPct), 0, 100) : null,
    conflicts,
  };
}

export function evidenceQuality(record, evaluatedAt = new Date().toISOString()) {
  if (!record?.supplied && ["benchmark_default", "methodological_default", "missing"].includes(record?.sourceType)) {
    return SOURCE_RELIABILITY[record.sourceType] || 0;
  }
  let quality = SOURCE_RELIABILITY[record?.sourceType] ?? 0.40;
  if (record?.epistemicStatus === "verified") quality += 0.03;
  if (record?.epistemicStatus === "estimated") quality -= 0.15;
  if (record?.epistemicStatus === "rejected") return 0;
  if (record?.evidenceIds?.length) quality += 0.03;
  if (record?.actorId) quality += 0.02;
  if (record?.method) quality += 0.02;
  if (record?.derivedFrom?.length) quality *= 0.97;
  if (record?.validUntil && new Date(record.validUntil).getTime() < new Date(evaluatedAt).getTime()) quality *= 0.20;
  if (record?.uncertaintyPct !== null && record?.uncertaintyPct !== undefined) quality *= 1 - clamp(record.uncertaintyPct / 100, 0, 1) * 0.50;
  if (record?.conflicts?.some((conflict) => conflict.level === "critical")) quality *= 0.10;
  else if (record?.conflicts?.some((conflict) => conflict.level === "warning")) quality *= 0.70;
  return round(clamp(quality), 4);
}

export function preparePI5Input(input = {}, { benchmark, weights, evaluatedAt = new Date().toISOString() } = {}) {
  const safeBenchmark = benchmark || { carbonKg: 4, waterL: 2500, wastePct: 15, durabilityUses: 40 };
  const safeWeights = weights || { climate: 0.30, water: 0.20, chemicals: 0.15, materials: 0.15, wasteCircularity: 0.10, durability: 0.10 };
  const records = {};
  const values = {};
  const hasProvenance = Boolean(input.provenance || input.evidence || Object.values(input).some((value) => value && typeof value === "object" && "provenance" in value));

  for (const [field, definition] of Object.entries(FIELD_DEFINITIONS)) {
    const { value: raw, wrapped } = firstDefined(input, definition.aliases);
    const supplied = finite(raw);
    const value = supplied ? Number(raw) : Number(definition.neutral(safeBenchmark));
    const defaultSource = field === "chemicalControl" || field === "materialCircularity" ? "methodological_default" : "benchmark_default";
    const meta = provenanceFor(input, field, wrapped);
    records[field] = normalizeRecord({ field, value, supplied, defaultSource, meta, evaluatedAt });
    values[field] = value;
  }

  const globalConflicts = Array.isArray(input.conflicts) ? input.conflicts.map(normalizeConflict) : [];
  for (const conflict of globalConflicts) {
    if (conflict.field && records[conflict.field]) records[conflict.field].conflicts.push(conflict);
  }

  const dimensionQuality = {};
  let weightedCoverage = 0;
  let weightedQuality = 0;
  let suppliedWeight = 0;
  for (const [field, record] of Object.entries(records)) {
    const dimension = FIELD_DEFINITIONS[field].dimension;
    const weight = Number(safeWeights[dimension] || 0);
    const quality = evidenceQuality(record, evaluatedAt);
    dimensionQuality[dimension] = { field, quality, supplied: record.supplied, sourceType: record.sourceType };
    if (record.supplied) {
      weightedCoverage += weight;
      weightedQuality += weight * quality;
      suppliedWeight += weight;
    }
  }

  const computedCoverage = round(clamp(weightedCoverage, 0, 1) * 100, 1);
  const computedConfidence = suppliedWeight > 0 ? round(clamp(weightedQuality / suppliedWeight, 0, 1) * 100, 1) : 0;
  const reportedCoverage = finite(input.coverage) ? clamp(Number(input.coverage), 0, 100) : null;
  const reportedConfidence = finite(input.confidence) ? clamp(Number(input.confidence), 0, 100) : null;
  const qualityMode = hasProvenance ? "evidence-derived" : "legacy-reported";
  const coverage = qualityMode === "evidence-derived" ? computedCoverage : (reportedCoverage ?? computedCoverage);
  const confidence = qualityMode === "evidence-derived" ? computedConfidence : (reportedConfidence ?? computedConfidence);

  return {
    values,
    records,
    conflicts: [...globalConflicts, ...Object.values(records).flatMap((record) => record.conflicts)].filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index),
    dimensionQuality,
    coverage: round(coverage, 1),
    confidence: round(confidence, 1),
    computedCoverage,
    computedConfidence,
    reportedCoverage,
    reportedConfidence,
    qualityMode,
    evaluatedAt,
  };
}

function dimensionIntervals(dimensions, prepared, critical) {
  const intervals = {};
  for (const [dimension, score] of Object.entries(dimensions)) {
    const detail = prepared.dimensionQuality[dimension] || { quality: 0, supplied: false };
    const record = detail.field ? prepared.records[detail.field] : null;
    const declaredUncertainty = record?.uncertaintyPct ? record.uncertaintyPct / 100 : 0;
    const radius = clamp(0.10 + (1 - detail.quality) * 1.40 + declaredUncertainty * 0.80, 0.10, 2.25);
    intervals[dimension] = {
      score: round(score, 2),
      lower: round(clamp(score - radius, 0, 5), 2),
      upper: round(clamp(score + radius, 0, 5), 2),
      confidence: round(detail.quality * 100, 1),
      supplied: Boolean(detail.supplied),
      sourceType: detail.sourceType || "missing",
    };
  }
  if (critical) {
    for (const interval of Object.values(intervals)) interval.upper = Math.min(interval.upper, 5);
  }
  return intervals;
}

function globalInterval(intervals, weights, calibrationDelta = 0, critical = false) {
  let lower = 0;
  let upper = 0;
  for (const [dimension, weight] of Object.entries(weights)) {
    lower += Number(intervals[dimension]?.lower || 0) * Number(weight || 0);
    upper += Number(intervals[dimension]?.upper || 0) * Number(weight || 0);
  }
  lower = clamp(lower + calibrationDelta, 0, 5);
  upper = clamp(upper + calibrationDelta, 0, 5);
  if (critical) upper = Math.min(2.5, upper);
  return { lower: round(lower, 2), upper: round(Math.max(lower, upper), 2) };
}

export function decidePublication({ coverage, confidence, critical, conflicts = [], reviewed = false, methodologyApproved = true } = {}) {
  const reasons = [];
  const requiredActions = [];
  const criticalConflicts = conflicts.filter((conflict) => conflict.level === "critical");
  if (!methodologyApproved) {
    reasons.push("Versão metodológica não aprovada");
    requiredActions.push("Selecionar uma versão metodológica aprovada");
    return { state: "blocked", publishable: false, comparable: false, reasons, requiredActions };
  }
  if (criticalConflicts.length) {
    reasons.push("Existem conflitos críticos nos dados ou evidências");
    requiredActions.push("Resolver os conflitos críticos antes de recalcular");
    return { state: "blocked", publishable: false, comparable: false, reasons, requiredActions };
  }
  if (coverage < 60) {
    reasons.push(`Cobertura de ${round(coverage, 1)}% abaixo do mínimo de 60%`);
    requiredActions.push("Coletar os dados prioritários indicados pelo sistema");
    return { state: "insufficient_data", publishable: false, comparable: false, reasons, requiredActions };
  }
  if (reviewed && coverage >= 80 && confidence >= 70) {
    reasons.push("Resultado revisado profissionalmente com cobertura e confiança suficientes");
    return { state: "professionally_reviewed", publishable: true, comparable: true, reasons, requiredActions };
  }
  if (coverage < 80) {
    reasons.push("Cobertura suficiente apenas para estimativa experimental");
    requiredActions.push("Elevar a cobertura para ao menos 80%");
    return { state: "experimental", publishable: true, comparable: false, reasons, requiredActions };
  }
  if (confidence < 70) {
    reasons.push(`Confiança de ${round(confidence, 1)}% abaixo do mínimo contextualizado de 70%`);
    requiredActions.push("Substituir estimativas por medições ou documentos mais confiáveis");
    return { state: "estimated", publishable: true, comparable: false, reasons, requiredActions };
  }
  if (critical) reasons.push("Uma dimensão crítica limita o score global a 2,5");
  reasons.push("Cobertura e confiança suficientes para resultado contextualizado");
  return { state: "contextualized", publishable: true, comparable: true, reasons, requiredActions };
}

export function rankNextEvidence(prepared, weights, limit = 3) {
  return Object.entries(prepared.records)
    .map(([field, record]) => {
      const definition = FIELD_DEFINITIONS[field];
      const weight = Number(weights[definition.dimension] || 0);
      const quality = evidenceQuality(record, prepared.evaluatedAt);
      const priority = weight * (1 - quality) * (record.supplied ? 0.75 : 1);
      return {
        field,
        dimension: definition.dimension,
        action: definition.action,
        currentSource: record.sourceType,
        supplied: record.supplied,
        expectedConfidenceGain: round(priority * 100, 1),
        priority: round(priority, 4),
      };
    })
    .filter((item) => item.priority > 0.01)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, Math.max(1, Number(limit) || 3));
}

function snapshotPayload({ input, prepared, prediction, model, benchmark, weights, calculatedAt }) {
  const modelArtifact = {
    modelVersion: prediction.modelVersion,
    modelType: prediction.modelType,
    calibration: model.calibration || null,
  };
  const methodologyArtifact = {
    methodology: prediction.methodology,
    methodologyVersion: prediction.methodologyVersion,
    weights,
    criticalRule: "dimension_below_1_caps_global_at_2_5",
  };
  const benchmarkArtifact = {
    category: prediction.category,
    benchmarkVersion: model.benchmarkVersion || "pi5-benchmarks-0.1.0",
    values: benchmark,
  };
  return {
    schemaVersion: PI5_SNAPSHOT_SCHEMA_VERSION,
    predictionId: prediction.predictionId,
    entityId: input.entityId || input.productId || "unknown",
    calculatedAt,
    normalizedInput: prepared.values,
    provenance: prepared.records,
    conflicts: prepared.conflicts,
    methodology: { ...methodologyArtifact, artifactHash: hashCanonical(methodologyArtifact) },
    benchmark: { ...benchmarkArtifact, artifactHash: hashCanonical(benchmarkArtifact) },
    model: { ...modelArtifact, artifactHash: hashCanonical(modelArtifact) },
    prediction: {
      score: prediction.score,
      baseScore: prediction.baseScore,
      calibrationDelta: prediction.calibrationDelta,
      dimensions: prediction.dimensions,
      dimensionIntervals: prediction.dimensionIntervals,
      scoreInterval: prediction.scoreInterval,
      coverage: prediction.coverage,
      confidence: prediction.confidence,
      gate: prediction.gate,
      critical: prediction.critical,
      mlFeatures: prediction.mlFeatures,
    },
  };
}

export function buildSnapshot(args) {
  const payload = snapshotPayload(args);
  const snapshotHash = hashCanonical(payload);
  return {
    snapshotId: `pi5-snapshot:${snapshotHash}`,
    snapshotHash,
    ...payload,
  };
}

export function verifySnapshotIntegrity(snapshot = {}) {
  const { snapshotId, snapshotHash, ...payload } = snapshot;
  const calculatedHash = hashCanonical(payload);
  return {
    valid: Boolean(snapshotHash) && calculatedHash === snapshotHash && (!snapshotId || snapshotId === `pi5-snapshot:${snapshotHash}`),
    expectedHash: snapshotHash || null,
    calculatedHash,
  };
}

export function enrichPI5Prediction({ input, prepared, prediction, model, benchmark, weights, calculatedAt, createSnapshot = true }) {
  const calibrationDelta = round(prediction.score - prediction.baseScore, 4);
  const dimensionIntervalsResult = dimensionIntervals(prediction.dimensions, prepared, prediction.critical);
  const scoreInterval = globalInterval(dimensionIntervalsResult, weights, calibrationDelta, prediction.critical);
  const gate = decidePublication({
    coverage: prepared.coverage,
    confidence: prepared.confidence,
    critical: prediction.critical,
    conflicts: prepared.conflicts,
    reviewed: input.reviewStatus === "professionally_reviewed",
    methodologyApproved: model.status !== "rejected",
  });
  const nextBestEvidence = rankNextEvidence(prepared, weights);
  const enriched = {
    ...prediction,
    coverage: prepared.coverage,
    confidence: prepared.confidence,
    evidenceCoverage: prepared.computedCoverage,
    evidenceConfidence: prepared.computedConfidence,
    qualityMode: prepared.qualityMode,
    publicationStatus: gate.state,
    gate,
    dimensionIntervals: dimensionIntervalsResult,
    scoreInterval,
    provenance: prepared.records,
    conflicts: prepared.conflicts,
    nextBestEvidence,
    calibrationDelta,
  };
  if (createSnapshot) enriched.snapshot = buildSnapshot({ input, prepared, prediction: enriched, model, benchmark, weights, calculatedAt });
  return enriched;
}

export function compareReplay(expected = {}, actual = {}) {
  const fields = ["score", "baseScore", "calibrationDelta", "coverage", "confidence", "publicationStatus"];
  const differences = [];
  for (const field of fields) {
    if (JSON.stringify(expected[field]) !== JSON.stringify(actual[field])) differences.push({ field, expected: expected[field], actual: actual[field] });
  }
  if (hashCanonical(expected.dimensions || {}) !== hashCanonical(actual.dimensions || {})) differences.push({ field: "dimensions", expected: expected.dimensions, actual: actual.dimensions });
  if (hashCanonical(expected.scoreInterval || {}) !== hashCanonical(actual.scoreInterval || {})) differences.push({ field: "scoreInterval", expected: expected.scoreInterval, actual: actual.scoreInterval });
  return { matches: differences.length === 0, differences };
}
