BEGIN;

CREATE TABLE IF NOT EXISTS pi5_reference_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_type TEXT NOT NULL CHECK (reference_type IN ('methodology','benchmark','factor_library','ontology','unit_dictionary','quality_policy','labeling_protocol')),
  reference_key TEXT NOT NULL,
  version TEXT NOT NULL,
  content_hash CHAR(64) NOT NULL,
  source_uri TEXT,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','deprecated','revoked')),
  approved_by UUID REFERENCES pi5_actors(id),
  approved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reference_type, reference_key, version),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE INDEX IF NOT EXISTS pi5_reference_versions_lookup_idx
  ON pi5_reference_versions(reference_type, reference_key, status, effective_from DESC);

CREATE TABLE IF NOT EXISTS pi5_capture_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_code TEXT NOT NULL,
  version TEXT NOT NULL,
  category_scope TEXT[] NOT NULL DEFAULT '{}',
  required_views TEXT[] NOT NULL DEFAULT '{}',
  required_metrics TEXT[] NOT NULL DEFAULT '{}',
  minimum_evidence_count INTEGER NOT NULL DEFAULT 1 CHECK (minimum_evidence_count >= 0),
  instructions JSONB NOT NULL,
  content_hash CHAR(64) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','deprecated','revoked')),
  approved_by UUID REFERENCES pi5_actors(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (protocol_code, version)
);

CREATE TABLE IF NOT EXISTS pi5_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES pi5_organizations(id),
  canonical_key TEXT NOT NULL UNIQUE,
  instrument_type TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  measurement_capabilities TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','maintenance','retired','quarantined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pi5_instrument_calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL REFERENCES pi5_instruments(id),
  calibration_code TEXT NOT NULL,
  calibrated_at TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ,
  performed_by_organization_id UUID REFERENCES pi5_organizations(id),
  certificate_evidence_id UUID REFERENCES pi5_evidence_assets(id),
  result TEXT NOT NULL CHECK (result IN ('pass','pass_with_limitation','fail')),
  uncertainty JSONB,
  payload_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (instrument_id, calibration_code),
  CHECK (valid_until IS NULL OR valid_until > calibrated_at)
);
CREATE INDEX IF NOT EXISTS pi5_calibrations_instrument_idx
  ON pi5_instrument_calibrations(instrument_id, calibrated_at DESC);

CREATE TABLE IF NOT EXISTS pi5_capture_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES pi5_physical_samples(id),
  protocol_id UUID NOT NULL REFERENCES pi5_capture_protocols(id),
  session_key TEXT NOT NULL UNIQUE,
  device_actor_id UUID REFERENCES pi5_actors(id),
  operator_actor_id UUID NOT NULL REFERENCES pi5_actors(id),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  environment JSONB NOT NULL DEFAULT '{}'::jsonb,
  protocol_snapshot JSONB NOT NULL,
  protocol_hash CHAR(64) NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','complete','quality_review','accepted','rejected','abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (completed_at IS NULL OR completed_at >= started_at)
);
CREATE INDEX IF NOT EXISTS pi5_capture_sessions_sample_idx
  ON pi5_capture_sessions(sample_id, started_at DESC);

CREATE TABLE IF NOT EXISTS pi5_capture_session_instruments (
  capture_session_id UUID NOT NULL REFERENCES pi5_capture_sessions(id),
  instrument_id UUID NOT NULL REFERENCES pi5_instruments(id),
  calibration_id UUID REFERENCES pi5_instrument_calibrations(id),
  purpose TEXT NOT NULL,
  PRIMARY KEY (capture_session_id, instrument_id, purpose)
);

CREATE TABLE IF NOT EXISTS pi5_chain_of_custody_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES pi5_physical_samples(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('collected','received','stored','transferred','opened','subsampled','tested','returned','disposed','lost','quarantined')),
  occurred_at TIMESTAMPTZ NOT NULL,
  actor_id UUID NOT NULL REFERENCES pi5_actors(id),
  from_location TEXT,
  to_location TEXT,
  condition_notes TEXT,
  evidence_id UUID REFERENCES pi5_evidence_assets(id),
  previous_event_hash CHAR(64),
  event_hash CHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pi5_custody_sample_idx
  ON pi5_chain_of_custody_events(sample_id, occurred_at ASC);

CREATE TABLE IF NOT EXISTS pi5_reviewer_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_actor_id UUID NOT NULL REFERENCES pi5_actors(id),
  organization_id UUID REFERENCES pi5_organizations(id),
  product_id UUID REFERENCES pi5_products(id),
  sample_id UUID REFERENCES pi5_physical_samples(id),
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('employment','consulting','financial','authorship','supplier_relationship','family','self_review','other')),
  detail TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  declared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (organization_id IS NOT NULL OR product_id IS NOT NULL OR sample_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS pi5_reviewer_conflicts_actor_idx
  ON pi5_reviewer_conflicts(expert_actor_id, active);

CREATE TABLE IF NOT EXISTS pi5_label_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  labeling_session_id UUID NOT NULL REFERENCES pi5_labeling_sessions(id),
  expert_actor_id UUID NOT NULL REFERENCES pi5_actors(id),
  assigned_by UUID NOT NULL REFERENCES pi5_actors(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at TIMESTAMPTZ,
  assignment_status TEXT NOT NULL DEFAULT 'assigned' CHECK (assignment_status IN ('assigned','opened','submitted','declined','expired','revoked')),
  blind_packet_hash CHAR(64) NOT NULL,
  independence_status TEXT NOT NULL CHECK (independence_status IN ('verified','warning','blocked')),
  independence_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  opened_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  UNIQUE (labeling_session_id, expert_actor_id)
);
CREATE INDEX IF NOT EXISTS pi5_label_assignments_session_idx
  ON pi5_label_assignments(labeling_session_id, assignment_status);

ALTER TABLE pi5_expert_labels
  ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES pi5_label_assignments(id),
  ADD COLUMN IF NOT EXISTS protocol_hash CHAR(64),
  ADD COLUMN IF NOT EXISTS blind_packet_hash CHAR(64),
  ADD COLUMN IF NOT EXISTS label_version TEXT NOT NULL DEFAULT '1.0';

CREATE UNIQUE INDEX IF NOT EXISTS pi5_expert_labels_assignment_unique_idx
  ON pi5_expert_labels(assignment_id)
  WHERE assignment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS pi5_gold_label_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  labeling_session_id UUID NOT NULL UNIQUE REFERENCES pi5_labeling_sessions(id),
  sample_id UUID NOT NULL REFERENCES pi5_physical_samples(id),
  prediction_id UUID REFERENCES pi5_predictions_v2(id),
  label_tier TEXT NOT NULL CHECK (label_tier IN ('gold','silver')),
  category_label TEXT NOT NULL,
  global_score NUMERIC(4,2) NOT NULL CHECK (global_score BETWEEN 0 AND 5),
  dimension_scores JSONB NOT NULL,
  reviewer_actor_ids UUID[] NOT NULL,
  adjudication_id UUID REFERENCES pi5_adjudications(id),
  evidence_quality_score NUMERIC(5,2) NOT NULL CHECK (evidence_quality_score BETWEEN 0 AND 100),
  reviewer_confidence NUMERIC(5,2) NOT NULL CHECK (reviewer_confidence BETWEEN 0 AND 100),
  protocol_version TEXT NOT NULL,
  protocol_hash CHAR(64) NOT NULL,
  label_snapshot JSONB NOT NULL,
  label_hash CHAR(64) NOT NULL UNIQUE,
  frozen_by UUID NOT NULL REFERENCES pi5_actors(id),
  frozen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pi5_gold_labels_sample_idx
  ON pi5_gold_label_snapshots(sample_id, frozen_at DESC);

CREATE TABLE IF NOT EXISTS pi5_quarantine_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('sample','evidence','measurement','prediction','labeling_session','label','dataset_record')),
  entity_id UUID NOT NULL,
  reason_code TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('warning','error','critical')),
  reason_detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  detected_by TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolution_status TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open','collect_more_evidence','corrected','accepted_risk','excluded','resolved')),
  resolved_by UUID REFERENCES pi5_actors(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);
CREATE INDEX IF NOT EXISTS pi5_quarantine_open_idx
  ON pi5_quarantine_items(entity_type, entity_id, resolution_status);

CREATE TABLE IF NOT EXISTS pi5_dataset_freeze_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version_id UUID NOT NULL REFERENCES pi5_dataset_versions(id),
  audit_type TEXT NOT NULL CHECK (audit_type IN ('pre_freeze','post_freeze','independent_review','reproducibility_check')),
  checker_version TEXT NOT NULL,
  checks JSONB NOT NULL,
  passed BOOLEAN NOT NULL,
  report_hash CHAR(64) NOT NULL,
  executed_by UUID REFERENCES pi5_actors(id),
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pi5_dataset_audits_idx
  ON pi5_dataset_freeze_audits(dataset_version_id, executed_at DESC);

CREATE OR REPLACE FUNCTION pi5_valid_dimension_scores(scores JSONB) RETURNS BOOLEAN AS $$
DECLARE
  key TEXT;
  value_text TEXT;
  required_keys TEXT[] := ARRAY['climate','water','chemicals','materials','wasteCircularity','durability'];
BEGIN
  IF scores IS NULL OR jsonb_typeof(scores) <> 'object' THEN
    RETURN FALSE;
  END IF;
  FOREACH key IN ARRAY required_keys LOOP
    IF NOT scores ? key THEN
      RETURN FALSE;
    END IF;
    value_text := scores ->> key;
    IF value_text IS NULL OR value_text !~ '^-?[0-9]+([.][0-9]+)?$' THEN
      RETURN FALSE;
    END IF;
    IF value_text::NUMERIC < 0 OR value_text::NUMERIC > 5 THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pi5_expert_labels_dimension_scores_valid') THEN
    ALTER TABLE pi5_expert_labels
      ADD CONSTRAINT pi5_expert_labels_dimension_scores_valid
      CHECK (pi5_valid_dimension_scores(dimension_scores));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pi5_adjudications_dimension_scores_valid') THEN
    ALTER TABLE pi5_adjudications
      ADD CONSTRAINT pi5_adjudications_dimension_scores_valid
      CHECK (pi5_valid_dimension_scores(final_dimension_scores));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pi5_gold_labels_dimension_scores_valid') THEN
    ALTER TABLE pi5_gold_label_snapshots
      ADD CONSTRAINT pi5_gold_labels_dimension_scores_valid
      CHECK (pi5_valid_dimension_scores(dimension_scores));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION pi5_check_label_submission() RETURNS trigger AS $$
DECLARE
  assignment pi5_label_assignments%ROWTYPE;
  expert pi5_expert_profiles%ROWTYPE;
BEGIN
  IF NEW.assignment_id IS NULL THEN
    RAISE EXCEPTION 'Rótulo profissional exige assignment_id';
  END IF;
  SELECT * INTO assignment FROM pi5_label_assignments WHERE id = NEW.assignment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Atribuição de revisão não encontrada';
  END IF;
  IF assignment.labeling_session_id <> NEW.labeling_session_id OR assignment.expert_actor_id <> NEW.expert_actor_id THEN
    RAISE EXCEPTION 'Atribuição não corresponde à sessão e ao especialista';
  END IF;
  IF assignment.independence_status = 'blocked' OR assignment.assignment_status IN ('declined','expired','revoked') THEN
    RAISE EXCEPTION 'Atribuição não está apta para submissão';
  END IF;
  SELECT * INTO expert FROM pi5_expert_profiles WHERE actor_id = NEW.expert_actor_id;
  IF NOT FOUND OR expert.qualification_status <> 'qualified' THEN
    RAISE EXCEPTION 'Especialista não qualificado';
  END IF;
  IF NEW.blind_packet_hash IS DISTINCT FROM assignment.blind_packet_hash THEN
    RAISE EXCEPTION 'Hash do pacote cego divergente';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pi5_expert_labels_submission_gate ON pi5_expert_labels;
CREATE TRIGGER pi5_expert_labels_submission_gate
BEFORE INSERT ON pi5_expert_labels
FOR EACH ROW EXECUTE FUNCTION pi5_check_label_submission();

CREATE OR REPLACE FUNCTION pi5_check_instrument_calibration() RETURNS trigger AS $$
DECLARE
  calibration pi5_instrument_calibrations%ROWTYPE;
BEGIN
  IF NEW.calibration_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT * INTO calibration FROM pi5_instrument_calibrations WHERE id = NEW.calibration_id;
  IF NOT FOUND OR calibration.instrument_id <> NEW.instrument_id THEN
    RAISE EXCEPTION 'Calibração não corresponde ao instrumento';
  END IF;
  IF calibration.result = 'fail' OR (calibration.valid_until IS NOT NULL AND calibration.valid_until < NOW()) THEN
    RAISE EXCEPTION 'Instrumento com calibração inválida';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pi5_capture_instrument_calibration_gate ON pi5_capture_session_instruments;
CREATE TRIGGER pi5_capture_instrument_calibration_gate
BEFORE INSERT ON pi5_capture_session_instruments
FOR EACH ROW EXECUTE FUNCTION pi5_check_instrument_calibration();

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'pi5_reference_versions',
    'pi5_capture_protocols',
    'pi5_instrument_calibrations',
    'pi5_chain_of_custody_events',
    'pi5_expert_labels',
    'pi5_adjudications',
    'pi5_gold_label_snapshots',
    'pi5_dataset_freeze_audits'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_immutable ON %I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER %I_immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION pi5_prevent_mutation()', tbl, tbl);
  END LOOP;
END $$;

COMMIT;
