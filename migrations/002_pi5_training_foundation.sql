BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS pi5_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  organization_type TEXT NOT NULL CHECK (organization_type IN ('brand','atelier','manufacturer','supplier','laboratory','reviewer_org','phyllos')),
  country_code CHAR(2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pi5_actors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES pi5_organizations(id),
  canonical_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user','expert','system','device','integration')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pi5_expert_profiles (
  actor_id UUID PRIMARY KEY REFERENCES pi5_actors(id),
  specialties TEXT[] NOT NULL DEFAULT '{}',
  authorized_categories TEXT[] NOT NULL DEFAULT '{}',
  credential_summary TEXT,
  years_experience NUMERIC(5,2) CHECK (years_experience IS NULL OR years_experience >= 0),
  conflict_of_interest_policy_accepted_at TIMESTAMPTZ,
  qualification_status TEXT NOT NULL DEFAULT 'pending' CHECK (qualification_status IN ('pending','qualified','suspended','revoked')),
  qualified_at TIMESTAMPTZ,
  qualified_by UUID REFERENCES pi5_actors(id)
);

CREATE TABLE IF NOT EXISTS pi5_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES pi5_organizations(id),
  canonical_key TEXT NOT NULL,
  product_family_key TEXT NOT NULL,
  sku TEXT,
  category TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, canonical_key)
);

CREATE TABLE IF NOT EXISTS pi5_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES pi5_products(id),
  canonical_key TEXT NOT NULL,
  production_started_at TIMESTAMPTZ,
  production_finished_at TIMESTAMPTZ,
  quantity INTEGER CHECK (quantity IS NULL OR quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, canonical_key)
);

CREATE TABLE IF NOT EXISTS pi5_physical_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES pi5_products(id),
  batch_id UUID REFERENCES pi5_batches(id),
  canonical_key TEXT NOT NULL UNIQUE,
  lineage_group_key TEXT NOT NULL,
  sample_kind TEXT NOT NULL DEFAULT 'physical_piece' CHECK (sample_kind IN ('physical_piece','fabric_swatch','component','document_only','synthetic_fixture')),
  collection_status TEXT NOT NULL DEFAULT 'registered' CHECK (collection_status IN ('registered','capturing','complete','quality_review','accepted','rejected','retired')),
  collected_at TIMESTAMPTZ,
  collected_by UUID REFERENCES pi5_actors(id),
  storage_location TEXT,
  synthetic BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pi5_samples_lineage_idx ON pi5_physical_samples(lineage_group_key);
CREATE INDEX IF NOT EXISTS pi5_samples_product_idx ON pi5_physical_samples(product_id);

CREATE TABLE IF NOT EXISTS pi5_evidence_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID REFERENCES pi5_physical_samples(id),
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('image','label_image','supplier_document','certificate','invoice','measurement_file','laboratory_report','interview_note','other')),
  uri TEXT,
  sha256 CHAR(64) NOT NULL,
  mime_type TEXT,
  byte_size BIGINT CHECK (byte_size IS NULL OR byte_size >= 0),
  captured_at TIMESTAMPTZ,
  captured_by UUID REFERENCES pi5_actors(id),
  source_organization_id UUID REFERENCES pi5_organizations(id),
  consent_status TEXT NOT NULL DEFAULT 'not_required' CHECK (consent_status IN ('not_required','pending','granted','revoked')),
  retention_until TIMESTAMPTZ,
  authenticity_status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (authenticity_status IN ('unreviewed','consistent','verified','conflicting','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sha256, sample_id)
);
CREATE INDEX IF NOT EXISTS pi5_evidence_sample_idx ON pi5_evidence_assets(sample_id);
CREATE INDEX IF NOT EXISTS pi5_evidence_hash_idx ON pi5_evidence_assets(sha256);

CREATE TABLE IF NOT EXISTS pi5_measurement_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  method_version TEXT NOT NULL,
  standard_reference TEXT,
  default_unit TEXT,
  expected_uncertainty NUMERIC(12,6),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pi5_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES pi5_physical_samples(id),
  metric_code TEXT NOT NULL,
  numeric_value NUMERIC(20,8),
  text_value TEXT,
  unit TEXT,
  method_id UUID REFERENCES pi5_measurement_methods(id),
  source_type TEXT NOT NULL CHECK (source_type IN ('instrument_measured','manual_measured','laboratory','third_party_document','supplier_declaration','brand_declaration','model_inference','derived','reference_default')),
  epistemic_status TEXT NOT NULL CHECK (epistemic_status IN ('unknown','declared','documented','measured','independently_verified','derived','conflicting','rejected')),
  uncertainty_lower NUMERIC(20,8),
  uncertainty_upper NUMERIC(20,8),
  uncertainty_stddev NUMERIC(20,8),
  observed_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID NOT NULL REFERENCES pi5_actors(id),
  source_organization_id UUID REFERENCES pi5_organizations(id),
  device_actor_id UUID REFERENCES pi5_actors(id),
  idempotency_key TEXT NOT NULL UNIQUE,
  payload_hash CHAR(64) NOT NULL,
  supersedes_measurement_id UUID REFERENCES pi5_measurements(id),
  quality_status TEXT NOT NULL DEFAULT 'pending' CHECK (quality_status IN ('pending','accepted','warning','blocked','rejected')),
  quality_score NUMERIC(5,2) CHECK (quality_score IS NULL OR quality_score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (numeric_value IS NOT NULL OR text_value IS NOT NULL),
  CHECK (uncertainty_lower IS NULL OR uncertainty_upper IS NULL OR uncertainty_lower <= uncertainty_upper)
);
CREATE INDEX IF NOT EXISTS pi5_measurements_sample_metric_idx ON pi5_measurements(sample_id, metric_code, observed_at DESC);
CREATE INDEX IF NOT EXISTS pi5_measurements_status_idx ON pi5_measurements(quality_status, epistemic_status);

CREATE TABLE IF NOT EXISTS pi5_measurement_evidence (
  measurement_id UUID NOT NULL REFERENCES pi5_measurements(id),
  evidence_id UUID NOT NULL REFERENCES pi5_evidence_assets(id),
  relation_type TEXT NOT NULL DEFAULT 'supported_by' CHECK (relation_type IN ('supported_by','derived_from','contradicted_by','captured_with')),
  PRIMARY KEY (measurement_id, evidence_id, relation_type)
);

CREATE TABLE IF NOT EXISTS pi5_measurement_dependencies (
  measurement_id UUID NOT NULL REFERENCES pi5_measurements(id),
  depends_on_measurement_id UUID NOT NULL REFERENCES pi5_measurements(id),
  derivation_role TEXT NOT NULL,
  PRIMARY KEY (measurement_id, depends_on_measurement_id),
  CHECK (measurement_id <> depends_on_measurement_id)
);

CREATE TABLE IF NOT EXISTS pi5_predictions_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES pi5_physical_samples(id),
  prediction_key TEXT NOT NULL UNIQUE,
  methodology_version TEXT NOT NULL,
  benchmark_version TEXT NOT NULL,
  model_version TEXT NOT NULL,
  input_snapshot JSONB NOT NULL,
  result_snapshot JSONB NOT NULL,
  input_hash CHAR(64) NOT NULL,
  methodology_hash CHAR(64) NOT NULL,
  benchmark_hash CHAR(64) NOT NULL,
  model_hash CHAR(64) NOT NULL,
  result_hash CHAR(64) NOT NULL,
  coverage NUMERIC(5,2) NOT NULL CHECK (coverage BETWEEN 0 AND 100),
  confidence NUMERIC(5,2) NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  publication_status TEXT NOT NULL CHECK (publication_status IN ('insufficient_data','estimated','experimental','contextualized','professionally_reviewed','blocked','revoked')),
  calculated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pi5_predictions_sample_idx ON pi5_predictions_v2(sample_id, calculated_at DESC);

CREATE TABLE IF NOT EXISTS pi5_labeling_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES pi5_physical_samples(id),
  prediction_id UUID REFERENCES pi5_predictions_v2(id),
  protocol_version TEXT NOT NULL,
  blind_review BOOLEAN NOT NULL DEFAULT TRUE,
  required_reviewers SMALLINT NOT NULL DEFAULT 2 CHECK (required_reviewers BETWEEN 2 AND 5),
  session_status TEXT NOT NULL DEFAULT 'open' CHECK (session_status IN ('open','awaiting_review','consensus','adjudication_required','adjudicated','rejected','closed')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES pi5_actors(id)
);

CREATE TABLE IF NOT EXISTS pi5_expert_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  labeling_session_id UUID NOT NULL REFERENCES pi5_labeling_sessions(id),
  expert_actor_id UUID NOT NULL REFERENCES pi5_actors(id),
  global_score NUMERIC(4,2) CHECK (global_score IS NULL OR global_score BETWEEN 0 AND 5),
  dimension_scores JSONB NOT NULL,
  category_label TEXT,
  evidence_quality_score NUMERIC(5,2) NOT NULL CHECK (evidence_quality_score BETWEEN 0 AND 100),
  reviewer_confidence NUMERIC(5,2) NOT NULL CHECK (reviewer_confidence BETWEEN 0 AND 100),
  review_decision TEXT NOT NULL CHECK (review_decision IN ('accept','accept_with_warning','insufficient_evidence','reject')),
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_hash CHAR(64) NOT NULL,
  UNIQUE (labeling_session_id, expert_actor_id)
);
CREATE INDEX IF NOT EXISTS pi5_labels_session_idx ON pi5_expert_labels(labeling_session_id);

CREATE TABLE IF NOT EXISTS pi5_adjudications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  labeling_session_id UUID NOT NULL UNIQUE REFERENCES pi5_labeling_sessions(id),
  adjudicator_actor_id UUID NOT NULL REFERENCES pi5_actors(id),
  final_global_score NUMERIC(4,2) CHECK (final_global_score IS NULL OR final_global_score BETWEEN 0 AND 5),
  final_dimension_scores JSONB NOT NULL,
  final_category_label TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('gold','silver','exclude','collect_more_evidence')),
  rationale TEXT NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_hash CHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS pi5_quality_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code TEXT NOT NULL,
  rule_version TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('sample','evidence','measurement','label','dataset','split')),
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','error','critical')),
  description TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (rule_code, rule_version)
);

CREATE TABLE IF NOT EXISTS pi5_quality_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES pi5_quality_rules(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  passed BOOLEAN NOT NULL,
  observed_value JSONB,
  message TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checker_version TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS pi5_quality_entity_idx ON pi5_quality_results(entity_type, entity_id, checked_at DESC);

CREATE TABLE IF NOT EXISTS pi5_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID REFERENCES pi5_physical_samples(id),
  prediction_id UUID REFERENCES pi5_predictions_v2(id),
  reason_code TEXT NOT NULL,
  reason_detail TEXT,
  exclusion_scope TEXT NOT NULL CHECK (exclusion_scope IN ('training','validation','test','all_ml','publication')),
  permanent BOOLEAN NOT NULL DEFAULT FALSE,
  excluded_by UUID NOT NULL REFERENCES pi5_actors(id),
  excluded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_by UUID REFERENCES pi5_actors(id),
  revoked_at TIMESTAMPTZ,
  CHECK (sample_id IS NOT NULL OR prediction_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS pi5_dataset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_name TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','frozen','approved','deprecated','revoked')),
  purpose TEXT NOT NULL,
  protocol_version TEXT NOT NULL,
  query_definition JSONB NOT NULL,
  split_salt_hash CHAR(64) NOT NULL,
  manifest JSONB,
  manifest_hash CHAR(64),
  created_by UUID NOT NULL REFERENCES pi5_actors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  frozen_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES pi5_actors(id),
  UNIQUE (dataset_name, version)
);

CREATE TABLE IF NOT EXISTS pi5_dataset_split_groups (
  dataset_version_id UUID NOT NULL REFERENCES pi5_dataset_versions(id),
  lineage_group_key TEXT NOT NULL,
  split TEXT NOT NULL CHECK (split IN ('train','validation','test','quarantine')),
  assignment_hash CHAR(64) NOT NULL,
  PRIMARY KEY (dataset_version_id, lineage_group_key)
);

CREATE TABLE IF NOT EXISTS pi5_dataset_members (
  dataset_version_id UUID NOT NULL REFERENCES pi5_dataset_versions(id),
  sample_id UUID NOT NULL REFERENCES pi5_physical_samples(id),
  prediction_id UUID NOT NULL REFERENCES pi5_predictions_v2(id),
  labeling_session_id UUID NOT NULL REFERENCES pi5_labeling_sessions(id),
  split TEXT NOT NULL CHECK (split IN ('train','validation','test','quarantine')),
  label_tier TEXT NOT NULL CHECK (label_tier IN ('gold','silver')),
  feature_snapshot JSONB NOT NULL,
  target_snapshot JSONB NOT NULL,
  record_hash CHAR(64) NOT NULL,
  lineage_group_key TEXT NOT NULL,
  included_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (dataset_version_id, sample_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pi5_dataset_members_split_group_fk'
  ) THEN
    ALTER TABLE pi5_dataset_members
      ADD CONSTRAINT pi5_dataset_members_split_group_fk
      FOREIGN KEY (dataset_version_id, lineage_group_key)
      REFERENCES pi5_dataset_split_groups(dataset_version_id, lineage_group_key)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS pi5_model_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version_id UUID NOT NULL REFERENCES pi5_dataset_versions(id),
  run_key TEXT NOT NULL UNIQUE,
  algorithm TEXT NOT NULL,
  code_version TEXT NOT NULL,
  model_config JSONB NOT NULL,
  metrics JSONB,
  slice_metrics JSONB,
  artifact_hash CHAR(64),
  run_status TEXT NOT NULL DEFAULT 'created' CHECK (run_status IN ('created','training','evaluated','rejected','candidate','promoted','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION pi5_prevent_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'PI5 append-only: % não pode ser alterado ou removido', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'pi5_evidence_assets',
    'pi5_measurements',
    'pi5_predictions_v2',
    'pi5_expert_labels',
    'pi5_adjudications'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_immutable ON %I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER %I_immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION pi5_prevent_mutation()', tbl, tbl);
  END LOOP;
END $$;

COMMIT;
