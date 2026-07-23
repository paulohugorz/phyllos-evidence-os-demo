BEGIN;

SELECT pg_advisory_xact_lock(hashtext('phyllos:materials-api:v1'));

DO $$
BEGIN
  IF to_regclass('materials.material_application') IS NULL THEN
    RAISE EXCEPTION 'materials.material_application não existe; aplique a migration 002 primeiro';
  END IF;
  IF to_regclass('materials.commercial_article') IS NULL THEN
    RAISE EXCEPTION 'materials.commercial_article não existe; aplique a migration 002 primeiro';
  END IF;
END $$;

ALTER TABLE materials.commercial_article
  ADD COLUMN IF NOT EXISTS client_request_id TEXT;

ALTER TABLE materials.material_application
  ADD COLUMN IF NOT EXISTS application_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notes_pt TEXT,
  ADD COLUMN IF NOT EXISTS client_request_id TEXT,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_commercial_article_client_request
  ON materials.commercial_article (tenant_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_material_application_client_request
  ON materials.material_application (tenant_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_material_application_active_sku
  ON materials.material_application (tenant_id, sku_id, status, component_type_id);

CREATE INDEX IF NOT EXISTS idx_commercial_article_search
  ON materials.commercial_article (tenant_id, lower(commercial_code), lower(COALESCE(commercial_name, '')));

CREATE OR REPLACE VIEW materials.v_material_application_api
WITH (security_invoker = true) AS
SELECT
  ma.tenant_id,
  ma.id,
  ma.sku_id,
  ma.component_type_id,
  ct.code AS component_code,
  ct.name_pt AS component_name_pt,
  ct.vertical,
  ct.is_critical,
  ma.commercial_article_id,
  ca.commercial_code,
  ca.commercial_name,
  ca.supplier_organization_id,
  COALESCE(to_jsonb(org) ->> 'name', ca.supplier_organization_id) AS supplier_name,
  ca.primary_material_id,
  m.canonical_name_pt AS material_name_pt,
  mf.name_pt AS family_name_pt,
  ma.batch_reference,
  ma.quantity,
  ma.quantity_unit,
  ma.confidence,
  ma.status,
  ma.notes_pt,
  ma.application_snapshot,
  ma.version,
  ma.created_by,
  ma.created_at,
  ma.updated_at,
  ma.archived_at,
  COALESCE(comp.composition, '[]'::jsonb) AS composition,
  COALESCE(comp.composition_total_pct, 0) AS composition_total_pct,
  COALESCE(ev.evidence, '[]'::jsonb) AS evidence,
  COALESCE(ev.evidence_count, 0) AS evidence_count,
  COALESCE(cl.claim_count, 0) AS claim_count,
  COALESCE(cl.blocked_claim_count, 0) AS blocked_claim_count
FROM materials.material_application ma
JOIN materials.component_type ct ON ct.id = ma.component_type_id
JOIN materials.commercial_article ca
  ON ca.tenant_id = ma.tenant_id AND ca.id = ma.commercial_article_id
JOIN materials.material m ON m.id = ca.primary_material_id
JOIN materials.material_family mf ON mf.id = m.family_id
LEFT JOIN public.organizations org
  ON org.tenant_id = ma.tenant_id AND org.id = ca.supplier_organization_id
LEFT JOIN LATERAL (
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'id', ac.id,
        'material_id', ac.constituent_material_id,
        'material_name', cm.canonical_name_pt,
        'percentage', ac.percentage,
        'feedstock_type', ac.feedstock_type,
        'confidence', ac.confidence,
        'declaration_basis', ac.declaration_basis
      ) ORDER BY ac.percentage DESC, cm.canonical_name_pt
    ) AS composition,
    sum(ac.percentage) AS composition_total_pct
  FROM materials.article_composition ac
  JOIN materials.material cm ON cm.id = ac.constituent_material_id
  WHERE ac.tenant_id = ma.tenant_id
    AND ac.commercial_article_id = ma.commercial_article_id
) comp ON true
LEFT JOIN LATERAL (
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'id', eb.id,
        'evidence_id', eb.evidence_id,
        'document_id', eb.document_id,
        'relationship', eb.relationship,
        'scope', eb.scope,
        'created_at', eb.created_at
      ) ORDER BY eb.created_at DESC
    ) AS evidence,
    count(*) AS evidence_count
  FROM materials.evidence_binding eb
  WHERE eb.tenant_id = ma.tenant_id
    AND eb.subject_type = 'material_application'
    AND eb.subject_id = ma.id
) ev ON true
LEFT JOIN LATERAL (
  SELECT
    count(*) AS claim_count,
    count(*) FILTER (
      WHERE acl.status IN ('unsupported', 'rejected', 'blocked', 'expired')
    ) AS blocked_claim_count
  FROM materials.application_claim acl
  WHERE acl.tenant_id = ma.tenant_id
    AND acl.material_application_id = ma.id
) cl ON true;

INSERT INTO materials.schema_migration (migration_key, checksum_sha256, notes)
VALUES (
  '003_materials_api_v1',
  NULL,
  'Contrato API persistente, snapshot histórico, idempotência e versão otimista para aplicações.'
)
ON CONFLICT (migration_key) DO NOTHING;

COMMIT;
