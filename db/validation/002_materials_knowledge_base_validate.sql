\set ON_ERROR_STOP on

BEGIN;

SELECT pg_advisory_xact_lock(hashtext('phyllos:materials-kb:validate:v0.2'));

DO $$
DECLARE
    actual_count INTEGER;
    rls_missing INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM materials.schema_migration
        WHERE migration_key = '002_materials_knowledge_base_v0.2'
    ) THEN
        RAISE EXCEPTION 'Migração Materials KB v0.2 não registrada';
    END IF;

    SELECT count(*) INTO actual_count FROM materials.catalog_source;
    IF actual_count < 8 THEN
        RAISE EXCEPTION 'Fontes insuficientes: esperado >= 8, encontrado %', actual_count;
    END IF;

    SELECT count(*) INTO actual_count FROM materials.material_family WHERE is_active;
    IF actual_count < 14 THEN
        RAISE EXCEPTION 'Famílias insuficientes: esperado >= 14, encontrado %', actual_count;
    END IF;

    SELECT count(*) INTO actual_count FROM materials.material WHERE is_active;
    IF actual_count < 14 THEN
        RAISE EXCEPTION 'Materiais canônicos insuficientes: esperado >= 14, encontrado %', actual_count;
    END IF;

    SELECT count(*) INTO actual_count FROM materials.component_type WHERE is_active;
    IF actual_count < 31 THEN
        RAISE EXCEPTION 'Componentes insuficientes: esperado >= 31, encontrado %', actual_count;
    END IF;

    SELECT count(*) INTO actual_count FROM materials.claim_type WHERE is_active;
    IF actual_count < 10 THEN
        RAISE EXCEPTION 'Claims insuficientes: esperado >= 10, encontrado %', actual_count;
    END IF;

    SELECT count(*) INTO actual_count FROM materials.certification_standard WHERE is_active;
    IF actual_count < 8 THEN
        RAISE EXCEPTION 'Certificações insuficientes: esperado >= 8, encontrado %', actual_count;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM materials.certification_claim_rule r
        JOIN materials.certification_standard s ON s.id = r.certification_id
        WHERE s.code = 'GRS'
          AND r.claim_context = 'business_to_business'
          AND r.minimum_content_pct = 20
    ) THEN
        RAISE EXCEPTION 'Regra GRS B2B de 20%% ausente';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM materials.certification_claim_rule r
        JOIN materials.certification_standard s ON s.id = r.certification_id
        WHERE s.code = 'GRS'
          AND r.claim_context = 'consumer_facing'
          AND r.minimum_content_pct = 50
    ) THEN
        RAISE EXCEPTION 'Regra GRS consumer-facing de 50%% ausente';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM materials.certification_claim_rule r
        JOIN materials.certification_standard s ON s.id = r.certification_id
        WHERE s.code = 'GOTS'
          AND r.claim_label = 'Made with organic'
          AND r.minimum_content_pct = 70
    ) THEN
        RAISE EXCEPTION 'Regra GOTS Made with organic de 70%% ausente';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM materials.certification_claim_rule r
        JOIN materials.certification_standard s ON s.id = r.certification_id
        WHERE s.code = 'GOTS'
          AND r.claim_label = 'Organic'
          AND r.minimum_content_pct = 95
    ) THEN
        RAISE EXCEPTION 'Regra GOTS Organic de 95%% ausente';
    END IF;

    SELECT count(*) INTO rls_missing
    FROM (VALUES
        ('commercial_article'),
        ('article_composition'),
        ('material_application'),
        ('application_claim'),
        ('evidence_binding')
    ) AS expected(table_name)
    LEFT JOIN pg_class c ON c.relname = expected.table_name
    LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'materials'
    WHERE c.oid IS NULL OR n.oid IS NULL OR NOT c.relrowsecurity OR NOT c.relforcerowsecurity;

    IF rls_missing > 0 THEN
        RAISE EXCEPTION 'RLS/FORCE RLS ausente em % tabela(s) tenant-aware', rls_missing;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM materials.article_composition
        GROUP BY tenant_id, commercial_article_id
        HAVING sum(percentage) > 100.0001
    ) THEN
        RAISE EXCEPTION 'Há artigo com composição acima de 100%%';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM materials.application_claim
        WHERE status IN ('approved_for_buyer', 'approved_for_publication')
          AND (reviewed_by IS NULL OR reviewed_at IS NULL)
    ) THEN
        RAISE EXCEPTION 'Há claim aprovado sem revisão registrada';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM materials.evidence_binding eb
        WHERE NOT (
            (eb.subject_type = 'commercial_article' AND EXISTS (
                SELECT 1 FROM materials.commercial_article x
                WHERE x.tenant_id = eb.tenant_id AND x.id = eb.subject_id
            )) OR
            (eb.subject_type = 'article_composition' AND EXISTS (
                SELECT 1 FROM materials.article_composition x
                WHERE x.tenant_id = eb.tenant_id AND x.id = eb.subject_id
            )) OR
            (eb.subject_type = 'material_application' AND EXISTS (
                SELECT 1 FROM materials.material_application x
                WHERE x.tenant_id = eb.tenant_id AND x.id = eb.subject_id
            )) OR
            (eb.subject_type = 'application_claim' AND EXISTS (
                SELECT 1 FROM materials.application_claim x
                WHERE x.tenant_id = eb.tenant_id AND x.id = eb.subject_id
            ))
        )
    ) THEN
        RAISE EXCEPTION 'Há vínculo de evidência órfão';
    END IF;
END $$;

SELECT
    (SELECT count(*) FROM materials.catalog_source) AS sources,
    (SELECT count(*) FROM materials.material_family WHERE is_active) AS material_families,
    (SELECT count(*) FROM materials.material WHERE is_active) AS canonical_materials,
    (SELECT count(*) FROM materials.component_type WHERE is_active AND vertical = 'apparel') AS apparel_components,
    (SELECT count(*) FROM materials.component_type WHERE is_active AND vertical = 'footwear') AS footwear_components,
    (SELECT count(*) FROM materials.certification_standard WHERE is_active) AS certification_standards,
    (SELECT count(*) FROM materials.claim_type WHERE is_active) AS claim_types,
    (SELECT count(*) FROM materials.evidence_requirement) AS evidence_requirements,
    (SELECT count(*) FROM materials.substance_of_concern WHERE is_active) AS substances_sample;

ROLLBACK;
