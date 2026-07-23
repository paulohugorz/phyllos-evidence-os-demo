\set ON_ERROR_STOP on

DO $$
DECLARE
  missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF to_regclass('materials.material') IS NULL THEN missing := array_append(missing, 'materials.material'); END IF;
  IF to_regclass('materials.commercial_article') IS NULL THEN missing := array_append(missing, 'materials.commercial_article'); END IF;
  IF to_regclass('materials.material_application') IS NULL THEN missing := array_append(missing, 'materials.material_application'); END IF;
  IF to_regclass('materials.v_material_application_api') IS NULL THEN missing := array_append(missing, 'materials.v_material_application_api'); END IF;
  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Objetos ausentes: %', array_to_string(missing, ', ');
  END IF;
END $$;

DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT count(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'materials'
    AND table_name = 'material_application'
    AND column_name IN ('application_snapshot', 'client_request_id', 'notes_pt', 'version', 'archived_at');
  IF column_count <> 5 THEN
    RAISE EXCEPTION 'Colunas da Materials API incompletas em material_application: %/5', column_count;
  END IF;
END $$;

SELECT
  (SELECT count(*) FROM materials.material_family WHERE is_active) AS active_families,
  (SELECT count(*) FROM materials.material WHERE is_active) AS active_materials,
  (SELECT count(*) FROM materials.component_type WHERE is_active) AS active_components,
  (SELECT count(*) FROM materials.schema_migration WHERE migration_key = '003_materials_api_v1') AS migration_marker;
