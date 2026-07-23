BEGIN;

SELECT pg_advisory_xact_lock(hashtext('phyllos:materials-kb:v0.2'));

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS materials;

CREATE TABLE IF NOT EXISTS materials.schema_migration (
    migration_key TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    checksum_sha256 TEXT,
    notes TEXT
);

DO $$
BEGIN
    CREATE TYPE materials.confidence_state AS ENUM (
        'unknown',
        'declared_by_brand',
        'declared_by_supplier',
        'documented',
        'laboratory_tested',
        'reviewed',
        'validated',
        'conflicting',
        'expired',
        'superseded'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE materials.product_vertical AS ENUM (
        'apparel',
        'footwear',
        'accessory',
        'packaging'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE materials.material_base_origin AS ENUM (
        'plant',
        'animal',
        'regenerated_cellulosic',
        'fossil_synthetic',
        'mineral',
        'mixed',
        'other'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE materials.feedstock_type AS ENUM (
        'unknown',
        'virgin',
        'recycled_pre_consumer',
        'recycled_post_consumer',
        'reused',
        'mass_balance'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE materials.document_type AS ENUM (
        'technical_datasheet',
        'certificate',
        'transaction_certificate',
        'lab_report',
        'self_declaration',
        'origin_document',
        'invoice',
        'image',
        'other'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE materials.access_tier AS ENUM (
        'private',
        'internal_shared',
        'supplier_restricted',
        'buyer_restricted',
        'public',
        'authorities_only',
        'legitimate_interest'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE materials.claim_status AS ENUM (
        'draft',
        'evidence_requested',
        'under_review',
        'substantiated',
        'substantiated_with_limitations',
        'unsupported',
        'rejected',
        'approved_for_buyer',
        'approved_for_publication',
        'blocked',
        'expired'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE materials.evidence_relationship AS ENUM (
        'supports',
        'contradicts',
        'contextualizes'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------------
-- Catálogo compartilhado e versionado
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS materials.catalog_source (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name_pt TEXT NOT NULL,
    source_url TEXT,
    publisher TEXT,
    sync_frequency TEXT,
    last_verified_at TIMESTAMPTZ,
    effective_from DATE,
    effective_until DATE,
    notes_pt TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS materials.material_family (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name_pt TEXT NOT NULL,
    name_en TEXT,
    description_pt TEXT,
    source_id UUID REFERENCES materials.catalog_source(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS materials.material (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES materials.material_family(id),
    canonical_name_pt TEXT NOT NULL,
    canonical_name_en TEXT,
    technical_name TEXT,
    base_origin materials.material_base_origin NOT NULL,
    structure TEXT,
    iso_reference TEXT,
    source_id UUID REFERENCES materials.catalog_source(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_material_family_name
    ON materials.material (family_id, lower(canonical_name_pt));

CREATE TABLE IF NOT EXISTS materials.material_alias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES materials.material(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    language_code TEXT NOT NULL DEFAULT 'pt-BR',
    alias_kind TEXT NOT NULL DEFAULT 'synonym'
        CHECK (alias_kind IN ('synonym', 'commercial_name', 'abbreviation', 'legacy_term')),
    source_id UUID REFERENCES materials.catalog_source(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_material_alias
    ON materials.material_alias (material_id, language_code, lower(alias));

CREATE TABLE IF NOT EXISTS materials.material_vertical (
    material_id UUID NOT NULL REFERENCES materials.material(id) ON DELETE CASCADE,
    vertical materials.product_vertical NOT NULL,
    PRIMARY KEY (material_id, vertical)
);

CREATE TABLE IF NOT EXISTS materials.component_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    name_pt TEXT NOT NULL,
    name_en TEXT,
    vertical materials.product_vertical NOT NULL,
    description_pt TEXT,
    is_critical BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (vertical, code)
);

CREATE TABLE IF NOT EXISTS materials.manufacturing_process (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name_pt TEXT NOT NULL,
    name_en TEXT,
    stage TEXT,
    description_pt TEXT,
    source_id UUID REFERENCES materials.catalog_source(id),
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS materials.material_process (
    material_id UUID NOT NULL REFERENCES materials.material(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES materials.manufacturing_process(id),
    notes_pt TEXT,
    PRIMARY KEY (material_id, process_id)
);

CREATE TABLE IF NOT EXISTS materials.certification_standard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    version_code TEXT NOT NULL DEFAULT 'unspecified',
    name_full TEXT NOT NULL,
    owner_org TEXT NOT NULL,
    scope_pt TEXT,
    covers_chain_of_custody BOOLEAN NOT NULL DEFAULT false,
    covers_chemical_restriction BOOLEAN NOT NULL DEFAULT false,
    covers_social_environmental BOOLEAN NOT NULL DEFAULT false,
    effective_from DATE,
    effective_until DATE,
    source_id UUID REFERENCES materials.catalog_source(id),
    source_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (code, version_code)
);

CREATE TABLE IF NOT EXISTS materials.certification_claim_rule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certification_id UUID NOT NULL REFERENCES materials.certification_standard(id) ON DELETE CASCADE,
    claim_context TEXT NOT NULL
        CHECK (claim_context IN ('certification_scope', 'business_to_business', 'consumer_facing', 'label_grade')),
    claim_label TEXT,
    minimum_content_pct NUMERIC(7,4),
    maximum_content_pct NUMERIC(7,4),
    notes_pt TEXT,
    source_id UUID REFERENCES materials.catalog_source(id),
    CHECK (minimum_content_pct IS NULL OR minimum_content_pct BETWEEN 0 AND 100),
    CHECK (maximum_content_pct IS NULL OR maximum_content_pct BETWEEN 0 AND 100),
    CHECK (
        minimum_content_pct IS NULL OR maximum_content_pct IS NULL OR
        minimum_content_pct <= maximum_content_pct
    ),
    UNIQUE (certification_id, claim_context, claim_label)
);

CREATE TABLE IF NOT EXISTS materials.claim_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name_pt TEXT NOT NULL,
    name_en TEXT,
    category TEXT NOT NULL
        CHECK (category IN ('environmental', 'social', 'technical', 'origin', 'commercial')),
    description_pt TEXT,
    source_id UUID REFERENCES materials.catalog_source(id),
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS materials.evidence_requirement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_type_id UUID NOT NULL REFERENCES materials.claim_type(id) ON DELETE CASCADE,
    required_document_type materials.document_type NOT NULL,
    accepted_certification_id UUID REFERENCES materials.certification_standard(id),
    proof_method_code TEXT NOT NULL,
    access_tier materials.access_tier NOT NULL DEFAULT 'private',
    description_pt TEXT NOT NULL,
    effective_from DATE,
    effective_until DATE,
    source_id UUID REFERENCES materials.catalog_source(id),
    UNIQUE (
        claim_type_id,
        required_document_type,
        accepted_certification_id,
        proof_method_code,
        access_tier
    )
);

CREATE TABLE IF NOT EXISTS materials.substance_of_concern (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cas_number TEXT,
    ec_number TEXT,
    name_en TEXT NOT NULL,
    list_source_code TEXT NOT NULL,
    concentration_limit_pct NUMERIC(12,6),
    reason_pt TEXT,
    added_to_list_at DATE,
    source_id UUID REFERENCES materials.catalog_source(id),
    source_url TEXT,
    last_verified_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (list_source_code, name_en)
);

CREATE INDEX IF NOT EXISTS idx_substance_cas
    ON materials.substance_of_concern (cas_number);

CREATE TABLE IF NOT EXISTS materials.material_version (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES materials.material(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL CHECK (version_number > 0),
    snapshot JSONB NOT NULL,
    change_notes_pt TEXT,
    confidence materials.confidence_state NOT NULL DEFAULT 'unknown',
    authored_by TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (material_id, version_number)
);

-- Catálogo global: leitura é compartilhada; mutações exigem contexto
-- explícito de administrador PHYLLOS. O seed define app.role=migration.
CREATE OR REPLACE FUNCTION materials.require_catalog_admin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    active_role TEXT;
BEGIN
    active_role := current_setting('app.role', true);
    IF active_role NOT IN ('phyllos_admin', 'migration') THEN
        RAISE EXCEPTION 'Escrita no catálogo exige app.role=phyllos_admin'
            USING ERRCODE = '42501';
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'catalog_source',
        'material_family',
        'material',
        'material_alias',
        'material_vertical',
        'component_type',
        'manufacturing_process',
        'material_process',
        'certification_standard',
        'certification_claim_rule',
        'claim_type',
        'evidence_requirement',
        'substance_of_concern',
        'material_version'
    ] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_require_catalog_admin ON materials.%I', table_name);
        EXECUTE format(
            'CREATE TRIGGER trg_require_catalog_admin BEFORE INSERT OR UPDATE OR DELETE ON materials.%I FOR EACH ROW EXECUTE FUNCTION materials.require_catalog_admin()',
            table_name
        );
    END LOOP;
END $$;

-- ------------------------------------------------------------------
-- Integração tenant-aware com Product/SKU do Evidence OS
-- ------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_organizations_tenant_id_id
    ON public.organizations (tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_skus_tenant_id_id
    ON public.skus (tenant_id, id);

CREATE TABLE IF NOT EXISTS materials.commercial_article (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    supplier_organization_id TEXT NOT NULL,
    primary_material_id UUID NOT NULL REFERENCES materials.material(id),
    commercial_code TEXT NOT NULL,
    commercial_name TEXT,
    gtin TEXT CHECK (gtin IS NULL OR gtin ~ '^[0-9]{8,14}$'),
    hs_code TEXT,
    pefcr_category TEXT,
    weight_gsm NUMERIC(12,4) CHECK (weight_gsm IS NULL OR weight_gsm >= 0),
    width_cm NUMERIC(12,4) CHECK (width_cm IS NULL OR width_cm >= 0),
    color TEXT,
    finish TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'archived')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, supplier_organization_id)
        REFERENCES public.organizations (tenant_id, id),
    UNIQUE (tenant_id, supplier_organization_id, commercial_code)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_commercial_article_tenant_id_id
    ON materials.commercial_article (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_commercial_article_material
    ON materials.commercial_article (tenant_id, primary_material_id);
CREATE INDEX IF NOT EXISTS idx_commercial_article_gtin
    ON materials.commercial_article (tenant_id, gtin)
    WHERE gtin IS NOT NULL;

CREATE TABLE IF NOT EXISTS materials.article_composition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    commercial_article_id UUID NOT NULL,
    constituent_material_id UUID NOT NULL REFERENCES materials.material(id),
    percentage NUMERIC(7,4) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
    tolerance_pct NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (tolerance_pct BETWEEN 0 AND 100),
    feedstock_type materials.feedstock_type NOT NULL DEFAULT 'unknown',
    declaration_basis TEXT,
    confidence materials.confidence_state NOT NULL DEFAULT 'unknown',
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, commercial_article_id)
        REFERENCES materials.commercial_article (tenant_id, id) ON DELETE CASCADE,
    UNIQUE (commercial_article_id, constituent_material_id, feedstock_type)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_article_composition_tenant_id_id
    ON materials.article_composition (tenant_id, id);

CREATE TABLE IF NOT EXISTS materials.material_application (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    sku_id TEXT NOT NULL,
    component_type_id UUID NOT NULL REFERENCES materials.component_type(id),
    commercial_article_id UUID NOT NULL,
    batch_reference TEXT,
    quantity NUMERIC(14,4) CHECK (quantity IS NULL OR quantity >= 0),
    quantity_unit TEXT,
    confidence materials.confidence_state NOT NULL DEFAULT 'unknown',
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'archived')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, sku_id)
        REFERENCES public.skus (tenant_id, id),
    FOREIGN KEY (tenant_id, commercial_article_id)
        REFERENCES materials.commercial_article (tenant_id, id),
    UNIQUE (tenant_id, sku_id, component_type_id, commercial_article_id, batch_reference)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_material_application_identity_null_safe
    ON materials.material_application (tenant_id, sku_id, component_type_id, commercial_article_id, batch_reference)
    NULLS NOT DISTINCT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_material_application_tenant_id_id
    ON materials.material_application (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_material_application_sku
    ON materials.material_application (tenant_id, sku_id);
CREATE INDEX IF NOT EXISTS idx_material_application_batch
    ON materials.material_application (tenant_id, batch_reference)
    WHERE batch_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS materials.application_claim (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    material_application_id UUID NOT NULL,
    claim_type_id UUID NOT NULL REFERENCES materials.claim_type(id),
    claim_text_pt TEXT,
    claim_text_en TEXT,
    status materials.claim_status NOT NULL DEFAULT 'draft',
    limitations_pt TEXT,
    valid_from DATE,
    valid_until DATE,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (tenant_id, material_application_id)
        REFERENCES materials.material_application (tenant_id, id) ON DELETE CASCADE,
    CHECK (
        status NOT IN ('approved_for_buyer', 'approved_for_publication') OR
        (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    ),
    UNIQUE (material_application_id, claim_type_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_application_claim_tenant_id_id
    ON materials.application_claim (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_application_claim_status
    ON materials.application_claim (tenant_id, status);

-- Ponte para os recursos canônicos de Evidence/Document do Evidence OS.
-- Os IDs permanecem TEXT até a persistência PostgreSQL de Evidence ser
-- conectada ao runtime. Uma migração futura deverá adicionar FKs reais.
CREATE TABLE IF NOT EXISTS materials.evidence_binding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    subject_type TEXT NOT NULL
        CHECK (subject_type IN (
            'commercial_article',
            'article_composition',
            'material_application',
            'application_claim'
        )),
    subject_id UUID NOT NULL,
    evidence_id TEXT NOT NULL,
    document_id TEXT,
    relationship materials.evidence_relationship NOT NULL DEFAULT 'supports',
    scope JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, subject_type, subject_id, evidence_id, relationship)
);

CREATE INDEX IF NOT EXISTS idx_evidence_binding_subject
    ON materials.evidence_binding (tenant_id, subject_type, subject_id);

-- ------------------------------------------------------------------
-- Regras de integridade
-- ------------------------------------------------------------------

CREATE OR REPLACE FUNCTION materials.enforce_article_composition_total()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    target_article UUID;
    total_pct NUMERIC;
BEGIN
    target_article := COALESCE(NEW.commercial_article_id, OLD.commercial_article_id);

    SELECT COALESCE(sum(percentage), 0)
      INTO total_pct
      FROM materials.article_composition
     WHERE commercial_article_id = target_article;

    IF total_pct > 100.0001 THEN
        RAISE EXCEPTION 'Composição do artigo % soma %, acima de 100%%', target_article, total_pct
            USING ERRCODE = '23514';
    END IF;

    RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_article_composition_total ON materials.article_composition;
CREATE CONSTRAINT TRIGGER trg_article_composition_total
AFTER INSERT OR UPDATE OR DELETE ON materials.article_composition
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION materials.enforce_article_composition_total();

CREATE OR REPLACE FUNCTION materials.validate_evidence_binding_subject()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    found_subject BOOLEAN;
BEGIN
    CASE NEW.subject_type
        WHEN 'commercial_article' THEN
            SELECT EXISTS (
                SELECT 1 FROM materials.commercial_article
                 WHERE tenant_id = NEW.tenant_id AND id = NEW.subject_id
            ) INTO found_subject;
        WHEN 'article_composition' THEN
            SELECT EXISTS (
                SELECT 1 FROM materials.article_composition
                 WHERE tenant_id = NEW.tenant_id AND id = NEW.subject_id
            ) INTO found_subject;
        WHEN 'material_application' THEN
            SELECT EXISTS (
                SELECT 1 FROM materials.material_application
                 WHERE tenant_id = NEW.tenant_id AND id = NEW.subject_id
            ) INTO found_subject;
        WHEN 'application_claim' THEN
            SELECT EXISTS (
                SELECT 1 FROM materials.application_claim
                 WHERE tenant_id = NEW.tenant_id AND id = NEW.subject_id
            ) INTO found_subject;
        ELSE
            found_subject := false;
    END CASE;

    IF NOT found_subject THEN
        RAISE EXCEPTION 'Objeto de evidência não existe no tenant: %/%', NEW.subject_type, NEW.subject_id
            USING ERRCODE = '23503';
    END IF;

    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_evidence_binding_subject ON materials.evidence_binding;
CREATE TRIGGER trg_validate_evidence_binding_subject
BEFORE INSERT OR UPDATE ON materials.evidence_binding
FOR EACH ROW EXECUTE FUNCTION materials.validate_evidence_binding_subject();

CREATE OR REPLACE FUNCTION materials.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END $$;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'catalog_source',
        'material_family',
        'material',
        'commercial_article',
        'article_composition',
        'material_application',
        'application_claim'
    ] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_updated_at ON materials.%I', table_name);
        EXECUTE format(
            'CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON materials.%I '
            'FOR EACH ROW EXECUTE FUNCTION materials.touch_updated_at()',
            table_name
        );
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION materials.audit_tenant_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    row_data JSONB;
    resource_id TEXT;
    active_tenant TEXT;
    actor_id TEXT;
BEGIN
    row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
    resource_id := row_data ->> 'id';
    active_tenant := row_data ->> 'tenant_id';
    actor_id := COALESCE(NULLIF(current_setting('app.user_id', true), ''), current_user);

    INSERT INTO public.audit_events (
        id,
        tenant_id,
        actor_id,
        action,
        resource_type,
        resource_id,
        metadata,
        occurred_at
    ) VALUES (
        gen_random_uuid()::text,
        active_tenant,
        actor_id,
        lower(TG_OP),
        'materials.' || TG_TABLE_NAME,
        resource_id,
        jsonb_build_object('schema', TG_TABLE_SCHEMA),
        now()
    );

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'commercial_article',
        'article_composition',
        'material_application',
        'application_claim',
        'evidence_binding'
    ] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_change ON materials.%I', table_name);
        EXECUTE format(
            'CREATE TRIGGER trg_audit_change AFTER INSERT OR UPDATE OR DELETE ON materials.%I '
            'FOR EACH ROW EXECUTE FUNCTION materials.audit_tenant_change()',
            table_name
        );
    END LOOP;
END $$;

-- ------------------------------------------------------------------
-- RLS tenant-aware, coerente com o Evidence OS
-- ------------------------------------------------------------------

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'commercial_article',
        'article_composition',
        'material_application',
        'application_claim',
        'evidence_binding'
    ] LOOP
        EXECUTE format('ALTER TABLE materials.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('ALTER TABLE materials.%I FORCE ROW LEVEL SECURITY', table_name);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON materials.%I', table_name);
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON materials.%I '
            'USING (tenant_id = current_setting(''app.tenant_id'', true)) '
            'WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true))',
            table_name
        );
    END LOOP;
END $$;

CREATE OR REPLACE VIEW materials.v_application_readiness
WITH (security_invoker = true) AS
SELECT
    ma.tenant_id,
    ma.id AS material_application_id,
    ma.sku_id,
    ct.vertical,
    ct.code AS component_code,
    ca.commercial_code,
    ma.batch_reference,
    ma.confidence,
    COALESCE(comp.composition_total_pct, 0) AS composition_total_pct,
    COALESCE(ev.evidence_count, 0) AS evidence_count,
    COALESCE(cl.claim_count, 0) AS claim_count,
    COALESCE(cl.blocked_claim_count, 0) AS blocked_claim_count,
    (ma.batch_reference IS NOT NULL) AS has_batch_reference,
    (COALESCE(comp.composition_total_pct, 0) BETWEEN 99.5 AND 100.0001) AS composition_complete,
    (COALESCE(ev.evidence_count, 0) > 0) AS has_evidence
FROM materials.material_application ma
JOIN materials.component_type ct ON ct.id = ma.component_type_id
JOIN materials.commercial_article ca ON ca.id = ma.commercial_article_id
LEFT JOIN LATERAL (
    SELECT sum(ac.percentage) AS composition_total_pct
    FROM materials.article_composition ac
    WHERE ac.tenant_id = ma.tenant_id
      AND ac.commercial_article_id = ma.commercial_article_id
) comp ON true
LEFT JOIN LATERAL (
    SELECT count(*) AS evidence_count
    FROM materials.evidence_binding eb
    WHERE eb.tenant_id = ma.tenant_id
      AND eb.subject_type = 'material_application'
      AND eb.subject_id = ma.id
      AND eb.relationship = 'supports'
) ev ON true
LEFT JOIN LATERAL (
    SELECT
        count(*) AS claim_count,
        count(*) FILTER (WHERE status IN ('unsupported', 'rejected', 'blocked', 'expired')) AS blocked_claim_count
    FROM materials.application_claim acl
    WHERE acl.tenant_id = ma.tenant_id
      AND acl.material_application_id = ma.id
) cl ON true;

INSERT INTO materials.schema_migration (
    migration_key,
    checksum_sha256,
    notes
) VALUES (
    '002_materials_knowledge_base_v0.2',
    NULL,
    'Catálogo compartilhado + aplicações tenant-aware integradas a organizations, skus e audit_events.'
)
ON CONFLICT (migration_key) DO NOTHING;

COMMIT;
