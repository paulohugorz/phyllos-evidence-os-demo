import { randomUUID } from "node:crypto";
import { DIMENSIONS, reviewerConsensus, sha256, stableStringify } from "./pi5-training-data.js";

const clone = (value) => structuredClone(value);
const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}:${randomUUID()}`;

function requireFields(input, fields) {
  for (const field of fields) {
    if (input?.[field] === undefined || input?.[field] === null || input?.[field] === "") {
      throw new Error(`${field} é obrigatório`);
    }
  }
}

function assertHash(value, field) {
  if (!/^[a-f0-9]{64}$/.test(String(value || ""))) throw new Error(`${field} deve ser SHA-256 hexadecimal`);
}

function validateDimensions(scores = {}) {
  for (const dimension of DIMENSIONS) {
    const value = Number(scores[dimension]);
    if (!Number.isFinite(value) || value < 0 || value > 5) throw new Error(`${dimension} deve estar entre 0 e 5`);
  }
}

function mean(values) {
  return values.reduce((sum, value) => sum + Number(value), 0) / values.length;
}

export class PI5TrainingOperations {
  constructor({ protocolVersion = "pi5-labeling-1.0", protocolHash = sha256("pi5-labeling-1.0") } = {}) {
    this.protocolVersion = protocolVersion;
    this.protocolHash = protocolHash;
    this.organizations = new Map();
    this.actors = new Map();
    this.experts = new Map();
    this.products = new Map();
    this.samples = new Map();
    this.evidence = new Map();
    this.measurements = new Map();
    this.predictions = new Map();
    this.sessions = new Map();
    this.assignments = new Map();
    this.labels = new Map();
    this.adjudications = new Map();
    this.gold = new Map();
    this.quarantine = new Map();
    this.events = [];
  }

  appendEvent(eventType, payload) {
    const event = { id: id("training-event"), eventType, occurredAt: now(), payload: clone(payload) };
    event.eventHash = sha256(event);
    this.events.push(Object.freeze(event));
    return clone(event);
  }

  createOrganization(input = {}) {
    requireFields(input, ["canonicalKey", "name", "organizationType"]);
    const duplicate = [...this.organizations.values()].find((item) => item.canonicalKey === input.canonicalKey);
    if (duplicate) return clone(duplicate);
    const organization = Object.freeze({ id: input.id || id("org"), ...input, createdAt: now() });
    this.organizations.set(organization.id, organization);
    this.appendEvent("organization_created", organization);
    return clone(organization);
  }

  createActor(input = {}) {
    requireFields(input, ["canonicalKey", "displayName", "actorType"]);
    const actor = Object.freeze({ id: input.id || id("actor"), active: input.active ?? true, ...input, createdAt: now() });
    this.actors.set(actor.id, actor);
    this.appendEvent("actor_created", actor);
    return clone(actor);
  }

  qualifyExpert(input = {}) {
    requireFields(input, ["actorId", "authorizedCategories"]);
    const actor = this.actors.get(input.actorId);
    if (!actor || actor.actorType !== "expert") throw new Error("Ator especialista não encontrado");
    const profile = Object.freeze({
      actorId: input.actorId,
      specialties: input.specialties || [],
      authorizedCategories: input.authorizedCategories,
      credentialSummary: input.credentialSummary || null,
      yearsExperience: Number(input.yearsExperience || 0),
      conflictPolicyAccepted: Boolean(input.conflictPolicyAccepted),
      qualificationStatus: input.qualificationStatus || "qualified",
      qualifiedAt: now(),
    });
    if (!profile.conflictPolicyAccepted) throw new Error("Política de conflito de interesse precisa ser aceita");
    this.experts.set(profile.actorId, profile);
    this.appendEvent("expert_qualified", profile);
    return clone(profile);
  }

  createProduct(input = {}) {
    requireFields(input, ["organizationId", "canonicalKey", "productFamilyKey", "category"]);
    if (!this.organizations.has(input.organizationId)) throw new Error("Organização não encontrada");
    const product = Object.freeze({ id: input.id || id("product"), ...input, createdAt: now() });
    this.products.set(product.id, product);
    this.appendEvent("product_created", product);
    return clone(product);
  }

  registerSample(input = {}) {
    requireFields(input, ["productId", "canonicalKey", "lineageGroupKey"]);
    if (!this.products.has(input.productId)) throw new Error("Produto não encontrado");
    const sample = Object.freeze({
      id: input.id || id("sample"),
      sampleKind: input.sampleKind || "physical_piece",
      collectionStatus: input.collectionStatus || "registered",
      synthetic: Boolean(input.synthetic),
      ...input,
      createdAt: now(),
    });
    this.samples.set(sample.id, sample);
    this.appendEvent("sample_registered", sample);
    return clone(sample);
  }

  addEvidence(input = {}) {
    requireFields(input, ["sampleId", "evidenceType", "sha256"]);
    if (!this.samples.has(input.sampleId)) throw new Error("Amostra não encontrada");
    assertHash(input.sha256, "sha256");
    const duplicate = [...this.evidence.values()].find((item) => item.sampleId === input.sampleId && item.sha256 === input.sha256);
    if (duplicate) return clone(duplicate);
    const evidence = Object.freeze({
      id: input.id || id("evidence"),
      authenticityStatus: input.authenticityStatus || "unreviewed",
      consentStatus: input.consentStatus || "not_required",
      ...input,
      createdAt: now(),
    });
    this.evidence.set(evidence.id, evidence);
    this.appendEvent("evidence_added", evidence);
    return clone(evidence);
  }

  addMeasurement(input = {}) {
    requireFields(input, ["sampleId", "metricCode", "sourceType", "epistemicStatus", "recordedBy", "idempotencyKey"]);
    if (!this.samples.has(input.sampleId)) throw new Error("Amostra não encontrada");
    if (input.numericValue === undefined && !input.textValue) throw new Error("numericValue ou textValue é obrigatório");
    const existing = [...this.measurements.values()].find((item) => item.idempotencyKey === input.idempotencyKey);
    const payloadHash = sha256(input);
    if (existing) {
      if (existing.payloadHash !== payloadHash) throw new Error("Conflito de idempotência na medição");
      return clone(existing);
    }
    const measurement = Object.freeze({
      id: input.id || id("measurement"),
      observedAt: input.observedAt || now(),
      qualityStatus: input.qualityStatus || "pending",
      qualityScore: Number(input.qualityScore ?? 0),
      payloadHash,
      ...input,
      createdAt: now(),
    });
    this.measurements.set(measurement.id, measurement);
    this.appendEvent("measurement_added", measurement);
    return clone(measurement);
  }

  registerPrediction(input = {}) {
    requireFields(input, ["sampleId", "predictionKey", "methodologyVersion", "benchmarkVersion", "modelVersion", "inputSnapshot", "resultSnapshot"]);
    if (!this.samples.has(input.sampleId)) throw new Error("Amostra não encontrada");
    const prediction = Object.freeze({
      id: input.id || id("prediction"),
      coverage: Number(input.coverage ?? input.resultSnapshot?.coverage ?? 0),
      confidence: Number(input.confidence ?? input.resultSnapshot?.confidence ?? 0),
      publicationStatus: input.publicationStatus || input.resultSnapshot?.publicationStatus || "experimental",
      inputHash: input.inputHash || sha256(input.inputSnapshot),
      resultHash: input.resultHash || sha256(input.resultSnapshot),
      methodologyHash: input.methodologyHash || sha256(input.methodologyVersion),
      benchmarkHash: input.benchmarkHash || sha256(input.benchmarkVersion),
      modelHash: input.modelHash || sha256(input.modelVersion),
      calculatedAt: input.calculatedAt || now(),
      ...input,
      createdAt: now(),
    });
    this.predictions.set(prediction.id, prediction);
    this.appendEvent("prediction_registered", prediction);
    return clone(prediction);
  }

  openLabelingSession(input = {}) {
    requireFields(input, ["sampleId", "predictionId", "createdBy"]);
    if (!this.samples.has(input.sampleId)) throw new Error("Amostra não encontrada");
    if (!this.predictions.has(input.predictionId)) throw new Error("Predição não encontrada");
    const session = Object.freeze({
      id: input.id || id("labeling-session"),
      protocolVersion: input.protocolVersion || this.protocolVersion,
      protocolHash: input.protocolHash || this.protocolHash,
      blindReview: input.blindReview ?? true,
      requiredReviewers: Number(input.requiredReviewers || 2),
      sessionStatus: "open",
      openedAt: now(),
      ...input,
    });
    this.sessions.set(session.id, session);
    this.appendEvent("labeling_session_opened", session);
    return clone(session);
  }

  assignReviewer(input = {}) {
    requireFields(input, ["labelingSessionId", "expertActorId", "assignedBy"]);
    const session = this.sessions.get(input.labelingSessionId);
    const expert = this.experts.get(input.expertActorId);
    if (!session) throw new Error("Sessão de rotulagem não encontrada");
    if (!expert || expert.qualificationStatus !== "qualified") throw new Error("Especialista não qualificado");
    const product = this.products.get(this.samples.get(session.sampleId)?.productId);
    if (expert.authorizedCategories.length && !expert.authorizedCategories.includes(product.category)) {
      throw new Error("Especialista não autorizado para a categoria");
    }
    const already = [...this.assignments.values()].find((item) => item.labelingSessionId === input.labelingSessionId && item.expertActorId === input.expertActorId);
    if (already) return clone(already);
    const packet = this.getBlindReviewPacket(session.id, { includeAssignment: false });
    const assignment = Object.freeze({
      id: input.id || id("assignment"),
      labelingSessionId: input.labelingSessionId,
      expertActorId: input.expertActorId,
      assignedBy: input.assignedBy,
      assignedAt: now(),
      assignmentStatus: "assigned",
      blindPacketHash: sha256(packet),
      independenceStatus: input.independenceStatus || "verified",
      independenceReasons: input.independenceReasons || [],
    });
    if (assignment.independenceStatus === "blocked") throw new Error("Revisor bloqueado por conflito de interesse");
    this.assignments.set(assignment.id, assignment);
    this.appendEvent("reviewer_assigned", assignment);
    return clone(assignment);
  }

  getBlindReviewPacket(sessionId, { includeAssignment = true } = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Sessão de rotulagem não encontrada");
    const sample = this.samples.get(session.sampleId);
    const product = this.products.get(sample.productId);
    const packet = {
      sessionId: session.id,
      protocolVersion: session.protocolVersion,
      protocolHash: session.protocolHash,
      sample: {
        id: sample.id,
        canonicalKey: sample.canonicalKey,
        sampleKind: sample.sampleKind,
        collectionStatus: sample.collectionStatus,
      },
      product: { category: product.category, name: product.name || null },
      evidence: [...this.evidence.values()].filter((item) => item.sampleId === sample.id),
      measurements: [...this.measurements.values()].filter((item) => item.sampleId === sample.id),
      limitations: [],
    };
    if (includeAssignment) packet.assignmentCount = [...this.assignments.values()].filter((item) => item.labelingSessionId === session.id).length;
    return clone(packet);
  }

  submitLabel(input = {}) {
    requireFields(input, ["assignmentId", "globalScore", "dimensionScores", "evidenceQualityScore", "reviewerConfidence", "reviewDecision"]);
    validateDimensions(input.dimensionScores);
    const assignment = this.assignments.get(input.assignmentId);
    if (!assignment) throw new Error("Atribuição não encontrada");
    if (["declined", "expired", "revoked"].includes(assignment.assignmentStatus)) throw new Error("Atribuição não permite submissão");
    if (this.labels.has(input.assignmentId)) throw new Error("Atribuição já possui rótulo");
    const expectedPacketHash = sha256(this.getBlindReviewPacket(assignment.labelingSessionId, { includeAssignment: false }));
    if (assignment.blindPacketHash !== expectedPacketHash) throw new Error("Pacote cego foi alterado após atribuição");
    const label = Object.freeze({
      id: input.id || id("label"),
      assignmentId: assignment.id,
      labelingSessionId: assignment.labelingSessionId,
      expertActorId: assignment.expertActorId,
      categoryLabel: input.categoryLabel || null,
      globalScore: Number(input.globalScore),
      dimensionScores: clone(input.dimensionScores),
      evidenceQualityScore: Number(input.evidenceQualityScore),
      reviewerConfidence: Number(input.reviewerConfidence),
      reviewDecision: input.reviewDecision,
      notes: input.notes || null,
      protocolHash: this.sessions.get(assignment.labelingSessionId).protocolHash,
      blindPacketHash: assignment.blindPacketHash,
      submittedAt: now(),
    });
    if (label.globalScore < 0 || label.globalScore > 5) throw new Error("globalScore deve estar entre 0 e 5");
    if (label.evidenceQualityScore < 0 || label.evidenceQualityScore > 100) throw new Error("evidenceQualityScore inválido");
    if (label.reviewerConfidence < 0 || label.reviewerConfidence > 100) throw new Error("reviewerConfidence inválido");
    const finalLabel = Object.freeze({ ...label, payloadHash: sha256(label) });
    this.labels.set(assignment.id, finalLabel);
    this.appendEvent("expert_label_submitted", finalLabel);
    return clone(finalLabel);
  }

  consensus(sessionId) {
    const labels = [...this.labels.values()].filter((label) => label.labelingSessionId === sessionId);
    return reviewerConsensus(labels);
  }

  adjudicate(input = {}) {
    requireFields(input, ["labelingSessionId", "adjudicatorActorId", "decision", "rationale"]);
    const session = this.sessions.get(input.labelingSessionId);
    if (!session) throw new Error("Sessão não encontrada");
    const consensus = this.consensus(session.id);
    if (consensus.status !== "adjudication_required" && !input.force) throw new Error("Adjudicação não é necessária");
    if (!["gold", "silver", "exclude", "collect_more_evidence"].includes(input.decision)) throw new Error("Decisão de adjudicação inválida");
    if (["gold", "silver"].includes(input.decision)) {
      validateDimensions(input.finalDimensionScores);
      if (!(Number(input.finalGlobalScore) >= 0 && Number(input.finalGlobalScore) <= 5)) throw new Error("finalGlobalScore inválido");
    }
    const adjudication = Object.freeze({
      id: input.id || id("adjudication"),
      labelingSessionId: session.id,
      adjudicatorActorId: input.adjudicatorActorId,
      finalGlobalScore: input.finalGlobalScore === undefined ? null : Number(input.finalGlobalScore),
      finalDimensionScores: clone(input.finalDimensionScores || {}),
      finalCategoryLabel: input.finalCategoryLabel || null,
      decision: input.decision,
      rationale: input.rationale,
      decidedAt: now(),
    });
    const finalAdjudication = Object.freeze({ ...adjudication, payloadHash: sha256(adjudication) });
    this.adjudications.set(session.id, finalAdjudication);
    this.appendEvent("label_adjudicated", finalAdjudication);
    return clone(finalAdjudication);
  }

  sampleReliability(sampleId) {
    const sample = this.samples.get(sampleId);
    if (!sample) throw new Error("Amostra não encontrada");
    const evidence = [...this.evidence.values()].filter((item) => item.sampleId === sampleId);
    const measurements = [...this.measurements.values()].filter((item) => item.sampleId === sampleId);
    const verifiedEvidence = evidence.filter((item) => item.authenticityStatus === "verified").length;
    const conflictingEvidence = evidence.filter((item) => ["conflicting", "rejected"].includes(item.authenticityStatus)).length;
    const strongMeasurements = measurements.filter((item) => ["measured", "independently_verified"].includes(item.epistemicStatus)).length;
    const blockedMeasurements = measurements.filter((item) => ["blocked", "rejected"].includes(item.qualityStatus) || ["conflicting", "rejected"].includes(item.epistemicStatus)).length;
    const meanMeasurementQuality = measurements.length ? mean(measurements.map((item) => item.qualityScore || 0)) : 0;
    const openQuarantine = [...this.quarantine.values()].filter((item) => item.entityType === "sample" && item.entityId === sampleId && ["open", "collect_more_evidence"].includes(item.resolutionStatus)).length;
    const score = Math.max(0, Math.min(100,
      (sample.synthetic ? 0 : 15) + Math.min(25, verifiedEvidence * 8) + Math.min(25, strongMeasurements * 5) + Math.min(25, meanMeasurementQuality * 0.25)
      - conflictingEvidence * 15 - blockedMeasurements * 15 - openQuarantine * 20
    ));
    return {
      sampleId,
      reliabilityScore: Number(score.toFixed(2)),
      evidenceCount: evidence.length,
      verifiedEvidence,
      conflictingEvidence,
      measurementCount: measurements.length,
      strongMeasurements,
      blockedMeasurements,
      meanMeasurementQuality: Number(meanMeasurementQuality.toFixed(2)),
      openQuarantine,
    };
  }

  freezeGoldLabel(input = {}) {
    requireFields(input, ["labelingSessionId", "frozenBy"]);
    const session = this.sessions.get(input.labelingSessionId);
    if (!session) throw new Error("Sessão não encontrada");
    if (this.gold.has(session.id)) return clone(this.gold.get(session.id));
    const labels = [...this.labels.values()].filter((label) => label.labelingSessionId === session.id);
    const consensus = reviewerConsensus(labels);
    const adjudication = this.adjudications.get(session.id);
    let labelTier;
    let categoryLabel;
    let globalScore;
    let dimensionScores;
    if (adjudication) {
      if (!["gold", "silver"].includes(adjudication.decision)) throw new Error("Adjudicação não autoriza congelamento");
      labelTier = adjudication.decision;
      categoryLabel = adjudication.finalCategoryLabel;
      globalScore = adjudication.finalGlobalScore;
      dimensionScores = adjudication.finalDimensionScores;
    } else {
      if (consensus.status !== "consensus") throw new Error("Consenso ou adjudicação é obrigatório");
      labelTier = "gold";
      categoryLabel = consensus.categoryLabel;
      globalScore = consensus.globalScore;
      dimensionScores = consensus.dimensionScores;
    }
    const minimumEvidenceQuality = Math.min(...labels.map((label) => label.evidenceQualityScore));
    const minimumReviewerConfidence = Math.min(...labels.map((label) => label.reviewerConfidence));
    if (minimumEvidenceQuality < 80) throw new Error("Qualidade de evidência insuficiente para dado ouro");
    if (minimumReviewerConfidence < 70) throw new Error("Confiança dos revisores insuficiente para dado ouro");
    const reliability = this.sampleReliability(session.sampleId);
    if (reliability.reliabilityScore < 80) throw new Error("Confiabilidade da amostra abaixo de 80");
    const snapshot = {
      labelingSessionId: session.id,
      sampleId: session.sampleId,
      predictionId: session.predictionId,
      labelTier,
      categoryLabel,
      globalScore,
      dimensionScores,
      reviewerActorIds: labels.map((label) => label.expertActorId).sort(),
      adjudicationId: adjudication?.id || null,
      evidenceQualityScore: minimumEvidenceQuality,
      reviewerConfidence: minimumReviewerConfidence,
      protocolVersion: session.protocolVersion,
      protocolHash: session.protocolHash,
      reliability,
      labelPayloadHashes: labels.map((label) => label.payloadHash).sort(),
    };
    const gold = Object.freeze({
      id: input.id || id("gold-label"),
      ...snapshot,
      labelSnapshot: clone(snapshot),
      labelHash: sha256(snapshot),
      frozenBy: input.frozenBy,
      frozenAt: now(),
    });
    this.gold.set(session.id, gold);
    this.appendEvent("gold_label_frozen", gold);
    return clone(gold);
  }

  exportEligibleRecords() {
    const records = [];
    for (const gold of this.gold.values()) {
      if (gold.labelTier !== "gold") continue;
      const sample = this.samples.get(gold.sampleId);
      const product = this.products.get(sample.productId);
      const prediction = this.predictions.get(gold.predictionId);
      const assetHashes = [...this.evidence.values()].filter((item) => item.sampleId === sample.id).map((item) => item.sha256).sort();
      const record = {
        recordId: `record:${gold.id}`,
        sampleId: sample.id,
        lineageGroupKey: sample.lineageGroupKey,
        category: product.category,
        features: clone(prediction.inputSnapshot),
        target: {
          globalScore: gold.globalScore,
          dimensionScores: clone(gold.dimensionScores),
          tier: gold.labelTier,
        },
        quality: {
          coverage: prediction.coverage,
          confidence: prediction.confidence,
          evidenceQuality: gold.evidenceQualityScore,
          reviewerCount: gold.reviewerActorIds.length,
          adjudicated: Boolean(gold.adjudicationId),
          reliabilityScore: gold.reliability.reliabilityScore,
        },
        provenance: {
          methodologyVersion: prediction.methodologyVersion,
          benchmarkVersion: prediction.benchmarkVersion,
          modelVersion: prediction.modelVersion,
          inputHash: prediction.inputHash,
          labelHash: gold.labelHash,
          protocolVersion: gold.protocolVersion,
          protocolHash: gold.protocolHash,
        },
        assetHashes,
      };
      record.recordHash = sha256(record);
      records.push(record);
    }
    return records.sort((a, b) => a.recordId.localeCompare(b.recordId));
  }

  status() {
    return {
      organizations: this.organizations.size,
      actors: this.actors.size,
      experts: this.experts.size,
      products: this.products.size,
      samples: this.samples.size,
      evidence: this.evidence.size,
      measurements: this.measurements.size,
      predictions: this.predictions.size,
      labelingSessions: this.sessions.size,
      assignments: this.assignments.size,
      labels: this.labels.size,
      adjudications: this.adjudications.size,
      goldLabels: this.gold.size,
      eligibleRecords: this.exportEligibleRecords().length,
      events: this.events.length,
      stateHash: sha256(stableStringify(this.events.map((event) => event.eventHash))),
    };
  }
}
