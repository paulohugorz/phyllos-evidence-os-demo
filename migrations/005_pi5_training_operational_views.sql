BEGIN;

CREATE OR REPLACE VIEW pi5_label_consensus_v2 AS
WITH label_rows AS (
  SELECT
    ls.id AS labeling_session_id,
    ls.sample_id,
    ls.prediction_id,
    ls.protocol_version,
    COUNT(el.id) AS reviewer_count,
    ARRAY_AGG(el.expert_actor_id ORDER BY el.expert_actor_id) FILTER (WHERE el.id IS NOT NULL) AS reviewer_actor_ids,
    AVG(el.global_score) AS mean_global_score,
    MAX(el.global_score) - MIN(el.global_score) AS global_score_range,
    MIN(el.evidence_quality_score) AS min_evidence_quality,
    MIN(el.reviewer_confidence) AS min_reviewer_confidence,
    BOOL_AND(el.review_decision IN ('accept','accept_with_warning')) AS all_reviewers_accept,
    COUNT(DISTINCT el.category_label) FILTER (WHERE el.category_label IS NOT NULL) AS category_count,
    MIN((el.dimension_scores->>'climate')::NUMERIC) AS climate_min,
    MAX((el.dimension_scores->>'climate')::NUMERIC) AS climate_max,
    MIN((el.dimension_scores->>'water')::NUMERIC) AS water_min,
    MAX((el.dimension_scores->>'water')::NUMERIC) AS water_max,
    MIN((el.dimension_scores->>'chemicals')::NUMERIC) AS chemicals_min,
    MAX((el.dimension_scores->>'chemicals')::NUMERIC) AS chemicals_max,
    MIN((el.dimension_scores->>'materials')::NUMERIC) AS materials_min,
    MAX((el.dimension_scores->>'materials')::NUMERIC) AS materials_max,
    MIN((el.dimension_scores->>'wasteCircularity')::NUMERIC) AS waste_min,
    MAX((el.dimension_scores->>'wasteCircularity')::NUMERIC) AS waste_max,
    MIN((el.dimension_scores->>'durability')::NUMERIC) AS durability_min,
    MAX((el.dimension_scores->>'durability')::NUMERIC) AS durability_max
  FROM pi5_labeling_sessions ls
  LEFT JOIN pi5_expert_labels el ON el.labeling_session_id = ls.id
  GROUP BY ls.id, ls.sample_id, ls.prediction_id, ls.protocol_version
), computed AS (
  SELECT
    lr.*,
    GREATEST(
      COALESCE(climate_max - climate_min, 0),
      COALESCE(water_max - water_min, 0),
      COALESCE(chemicals_max - chemicals_min, 0),
      COALESCE(materials_max - materials_min, 0),
      COALESCE(waste_max - waste_min, 0),
      COALESCE(durability_max - durability_min, 0)
    ) AS maximum_dimension_range
  FROM label_rows lr
)
SELECT
  c.*,
  CASE
    WHEN a.decision = 'gold' THEN 'gold'
    WHEN a.decision = 'silver' THEN 'silver'
    WHEN a.decision IN ('exclude','collect_more_evidence') THEN 'not_eligible'
    WHEN c.reviewer_count < 2 THEN 'awaiting_second_review'
    WHEN NOT COALESCE(c.all_reviewers_accept, FALSE) THEN 'adjudication_required'
    WHEN c.global_score_range > 0.50 THEN 'adjudication_required'
    WHEN c.maximum_dimension_range > 0.75 THEN 'adjudication_required'
    WHEN c.category_count > 1 THEN 'adjudication_required'
    WHEN c.min_evidence_quality < 80 THEN 'collect_more_evidence'
    WHEN c.min_reviewer_confidence < 70 THEN 'collect_more_evidence'
    ELSE 'gold_candidate'
  END AS consensus_status,
  a.id AS adjudication_id,
  a.final_global_score,
  a.final_dimension_scores,
  a.final_category_label,
  a.decision AS adjudication_decision
FROM computed c
LEFT JOIN pi5_adjudications a ON a.labeling_session_id = c.labeling_session_id;

CREATE OR REPLACE VIEW pi5_sample_reliability AS
WITH evidence AS (
  SELECT
    sample_id,
    COUNT(*) AS evidence_count,
    COUNT(*) FILTER (WHERE authenticity_status = 'verified') AS verified_evidence_count,
    COUNT(*) FILTER (WHERE authenticity_status IN ('conflicting','rejected')) AS conflicting_evidence_count
  FROM pi5_evidence_assets
  GROUP BY sample_id
), measurement AS (
  SELECT
    sample_id,
    COUNT(*) AS measurement_count,
    COUNT(*) FILTER (WHERE epistemic_status IN ('measured','independently_verified')) AS strong_measurement_count,
    COUNT(*) FILTER (WHERE quality_status IN ('blocked','rejected') OR epistemic_status IN ('conflicting','rejected')) AS blocked_measurement_count,
    AVG(quality_score) AS mean_measurement_quality
  FROM pi5_measurements
  GROUP BY sample_id
), custody AS (
  SELECT sample_id, COUNT(*) AS custody_event_count
  FROM pi5_chain_of_custody_events
  GROUP BY sample_id
), quarantine AS (
  SELECT entity_id AS sample_id, COUNT(*) AS open_quarantine_count
  FROM pi5_quarantine_items
  WHERE entity_type = 'sample' AND resolution_status IN ('open','collect_more_evidence')
  GROUP BY entity_id
)
SELECT
  s.id AS sample_id,
  s.canonical_key,
  s.lineage_group_key,
  s.collection_status,
  s.synthetic,
  COALESCE(e.evidence_count, 0) AS evidence_count,
  COALESCE(e.verified_evidence_count, 0) AS verified_evidence_count,
  COALESCE(e.conflicting_evidence_count, 0) AS conflicting_evidence_count,
  COALESCE(m.measurement_count, 0) AS measurement_count,
  COALESCE(m.strong_measurement_count, 0) AS strong_measurement_count,
  COALESCE(m.blocked_measurement_count, 0) AS blocked_measurement_count,
  COALESCE(m.mean_measurement_quality, 0) AS mean_measurement_quality,
  COALESCE(c.custody_event_count, 0) AS custody_event_count,
  COALESCE(q.open_quarantine_count, 0) AS open_quarantine_count,
  LEAST(100, GREATEST(0,
    (CASE WHEN s.synthetic = FALSE THEN 15 ELSE 0 END) +
    LEAST(25, COALESCE(e.verified_evidence_count, 0) * 8) +
    LEAST(25, COALESCE(m.strong_measurement_count, 0) * 5) +
    LEAST(10, COALESCE(c.custody_event_count, 0) * 2) +
    LEAST(25, COALESCE(m.mean_measurement_quality, 0) * 0.25) -
    COALESCE(e.conflicting_evidence_count, 0) * 15 -
    COALESCE(m.blocked_measurement_count, 0) * 15 -
    COALESCE(q.open_quarantine_count, 0) * 20
  ))::NUMERIC(5,2) AS reliability_score
FROM pi5_physical_samples s
LEFT JOIN evidence e ON e.sample_id = s.id
LEFT JOIN measurement m ON m.sample_id = s.id
LEFT JOIN custody c ON c.sample_id = s.id
LEFT JOIN quarantine q ON q.sample_id = s.id;

CREATE OR REPLACE VIEW pi5_training_eligible_samples_v2 AS
SELECT
  s.id AS sample_id,
  s.canonical_key,
  s.lineage_group_key,
  p.category,
  gl.id AS gold_label_id,
  gl.label_tier,
  gl.category_label,
  gl.global_score AS target_global_score,
  gl.dimension_scores AS target_dimension_scores,
  gl.label_hash,
  gl.evidence_quality_score,
  gl.reviewer_confidence,
  gl.adjudication_id,
  pred.id AS prediction_id,
  pred.input_snapshot,
  pred.result_snapshot,
  pred.input_hash,
  pred.methodology_version,
  pred.benchmark_version,
  pred.model_version,
  pred.coverage,
  pred.confidence,
  sr.reliability_score
FROM pi5_physical_samples s
JOIN pi5_products p ON p.id = s.product_id
JOIN pi5_gold_label_snapshots gl ON gl.sample_id = s.id
JOIN pi5_predictions_v2 pred ON pred.id = gl.prediction_id
JOIN pi5_sample_reliability sr ON sr.sample_id = s.id
WHERE s.synthetic = FALSE
  AND s.collection_status = 'accepted'
  AND gl.label_tier = 'gold'
  AND pred.coverage >= 80
  AND pred.confidence >= 70
  AND gl.evidence_quality_score >= 80
  AND gl.reviewer_confidence >= 70
  AND sr.reliability_score >= 80
  AND NOT EXISTS (
    SELECT 1 FROM pi5_exclusions x
    WHERE x.sample_id = s.id
      AND x.revoked_at IS NULL
      AND x.exclusion_scope IN ('training','all_ml')
  )
  AND NOT EXISTS (
    SELECT 1 FROM pi5_quarantine_items qi
    WHERE qi.entity_type = 'sample'
      AND qi.entity_id = s.id
      AND qi.resolution_status IN ('open','collect_more_evidence')
      AND qi.severity IN ('error','critical')
  );

CREATE OR REPLACE VIEW pi5_reviewer_quality_dashboard AS
WITH label_stats AS (
  SELECT
    el.expert_actor_id,
    COUNT(*) AS labels_submitted,
    AVG(el.reviewer_confidence) AS mean_reviewer_confidence,
    AVG(el.evidence_quality_score) AS mean_evidence_quality,
    AVG(ABS(el.global_score - gl.global_score)) FILTER (WHERE gl.id IS NOT NULL) AS mean_absolute_deviation_from_gold,
    COUNT(*) FILTER (WHERE lc.consensus_status = 'adjudication_required') AS adjudication_related_labels
  FROM pi5_expert_labels el
  JOIN pi5_labeling_sessions ls ON ls.id = el.labeling_session_id
  LEFT JOIN pi5_label_consensus_v2 lc ON lc.labeling_session_id = ls.id
  LEFT JOIN pi5_gold_label_snapshots gl ON gl.labeling_session_id = ls.id
  GROUP BY el.expert_actor_id
)
SELECT
  a.id AS expert_actor_id,
  a.display_name,
  ep.qualification_status,
  ep.specialties,
  ep.authorized_categories,
  COALESCE(ls.labels_submitted, 0) AS labels_submitted,
  ls.mean_reviewer_confidence,
  ls.mean_evidence_quality,
  ls.mean_absolute_deviation_from_gold,
  COALESCE(ls.adjudication_related_labels, 0) AS adjudication_related_labels
FROM pi5_actors a
JOIN pi5_expert_profiles ep ON ep.actor_id = a.id
LEFT JOIN label_stats ls ON ls.expert_actor_id = a.id;

COMMIT;
