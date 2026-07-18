import { randomUUID } from "node:crypto";
import { DIMENSIONS, sha256 } from "./pi5-training-data.js";

const uuid = () => randomUUID();
const now = () => new Date().toISOString();

function requireFields(input, fields) {
  for (const field of fields) {
    if (input?.[field] === undefined || input?.[field] === null || input?.[field] === "") throw new Error(`${field} é obrigatório`);
  }
}

function validateDimensions(scores = {}) {
  for (const dimension of DIMENSIONS) {
    const value = Number(scores[dimension]);
    if (!Number.isFinite(value) || value < 0 || value > 5) throw new Error(`${dimension} deve estar entre 0 e 5`);
  }
}

export class PI5TrainingPostgresStore {
  constructor({ connectionString = process.env.DATABASE_URL, sslMode = process.env.PGSSL || "auto" } = {}) {
    if (!connectionString) throw new Error("DATABASE_URL é obrigatória para a base de treinamento PI5");
    this.connectionString = connectionString;
    this.sslMode = sslMode;
    this.pool = null;
  }

  async init() {
    if (this.pool) return;
    const { Pool } = await import("pg");
    const ssl = this.sslMode === "require" ? { rejectUnauthorized: false } : this.sslMode === "disable" ? false : undefined;
    this.pool = new Pool({ connectionString: this.connectionString, ssl, max: 8, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
    await this.pool.query("SELECT 1");
  }

  async query(text, values = []) {
    await this.init();
    return this.pool.query(text, values);
  }

  async transaction(fn) {
    await this.init();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createOrganization(input = {}) {
    requireFields(input, ["canonicalKey", "name", "organizationType"]);
    const result = await this.query(`
      INSERT INTO pi5_organizations (canonical_key, name, organization_type, country_code)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (canonical_key) DO UPDATE SET name=EXCLUDED.name
      RETURNING *
    `, [input.canonicalKey, input.name, input.organizationType, input.countryCode || null]);
    return result.rows[0];
  }

  async createActor(input = {}) {
    requireFields(input, ["canonicalKey", "displayName", "actorType"]);
    const result = await this.query(`
      INSERT INTO pi5_actors (organization_id, canonical_key, display_name, actor_type, active)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (canonical_key) DO UPDATE SET display_name=EXCLUDED.display_name, active=EXCLUDED.active
      RETURNING *
    `, [input.organizationId || null, input.canonicalKey, input.displayName, input.actorType, input.active ?? true]);
    return result.rows[0];
  }

  async qualifyExpert(input = {}) {
    requireFields(input, ["actorId", "authorizedCategories"]);
    if (!input.conflictPolicyAccepted) throw new Error("Política de conflito de interesse precisa ser aceita");
    const result = await this.query(`
      INSERT INTO pi5_expert_profiles (
        actor_id, specialties, authorized_categories, credential_summary, years_experience,
        conflict_of_interest_policy_accepted_at, qualification_status, qualified_at, qualified_by
      ) VALUES ($1,$2,$3,$4,$5,NOW(),$6,NOW(),$7)
      ON CONFLICT (actor_id) DO UPDATE SET
        specialties=EXCLUDED.specialties,
        authorized_categories=EXCLUDED.authorized_categories,
        credential_summary=EXCLUDED.credential_summary,
        years_experience=EXCLUDED.years_experience,
        conflict_of_interest_policy_accepted_at=EXCLUDED.conflict_of_interest_policy_accepted_at,
        qualification_status=EXCLUDED.qualification_status,
        qualified_at=EXCLUDED.qualified_at,
        qualified_by=EXCLUDED.qualified_by
      RETURNING *
    `, [input.actorId, input.specialties || [], input.authorizedCategories, input.credentialSummary || null, Number(input.yearsExperience || 0), input.qualificationStatus || "qualified", input.qualifiedBy || null]);
    return result.rows[0];
  }

  async createProduct(input = {}) {
    requireFields(input, ["organizationId", "canonicalKey", "productFamilyKey", "category"]);
    const result = await this.query(`
      INSERT INTO pi5_products (organization_id, canonical_key, product_family_key, sku, category, name)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (organization_id, canonical_key) DO UPDATE SET
        product_family_key=EXCLUDED.product_family_key, sku=EXCLUDED.sku, category=EXCLUDED.category, name=EXCLUDED.name
      RETURNING *
    `, [input.organizationId, input.canonicalKey, input.productFamilyKey, input.sku || null, input.category, input.name || null]);
    return result.rows[0];
  }

  async registerSample(input = {}) {
    requireFields(input, ["productId", "canonicalKey", "lineageGroupKey"]);
    const result = await this.query(`
      INSERT INTO pi5_physical_samples (
        product_id, batch_id, canonical_key, lineage_group_key, sample_kind,
        collection_status, collected_at, collected_by, storage_location, synthetic
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (canonical_key) DO NOTHING
      RETURNING *
    `, [input.productId, input.batchId || null, input.canonicalKey, input.lineageGroupKey, input.sampleKind || "physical_piece", input.collectionStatus || "registered", input.collectedAt || null, input.collectedBy || null, input.storageLocation || null, Boolean(input.synthetic)]);
    if (result.rows[0]) return result.rows[0];
    return (await this.query("SELECT * FROM pi5_physical_samples WHERE canonical_key=$1", [input.canonicalKey])).rows[0];
  }

  async addEvidence(input = {}) {
    requireFields(input, ["sampleId", "evidenceType", "sha256"]);
    const result = await this.query(`
      INSERT INTO pi5_evidence_assets (
        sample_id, evidence_type, uri, sha256, mime_type, byte_size, captured_at, captured_by,
        source_organization_id, consent_status, retention_until, authenticity_status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (sha256, sample_id) DO NOTHING
      RETURNING *
    `, [input.sampleId, input.evidenceType, input.uri || null, input.sha256, input.mimeType || null, input.byteSize || null, input.capturedAt || null, input.capturedBy || null, input.sourceOrganizationId || null, input.consentStatus || "not_required", input.retentionUntil || null, input.authenticityStatus || "unreviewed"]);
    if (result.rows[0]) return result.rows[0];
    return (await this.query("SELECT * FROM pi5_evidence_assets WHERE sample_id=$1 AND sha256=$2", [input.sampleId, input.sha256])).rows[0];
  }

  async addMeasurement(input = {}) {
    requireFields(input, ["sampleId", "metricCode", "sourceType", "epistemicStatus", "recordedBy", "idempotencyKey"]);
    if (input.numericValue === undefined && !input.textValue) throw new Error("numericValue ou textValue é obrigatório");
    const payloadHash = sha256(input);
    const result = await this.query(`
      INSERT INTO pi5_measurements (
        sample_id, metric_code, numeric_value, text_value, unit, method_id, source_type,
        epistemic_status, uncertainty_lower, uncertainty_upper, uncertainty_stddev, observed_at,
        recorded_by, source_organization_id, device_actor_id, idempotency_key, payload_hash,
        supersedes_measurement_id, quality_status, quality_score
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING *
    `, [input.sampleId, input.metricCode, input.numericValue ?? null, input.textValue || null, input.unit || null, input.methodId || null, input.sourceType, input.epistemicStatus, input.uncertaintyLower ?? null, input.uncertaintyUpper ?? null, input.uncertaintyStddev ?? null, input.observedAt || now(), input.recordedBy, input.sourceOrganizationId || null, input.deviceActorId || null, input.idempotencyKey, payloadHash, input.supersedesMeasurementId || null, input.qualityStatus || "pending", input.qualityScore ?? null]);
    if (result.rows[0]) return result.rows[0];
    const existing = (await this.query("SELECT * FROM pi5_measurements WHERE idempotency_key=$1", [input.idempotencyKey])).rows[0];
    if (existing.payload_hash !== payloadHash) throw new Error("Conflito de idempotência na medição");
    return existing;
  }

  async registerPrediction(input = {}) {
    requireFields(input, ["sampleId", "predictionKey", "methodologyVersion", "benchmarkVersion", "modelVersion", "inputSnapshot", "resultSnapshot"]);
    const values = {
      inputHash: input.inputHash || sha256(input.inputSnapshot),
      methodologyHash: input.methodologyHash || sha256(input.methodologyVersion),
      benchmarkHash: input.benchmarkHash || sha256(input.benchmarkVersion),
      modelHash: input.modelHash || sha256(input.modelVersion),
      resultHash: input.resultHash || sha256(input.resultSnapshot),
    };
    const result = await this.query(`
      INSERT INTO pi5_predictions_v2 (
        sample_id, prediction_key, methodology_version, benchmark_version, model_version,
        input_snapshot, result_snapshot, input_hash, methodology_hash, benchmark_hash, model_hash,
        result_hash, coverage, confidence, publication_status, calculated_at
      ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT (prediction_key) DO NOTHING
      RETURNING *
    `, [input.sampleId, input.predictionKey, input.methodologyVersion, input.benchmarkVersion, input.modelVersion, JSON.stringify(input.inputSnapshot), JSON.stringify(input.resultSnapshot), values.inputHash, values.methodologyHash, values.benchmarkHash, values.modelHash, values.resultHash, Number(input.coverage ?? input.resultSnapshot.coverage ?? 0), Number(input.confidence ?? input.resultSnapshot.confidence ?? 0), input.publicationStatus || input.resultSnapshot.publicationStatus || "experimental", input.calculatedAt || now()]);
    if (result.rows[0]) return result.rows[0];
    return (await this.query("SELECT * FROM pi5_predictions_v2 WHERE prediction_key=$1", [input.predictionKey])).rows[0];
  }

  async openLabelingSession(input = {}) {
    requireFields(input, ["sampleId", "predictionId", "createdBy"]);
    const result = await this.query(`
      INSERT INTO pi5_labeling_sessions (
        sample_id, prediction_id, protocol_version, blind_review, required_reviewers, session_status, created_by
      ) VALUES ($1,$2,$3,$4,$5,'open',$6)
      RETURNING *
    `, [input.sampleId, input.predictionId, input.protocolVersion || "pi5-labeling-1.0", input.blindReview ?? true, Number(input.requiredReviewers || 2), input.createdBy]);
    return result.rows[0];
  }

  async getBlindReviewPacket(sessionId) {
    const sessionResult = await this.query(`
      SELECT ls.*, s.canonical_key, s.sample_kind, s.collection_status,
             p.category, p.name AS product_name
      FROM pi5_labeling_sessions ls
      JOIN pi5_physical_samples s ON s.id=ls.sample_id
      JOIN pi5_products p ON p.id=s.product_id
      WHERE ls.id=$1
    `, [sessionId]);
    const session = sessionResult.rows[0];
    if (!session) throw new Error("Sessão de rotulagem não encontrada");
    const evidence = (await this.query(`SELECT * FROM pi5_evidence_assets WHERE sample_id=$1 ORDER BY created_at`, [session.sample_id])).rows;
    const measurements = (await this.query(`SELECT * FROM pi5_measurements WHERE sample_id=$1 ORDER BY observed_at`, [session.sample_id])).rows;
    return {
      sessionId: session.id,
      protocolVersion: session.protocol_version,
      sample: { id: session.sample_id, canonicalKey: session.canonical_key, sampleKind: session.sample_kind, collectionStatus: session.collection_status },
      product: { category: session.category, name: session.product_name },
      evidence,
      measurements,
      limitations: [],
    };
  }

  async assignReviewer(input = {}) {
    requireFields(input, ["labelingSessionId", "expertActorId", "assignedBy"]);
    const context = (await this.query(`
      SELECT ls.id, ls.sample_id, p.id AS product_id, p.organization_id, p.category,
             ep.qualification_status, ep.authorized_categories
      FROM pi5_labeling_sessions ls
      JOIN pi5_physical_samples s ON s.id=ls.sample_id
      JOIN pi5_products p ON p.id=s.product_id
      LEFT JOIN pi5_expert_profiles ep ON ep.actor_id=$2
      WHERE ls.id=$1
    `, [input.labelingSessionId, input.expertActorId])).rows[0];
    if (!context) throw new Error("Sessão não encontrada");
    if (context.qualification_status !== "qualified") throw new Error("Especialista não qualificado");
    if (context.authorized_categories?.length && !context.authorized_categories.includes(context.category)) throw new Error("Especialista não autorizado para a categoria");
    const conflicts = (await this.query(`
      SELECT conflict_type FROM pi5_reviewer_conflicts
      WHERE expert_actor_id=$1 AND active=TRUE
        AND (sample_id=$2 OR product_id=$3 OR organization_id=$4)
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (ends_at IS NULL OR ends_at >= NOW())
    `, [input.expertActorId, context.sample_id, context.product_id, context.organization_id])).rows;
    const independenceStatus = conflicts.length ? "blocked" : "verified";
    if (independenceStatus === "blocked") throw new Error(`Revisor bloqueado por conflito: ${conflicts.map((row) => row.conflict_type).join(",")}`);
    const packet = await this.getBlindReviewPacket(input.labelingSessionId);
    const result = await this.query(`
      INSERT INTO pi5_label_assignments (
        labeling_session_id, expert_actor_id, assigned_by, due_at, assignment_status,
        blind_packet_hash, independence_status, independence_reasons
      ) VALUES ($1,$2,$3,$4,'assigned',$5,'verified','[]'::jsonb)
      ON CONFLICT (labeling_session_id, expert_actor_id) DO NOTHING
      RETURNING *
    `, [input.labelingSessionId, input.expertActorId, input.assignedBy, input.dueAt || null, sha256(packet)]);
    if (result.rows[0]) return result.rows[0];
    return (await this.query("SELECT * FROM pi5_label_assignments WHERE labeling_session_id=$1 AND expert_actor_id=$2", [input.labelingSessionId, input.expertActorId])).rows[0];
  }

  async submitLabel(input = {}) {
    requireFields(input, ["assignmentId", "globalScore", "dimensionScores", "evidenceQualityScore", "reviewerConfidence", "reviewDecision"]);
    validateDimensions(input.dimensionScores);
    return this.transaction(async (client) => {
      const assignment = (await client.query("SELECT * FROM pi5_label_assignments WHERE id=$1 FOR UPDATE", [input.assignmentId])).rows[0];
      if (!assignment) throw new Error("Atribuição não encontrada");
      const packet = await this.getBlindReviewPacket(assignment.labeling_session_id);
      if (assignment.blind_packet_hash !== sha256(packet)) throw new Error("Pacote cego foi alterado após atribuição");
      const label = {
        assignmentId: assignment.id,
        labelingSessionId: assignment.labeling_session_id,
        expertActorId: assignment.expert_actor_id,
        globalScore: Number(input.globalScore),
        dimensionScores: input.dimensionScores,
        categoryLabel: input.categoryLabel || null,
        evidenceQualityScore: Number(input.evidenceQualityScore),
        reviewerConfidence: Number(input.reviewerConfidence),
        reviewDecision: input.reviewDecision,
        notes: input.notes || null,
        blindPacketHash: assignment.blind_packet_hash,
        protocolHash: input.protocolHash || sha256("pi5-labeling-1.0"),
      };
      const result = await client.query(`
        INSERT INTO pi5_expert_labels (
          labeling_session_id, expert_actor_id, global_score, dimension_scores, category_label,
          evidence_quality_score, reviewer_confidence, review_decision, notes, payload_hash,
          assignment_id, protocol_hash, blind_packet_hash, label_version
        ) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING *
      `, [label.labelingSessionId, label.expertActorId, label.globalScore, JSON.stringify(label.dimensionScores), label.categoryLabel, label.evidenceQualityScore, label.reviewerConfidence, label.reviewDecision, label.notes, sha256(label), label.assignmentId, label.protocolHash, label.blindPacketHash, input.labelVersion || "1.0"]);
      await client.query("UPDATE pi5_label_assignments SET assignment_status='submitted', submitted_at=NOW() WHERE id=$1", [assignment.id]);
      return result.rows[0];
    });
  }

  async consensus(sessionId) {
    return (await this.query("SELECT * FROM pi5_label_consensus_v2 WHERE labeling_session_id=$1", [sessionId])).rows[0] || null;
  }

  async adjudicate(input = {}) {
    requireFields(input, ["labelingSessionId", "adjudicatorActorId", "decision", "rationale"]);
    if (["gold", "silver"].includes(input.decision)) validateDimensions(input.finalDimensionScores);
    const payload = { ...input, decidedAt: now() };
    const result = await this.query(`
      INSERT INTO pi5_adjudications (
        labeling_session_id, adjudicator_actor_id, final_global_score, final_dimension_scores,
        final_category_label, decision, rationale, payload_hash
      ) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8)
      RETURNING *
    `, [input.labelingSessionId, input.adjudicatorActorId, input.finalGlobalScore ?? null, JSON.stringify(input.finalDimensionScores || {}), input.finalCategoryLabel || null, input.decision, input.rationale, sha256(payload)]);
    return result.rows[0];
  }

  async sampleReliability(sampleId) {
    return (await this.query("SELECT * FROM pi5_sample_reliability WHERE sample_id=$1", [sampleId])).rows[0] || null;
  }

  async freezeGoldLabel(input = {}) {
    requireFields(input, ["labelingSessionId", "frozenBy"]);
    return this.transaction(async (client) => {
      const existing = (await client.query("SELECT * FROM pi5_gold_label_snapshots WHERE labeling_session_id=$1", [input.labelingSessionId])).rows[0];
      if (existing) return existing;
      const consensus = (await client.query("SELECT * FROM pi5_label_consensus_v2 WHERE labeling_session_id=$1", [input.labelingSessionId])).rows[0];
      if (!consensus) throw new Error("Consenso não encontrado");
      const session = (await client.query("SELECT * FROM pi5_labeling_sessions WHERE id=$1", [input.labelingSessionId])).rows[0];
      const reliability = (await client.query("SELECT * FROM pi5_sample_reliability WHERE sample_id=$1", [session.sample_id])).rows[0];
      if (!reliability || Number(reliability.reliability_score) < 80) throw new Error("Confiabilidade da amostra abaixo de 80");
      const labels = (await client.query("SELECT * FROM pi5_expert_labels WHERE labeling_session_id=$1 ORDER BY expert_actor_id", [input.labelingSessionId])).rows;
      let tier;
      let category;
      let globalScore;
      let dimensions;
      if (consensus.adjudication_decision) {
        if (!["gold", "silver"].includes(consensus.adjudication_decision)) throw new Error("Adjudicação não autoriza congelamento");
        tier = consensus.adjudication_decision;
        category = consensus.final_category_label;
        globalScore = Number(consensus.final_global_score);
        dimensions = consensus.final_dimension_scores;
      } else {
        if (consensus.consensus_status !== "gold_candidate") throw new Error("Sessão ainda não é candidata a ouro");
        tier = "gold";
        category = labels[0]?.category_label;
        globalScore = Number(consensus.mean_global_score);
        dimensions = Object.fromEntries(DIMENSIONS.map((key) => [key, Number((labels.reduce((sum, label) => sum + Number(label.dimension_scores[key]), 0) / labels.length).toFixed(3))]));
      }
      const snapshot = {
        labelingSessionId: session.id,
        sampleId: session.sample_id,
        predictionId: session.prediction_id,
        labelTier: tier,
        categoryLabel: category,
        globalScore,
        dimensionScores: dimensions,
        reviewerActorIds: labels.map((label) => label.expert_actor_id).sort(),
        adjudicationId: consensus.adjudication_id || null,
        evidenceQualityScore: Number(consensus.min_evidence_quality),
        reviewerConfidence: Number(consensus.min_reviewer_confidence),
        protocolVersion: session.protocol_version,
        protocolHash: input.protocolHash || labels[0]?.protocol_hash || sha256(session.protocol_version),
        reliabilityScore: Number(reliability.reliability_score),
        labelPayloadHashes: labels.map((label) => label.payload_hash).sort(),
      };
      const result = await client.query(`
        INSERT INTO pi5_gold_label_snapshots (
          labeling_session_id, sample_id, prediction_id, label_tier, category_label, global_score,
          dimension_scores, reviewer_actor_ids, adjudication_id, evidence_quality_score,
          reviewer_confidence, protocol_version, protocol_hash, label_snapshot, label_hash, frozen_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::uuid[],$9,$10,$11,$12,$13,$14::jsonb,$15,$16)
        RETURNING *
      `, [session.id, session.sample_id, session.prediction_id, tier, category, globalScore, JSON.stringify(dimensions), snapshot.reviewerActorIds, snapshot.adjudicationId, snapshot.evidenceQualityScore, snapshot.reviewerConfidence, session.protocol_version, snapshot.protocolHash, JSON.stringify(snapshot), sha256(snapshot), input.frozenBy]);
      return result.rows[0];
    });
  }

  async exportEligibleRecords() {
    const rows = (await this.query("SELECT * FROM pi5_training_eligible_samples_v2 ORDER BY sample_id")).rows;
    const records = [];
    for (const row of rows) {
      const assets = (await this.query("SELECT sha256 FROM pi5_evidence_assets WHERE sample_id=$1 ORDER BY sha256", [row.sample_id])).rows.map((item) => item.sha256.trim());
      const gold = (await this.query("SELECT reviewer_actor_ids, protocol_version, protocol_hash FROM pi5_gold_label_snapshots WHERE id=$1", [row.gold_label_id])).rows[0];
      const record = {
        recordId: `record:${row.gold_label_id}`,
        sampleId: row.sample_id,
        lineageGroupKey: row.lineage_group_key,
        category: row.category,
        features: row.input_snapshot,
        target: { globalScore: Number(row.target_global_score), dimensionScores: row.target_dimension_scores, tier: row.label_tier },
        quality: {
          coverage: Number(row.coverage),
          confidence: Number(row.confidence),
          evidenceQuality: Number(row.evidence_quality_score),
          reviewerCount: gold.reviewer_actor_ids.length,
          adjudicated: Boolean(row.adjudication_id),
          reliabilityScore: Number(row.reliability_score),
        },
        provenance: {
          methodologyVersion: row.methodology_version,
          benchmarkVersion: row.benchmark_version,
          modelVersion: row.model_version,
          inputHash: row.input_hash.trim(),
          labelHash: row.label_hash.trim(),
          protocolVersion: gold.protocol_version,
          protocolHash: gold.protocol_hash.trim(),
        },
        assetHashes: assets,
      };
      record.recordHash = sha256(record);
      records.push(record);
    }
    return records;
  }

  async status() {
    const result = await this.query(`
      SELECT
        (SELECT COUNT(*)::int FROM pi5_physical_samples) AS samples,
        (SELECT COUNT(*)::int FROM pi5_evidence_assets) AS evidence,
        (SELECT COUNT(*)::int FROM pi5_measurements) AS measurements,
        (SELECT COUNT(*)::int FROM pi5_labeling_sessions) AS labeling_sessions,
        (SELECT COUNT(*)::int FROM pi5_expert_labels) AS labels,
        (SELECT COUNT(*)::int FROM pi5_gold_label_snapshots) AS gold_labels,
        (SELECT COUNT(*)::int FROM pi5_training_eligible_samples_v2) AS eligible_records,
        (SELECT COUNT(*)::int FROM pi5_quarantine_items WHERE resolution_status IN ('open','collect_more_evidence')) AS open_quarantine
    `);
    return { mode: "postgresql", durable: true, ...result.rows[0], checkedAt: now() };
  }

  async close() {
    if (this.pool) await this.pool.end();
  }
}
