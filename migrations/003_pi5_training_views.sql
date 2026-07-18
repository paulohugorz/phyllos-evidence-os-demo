BEGIN;

CREATE OR REPLACE VIEW pi5_label_consensus AS
WITH reviews AS (
  SELECT
    ls.id AS labeling_session_id,
    ls.sample_id,
    COUNT(el.id) AS reviewer_count,
    AVG(el.global_score) AS mean_global_score,
    MAX(el.global_score) - MIN(el.global_score) AS global_score_range,
    MIN(el.evidence_quality_score) AS min_evidence_quality,
    MIN(el.reviewer_confidence) AS min_reviewer_confidence,
    BOOL_AND(el.review_decision IN ('accept','accept_with_warning')) AS all_reviewers_accept,
    COUNT(DISTINCT el.category_label) FILTER (WHERE el.category_label IS NOT NULL) AS category_count
  FROM pi5_labeling_sessions ls
  LEFT JOIN pi5_expert_labels el ON el.labeling_session_id = ls.id
  GROUP BY ls.id, ls.sample_id
)
SELECT
  r.*,
  CASE
    WHEN a.decision = 'gold' THEN 'gold'
    WHEN a.decision = 'silver' THEN 'silver'
    WHEN a.decision IN ('exclude','collect_more_evidence') THEN 'not_eligible'
    WHEN r.reviewer_count < 2 THEN 'awaiting_second_review'
    WHEN NOT r.all_reviewers_accept THEN 'adjudication_required'
    WHEN r.global_score_range > 0.50 THEN 'adjudication_required'
    WHEN r.category_count > 1 THEN 'adjudication_required'
    WHEN r.min_evidence_quality < 80 THEN 'collect_more_evidence'
    WHEN r.min_reviewer_confidence < 70 THEN 'collect_more_evidence'
    ELSE 'gold_candidate'
  END AS consensus_status,
  a.final_global_score,
  a.final_dimension_scores,
  a.final_category_label,
  a.decision AS adjudication_decision
FROM reviews r
LEFT JOIN pi5_adjudications a ON a.labeling_session_id = r.labeling_session_id;

CREATE OR REPLACE VIEW pi5_training_eligible_samples AS
SELECT
  s.id AS sample_id,
  s.canonical_key,
  s.lineage_group_key,
  p.category,
  lc.labeling_session_id,
  lc.consensus_status,
  COALESCE(lc.final_global_score, lc.mean_global_score) AS target_global_score,
  lc.final_dimension_scores,
  pred.id AS prediction_id,
  pred.input_snapshot,
  pred.result_snapshot,
  pred.coverage,
  pred.confidence
FROM pi5_physical_samples s
JOIN pi5_products p ON p.id = s.product_id
JOIN pi5_label_consensus lc ON lc.sample_id = s.id
JOIN LATERAL (
  SELECT p2.* FROM pi5_predictions_v2 p2
  WHERE p2.sample_id = s.id
  ORDER BY p2.calculated_at DESC
  LIMIT 1
) pred ON TRUE
WHERE s.synthetic = FALSE
  AND s.collection_status = 'accepted'
  AND lc.consensus_status IN ('gold','gold_candidate')
  AND pred.coverage >= 80
  AND pred.confidence >= 70
  AND NOT EXISTS (
    SELECT 1 FROM pi5_exclusions x
    WHERE x.sample_id = s.id
      AND x.revoked_at IS NULL
      AND x.exclusion_scope IN ('training','all_ml')
  )
  AND NOT EXISTS (
    SELECT 1 FROM pi5_quality_results qr
    JOIN pi5_quality_rules rule ON rule.id = qr.rule_id
    WHERE qr.entity_type = 'sample'
      AND qr.entity_id = s.id
      AND qr.passed = FALSE
      AND rule.severity IN ('error','critical')
  );

CREATE OR REPLACE VIEW pi5_dataset_distribution AS
SELECT
  dm.dataset_version_id,
  dm.split,
  p.category,
  dm.label_tier,
  COUNT(*) AS records,
  COUNT(DISTINCT dm.lineage_group_key) AS lineage_groups,
  AVG(pred.coverage) AS mean_coverage,
  AVG(pred.confidence) AS mean_confidence
FROM pi5_dataset_members dm
JOIN pi5_physical_samples s ON s.id = dm.sample_id
JOIN pi5_products p ON p.id = s.product_id
JOIN pi5_predictions_v2 pred ON pred.id = dm.prediction_id
GROUP BY dm.dataset_version_id, dm.split, p.category, dm.label_tier;

COMMIT;
