import { createHash, randomUUID } from "node:crypto";
import { MaterialsRepository, MaterialsRepositoryError } from "./materials-repository.js";

const API_PREFIX = "/api/v1/materials";
const WRITE_ROLES = new Set(["phyllos_admin", "client_admin", "analyst"]);
const REVIEW_ROLES = new Set(["phyllos_admin", "client_admin", "reviewer"]);
const VERTICALS = new Set(["apparel", "footwear", "accessory", "packaging"]);
const CONFIDENCE_STATES = new Set([
  "unknown", "declared_by_brand", "declared_by_supplier", "documented",
  "laboratory_tested", "reviewed", "validated", "conflicting", "expired", "superseded",
]);
const APPLICATION_STATUSES = new Set(["draft", "active", "archived"]);

export class MaterialsApiError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.name = "MaterialsApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const text = (value, fallback = "") => typeof value === "string" ? value.trim() : fallback;
const optionalText = (value) => {
  const normalized = text(value);
  return normalized || null;
};
const numberOrNull = (value, field, { minimum = 0, maximum = Number.POSITIVE_INFINITY } = {}) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new MaterialsApiError(400, "INVALID_INPUT", `${field} inválido`, { field });
  }
  return parsed;
};
const integer = (value, fallback, { minimum = 0, maximum = 500 } = {}) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new MaterialsApiError(400, "INVALID_INPUT", "Valor inteiro inválido");
  }
  return Math.min(parsed, maximum);
};
const required = (value, field) => {
  const normalized = text(value);
  if (!normalized) throw new MaterialsApiError(400, "INVALID_INPUT", `${field} é obrigatório`, { field });
  return normalized;
};
const requireRole = (context, allowed) => {
  if (!allowed.has(context.role)) throw new MaterialsApiError(403, "ACCESS_DENIED", "Perfil sem permissão para esta operação");
};
const stableHash = (value) => createHash("sha256").update(JSON.stringify(value, Object.keys(value || {}).sort())).digest("hex");

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new MaterialsApiError(400, "INVALID_JSON", "Corpo JSON inválido");
  }
}

function mapPgError(error) {
  if (error instanceof MaterialsApiError) return error;
  if (error instanceof MaterialsRepositoryError) {
    const status = error.code === "ACCESS_DENIED" ? 403
      : error.code === "NOT_FOUND" ? 404
        : 400;
    return new MaterialsApiError(status, error.code, error.message, error.details);
  }
  const byCode = {
    "23503": [409, "REFERENCE_CONFLICT", "Referência inexistente ou pertencente a outro tenant"],
    "23505": [409, "DUPLICATE_RESOURCE", "Registro já existente"],
    "23514": [422, "INTEGRITY_VIOLATION", "Regra de integridade não atendida"],
    "22P02": [400, "INVALID_IDENTIFIER", "Identificador ou valor inválido"],
    "42501": [403, "ACCESS_DENIED", "Operação não autorizada pelo banco"],
    "42P01": [503, "MATERIALS_SCHEMA_NOT_READY", "Schema da Materials Knowledge Base não aplicado"],
  };
  if (error?.code && byCode[error.code]) {
    const [status, code, message] = byCode[error.code];
    return new MaterialsApiError(status, code, message, { database_code: error.code });
  }
  return new MaterialsApiError(500, "MATERIALS_API_FAILURE", "Falha interna na Materials API");
}

function normalizeSku(row) {
  const raw = row.raw || row.sku || {};
  const id = String(row.id || raw.id || "");
  const code = raw.external_code || raw.externalCode || raw.sku_code || raw.skuCode || raw.code || id;
  const name = raw.name || raw.title || raw.product_name || raw.productName || code;
  const category = raw.category || raw.product_category || raw.productCategory || null;
  const explicitVertical = raw.vertical || raw.product_vertical || raw.productVertical || null;
  const inferred = /sapato|t[eê]nis|sand[aá]lia|bota|cal[cç]ado/i.test(`${name} ${category || ""}`) ? "footwear" : "apparel";
  return {
    id,
    code: String(code),
    name: String(name),
    category: category ? String(category) : null,
    vertical: VERTICALS.has(explicitVertical) ? explicitVertical : inferred,
    raw,
  };
}

function snapshotFromArticle(row) {
  return {
    snapshot_version: 1,
    captured_at: new Date().toISOString(),
    commercial_article: {
      id: row.id,
      commercial_code: row.commercial_code,
      commercial_name: row.commercial_name,
      supplier_organization_id: row.supplier_organization_id,
      supplier_name: row.supplier_name,
      weight_gsm: row.weight_gsm,
      width_cm: row.width_cm,
      color: row.color,
      finish: row.finish,
      status: row.status,
    },
    material: {
      id: row.primary_material_id,
      canonical_name_pt: row.material_name_pt,
      family_name_pt: row.family_name_pt,
      base_origin: row.base_origin,
      structure: row.structure,
    },
    composition: row.composition || [],
  };
}

export function createMaterialsApi({
  pool: injectedPool = null,
  connectionString = process.env.DATABASE_URL,
  sslMode = process.env.PGSSL || "auto",
  env = process.env,
  idFactory = randomUUID,
} = {}) {
  let pool = injectedPool;
  let ownsPool = false;
  let repository = injectedPool ? new MaterialsRepository(injectedPool) : null;

  async function getPool() {
    if (pool) return pool;
    if (!connectionString) throw new MaterialsApiError(503, "DATABASE_URL_REQUIRED", "DATABASE_URL não configurada");
    const { Pool } = await import("pg");
    const ssl = sslMode === "require" ? { rejectUnauthorized: false }
      : sslMode === "disable" ? false : undefined;
    pool = new Pool({
      connectionString,
      ssl,
      max: 6,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    ownsPool = true;
    repository = new MaterialsRepository(pool);
    return pool;
  }

  function context(req, { catalogOnly = false } = {}) {
    const trustHeaders = env.MATERIALS_API_TRUST_HEADERS === "true";
    const header = (name) => trustHeaders ? text(req.headers?.[name]) : "";
    const tenantId = header("x-phyllos-tenant-id") || text(env.MATERIALS_TENANT_ID);
    const userId = header("x-phyllos-user-id") || text(env.MATERIALS_USER_ID);
    const role = header("x-phyllos-role") || text(env.MATERIALS_ROLE);
    if (catalogOnly && !tenantId) {
      return { tenantId: "catalog-public", userId: "catalog-reader", role: "viewer", tenantConfigured: false };
    }
    if (!tenantId || !userId || !role) {
      throw new MaterialsApiError(
        503,
        "MATERIALS_CONTEXT_REQUIRED",
        "Configure MATERIALS_TENANT_ID, MATERIALS_USER_ID e MATERIALS_ROLE no serviço",
      );
    }
    return { tenantId, userId, role, tenantConfigured: true };
  }

  async function transaction(req, operation, options = {}) {
    await getPool();
    const activeContext = context(req, options);
    return repository.withTenantTransaction(activeContext, operation);
  }

  async function schemaStatus(req) {
    if (!connectionString && !injectedPool) {
      return {
        version: "1.0.0",
        available: false,
        database_connected: false,
        schema_ready: false,
        tenant_configured: false,
        production_ready: false,
        reason: "DATABASE_URL não configurada",
      };
    }
    try {
      const activePool = await getPool();
      const relations = await activePool.query(`
        SELECT
          to_regclass('materials.material') IS NOT NULL AS catalog_ready,
          to_regclass('materials.commercial_article') IS NOT NULL AS articles_ready,
          to_regclass('materials.material_application') IS NOT NULL AS applications_ready,
          to_regclass('materials.v_material_application_api') IS NOT NULL AS api_view_ready
      `);
      const flags = relations.rows[0] || {};
      const schemaReady = Object.values(flags).every(Boolean);
      let tenantConfigured = true;
      try { context(req); } catch { tenantConfigured = false; }
      let canonicalMaterials = 0;
      let commercialArticles = 0;
      let applications = 0;
      if (schemaReady) {
        canonicalMaterials = Number((await activePool.query("SELECT count(*)::int AS count FROM materials.material WHERE is_active")).rows[0]?.count || 0);
        if (tenantConfigured) {
          const counts = await transaction(req, async (client, ctx) => {
            const result = await client.query(`
              SELECT
                (SELECT count(*)::int FROM materials.commercial_article WHERE tenant_id=$1 AND status <> 'archived') AS articles,
                (SELECT count(*)::int FROM materials.material_application WHERE tenant_id=$1 AND status <> 'archived') AS applications
            `, [ctx.tenantId]);
            return result.rows[0];
          });
          commercialArticles = Number(counts?.articles || 0);
          applications = Number(counts?.applications || 0);
        }
      }
      return {
        version: "1.0.0",
        available: schemaReady,
        database_connected: true,
        schema_ready: schemaReady,
        tenant_configured: tenantConfigured,
        production_ready: false,
        runtime_ready: schemaReady && tenantConfigured,
        canonical_materials: canonicalMaterials,
        commercial_articles: commercialArticles,
        material_applications: applications,
        persistence: "postgresql",
        evidence_bridge: "textual_reference_pending_canonical_evidence_store",
        authentication: trustDescription(env),
      };
    } catch (error) {
      const mapped = mapPgError(error);
      return {
        version: "1.0.0",
        available: false,
        database_connected: false,
        schema_ready: false,
        tenant_configured: false,
        production_ready: false,
        reason: mapped.message,
        code: mapped.code,
      };
    }
  }

  async function listFilters(req) {
    return transaction(req, async (client) => {
      const [verticals, families, origins, structures, confidences] = await Promise.all([
        client.query(`SELECT DISTINCT vertical::text AS value FROM materials.material_vertical ORDER BY 1`),
        client.query(`SELECT code AS value, name_pt AS label FROM materials.material_family WHERE is_active ORDER BY name_pt`),
        client.query(`SELECT DISTINCT base_origin::text AS value FROM materials.material WHERE is_active ORDER BY 1`),
        client.query(`SELECT DISTINCT structure AS value FROM materials.material WHERE is_active AND structure IS NOT NULL ORDER BY 1`),
        client.query(`SELECT unnest(enum_range(NULL::materials.confidence_state))::text AS value`),
      ]);
      const verticalLabels = { apparel: "Confecção", footwear: "Calçados", accessory: "Acessórios", packaging: "Embalagem" };
      const originLabels = {
        plant: "Vegetal", animal: "Animal", regenerated_cellulosic: "Celulósica regenerada",
        fossil_synthetic: "Sintética fóssil", mineral: "Mineral", mixed: "Mista", other: "Outra",
      };
      return {
        verticals: verticals.rows.map((row) => ({ value: row.value, label: verticalLabels[row.value] || row.value })),
        families: families.rows,
        origins: origins.rows.map((row) => ({ value: row.value, label: originLabels[row.value] || row.value })),
        structures: structures.rows.map((row) => ({ value: row.value, label: row.value })),
        evidence: confidences.rows.map((row) => ({ value: row.value, label: row.value })),
        certifications: [],
        claims: [],
        capabilities: {
          certification_filter: false,
          claim_filter: false,
          reason: "A migration atual ainda não relaciona material canônico diretamente a certificações ou claims.",
        },
      };
    }, { catalogOnly: true });
  }

  async function listFamilies(req, url) {
    await getPool();
    return repository.listFamilies(context(req, { catalogOnly: true }), { vertical: optionalText(url.searchParams.get("vertical")) });
  }

  async function listComponents(req, url) {
    const vertical = optionalText(url.searchParams.get("vertical"));
    if (vertical && !VERTICALS.has(vertical)) throw new MaterialsApiError(400, "INVALID_VERTICAL", "Vertical inválida");
    return transaction(req, async (client) => {
      const result = await client.query(`
        SELECT id, code, name_pt, name_en, vertical::text, description_pt,
               is_critical AS required, is_active
        FROM materials.component_type
        WHERE is_active AND ($1::materials.product_vertical IS NULL OR vertical=$1::materials.product_vertical)
        ORDER BY vertical, is_critical DESC, name_pt
      `, [vertical]);
      return result.rows;
    }, { catalogOnly: true });
  }

  async function searchCatalog(req, url) {
    const query = text(url.searchParams.get("query"));
    const vertical = optionalText(url.searchParams.get("vertical"));
    const family = optionalText(url.searchParams.get("family"));
    const origin = optionalText(url.searchParams.get("origin"));
    const structure = optionalText(url.searchParams.get("structure"));
    const evidence = optionalText(url.searchParams.get("evidence"));
    const limit = integer(url.searchParams.get("limit"), 50, { minimum: 1, maximum: 120 });
    const offset = integer(url.searchParams.get("cursor"), 0, { minimum: 0, maximum: 1000000 });
    if (vertical && !VERTICALS.has(vertical)) throw new MaterialsApiError(400, "INVALID_VERTICAL", "Vertical inválida");
    if (evidence && !CONFIDENCE_STATES.has(evidence)) throw new MaterialsApiError(400, "INVALID_CONFIDENCE", "Estado de evidência inválido");

    return transaction(req, async (client, ctx) => {
      const result = await client.query(`
        WITH catalog AS (
          SELECT
            m.id,
            mf.code AS family_code,
            mf.name_pt AS family_name_pt,
            m.canonical_name_pt,
            m.canonical_name_en,
            m.technical_name,
            m.base_origin::text,
            m.structure,
            cs.name_pt AS source_label,
            cs.last_verified_at,
            COALESCE(lv.confidence::text, 'unknown') AS evidence_status,
            COALESCE(array_agg(DISTINCT mv.vertical::text) FILTER (WHERE mv.vertical IS NOT NULL), ARRAY[]::text[]) AS verticals,
            COALESCE(array_agg(DISTINCT ma.alias) FILTER (WHERE ma.alias IS NOT NULL), ARRAY[]::text[]) AS aliases,
            count(DISTINCT ca.id) FILTER (WHERE ca.status <> 'archived')::int AS article_count
          FROM materials.material m
          JOIN materials.material_family mf ON mf.id=m.family_id
          LEFT JOIN materials.catalog_source cs ON cs.id=m.source_id
          LEFT JOIN materials.material_alias ma ON ma.material_id=m.id
          LEFT JOIN materials.material_vertical mv ON mv.material_id=m.id
          LEFT JOIN LATERAL (
            SELECT confidence FROM materials.material_version
            WHERE material_id=m.id ORDER BY version_number DESC LIMIT 1
          ) lv ON true
          LEFT JOIN materials.commercial_article ca
            ON ca.tenant_id=$7 AND ca.primary_material_id=m.id
          WHERE m.is_active AND mf.is_active
            AND ($1='' OR m.canonical_name_pt ILIKE '%'||$1||'%' OR COALESCE(m.canonical_name_en,'') ILIKE '%'||$1||'%'
                 OR COALESCE(m.technical_name,'') ILIKE '%'||$1||'%' OR EXISTS (
                   SELECT 1 FROM materials.material_alias a WHERE a.material_id=m.id AND a.alias ILIKE '%'||$1||'%'
                 ))
            AND ($2::materials.product_vertical IS NULL OR EXISTS (
              SELECT 1 FROM materials.material_vertical x WHERE x.material_id=m.id AND x.vertical=$2::materials.product_vertical
            ))
            AND ($3::text IS NULL OR mf.code=$3)
            AND ($4::materials.material_base_origin IS NULL OR m.base_origin=$4::materials.material_base_origin)
            AND ($5::text IS NULL OR m.structure=$5)
            AND ($6::materials.confidence_state IS NULL OR COALESCE(lv.confidence, 'unknown'::materials.confidence_state)=$6::materials.confidence_state)
          GROUP BY m.id, mf.code, mf.name_pt, cs.name_pt, cs.last_verified_at, lv.confidence
        )
        SELECT *, count(*) OVER()::int AS total_count
        FROM catalog
        ORDER BY canonical_name_pt
        LIMIT $8 OFFSET $9
      `, [query, vertical, family, origin, structure, evidence, ctx.tenantId, limit + 1, offset]);
      const hasMore = result.rows.length > limit;
      const rows = result.rows.slice(0, limit);
      const total = Number(rows[0]?.total_count || 0);
      return {
        items: rows.map(({ total_count: _totalCount, ...row }) => row),
        total,
        next_cursor: hasMore ? String(offset + limit) : null,
      };
    }, { catalogOnly: true });
  }

  async function materialDetail(req, materialId) {
    return transaction(req, async (client, ctx) => {
      const base = await client.query(`
        SELECT
          m.id, mf.code AS family_code, mf.name_pt AS family_name_pt,
          m.canonical_name_pt, m.canonical_name_en, m.technical_name,
          m.base_origin::text, m.structure, m.iso_reference,
          cs.name_pt AS source_label, cs.source_url, cs.publisher,
          cs.last_verified_at, cs.notes_pt AS source_notes,
          COALESCE(lv.confidence::text, 'unknown') AS evidence_status,
          COALESCE(lv.snapshot, '{}'::jsonb) AS latest_snapshot,
          COALESCE(array_agg(DISTINCT mv.vertical::text) FILTER (WHERE mv.vertical IS NOT NULL), ARRAY[]::text[]) AS verticals,
          COALESCE(array_agg(DISTINCT ma.alias) FILTER (WHERE ma.alias IS NOT NULL), ARRAY[]::text[]) AS aliases
        FROM materials.material m
        JOIN materials.material_family mf ON mf.id=m.family_id
        LEFT JOIN materials.catalog_source cs ON cs.id=m.source_id
        LEFT JOIN materials.material_alias ma ON ma.material_id=m.id
        LEFT JOIN materials.material_vertical mv ON mv.material_id=m.id
        LEFT JOIN LATERAL (
          SELECT confidence, snapshot FROM materials.material_version
          WHERE material_id=m.id ORDER BY version_number DESC LIMIT 1
        ) lv ON true
        WHERE m.id=$1 AND m.is_active
        GROUP BY m.id, mf.code, mf.name_pt, cs.name_pt, cs.source_url, cs.publisher,
                 cs.last_verified_at, cs.notes_pt, lv.confidence, lv.snapshot
      `, [materialId]);
      if (!base.rows[0]) throw new MaterialsApiError(404, "MATERIAL_NOT_FOUND", "Material não encontrado");
      const [processes, articles] = await Promise.all([
        client.query(`
          SELECT p.id, p.code, p.name_pt, p.name_en, p.stage, mp.notes_pt
          FROM materials.material_process mp
          JOIN materials.manufacturing_process p ON p.id=mp.process_id
          WHERE mp.material_id=$1 AND p.is_active ORDER BY p.stage, p.name_pt
        `, [materialId]),
        articleQuery(client, ctx.tenantId, { materialId, limit: 100 }),
      ]);
      return {
        ...base.rows[0],
        processes: processes.rows,
        commercial_articles: articles.rows,
        certifications: [],
        claims: [],
        limitations_pt: "O material canônico organiza conhecimento técnico; composição, origem, certificação e claims dependem do artigo comercial e das evidências do lote.",
      };
    }, { catalogOnly: true });
  }

  async function listOrganizations(req, url) {
    const query = text(url.searchParams.get("query"));
    return transaction(req, async (client, ctx) => {
      const result = await client.query(`
        SELECT
          o.id,
          COALESCE(to_jsonb(o)->>'name', o.id) AS name,
          COALESCE(to_jsonb(o)->>'type', to_jsonb(o)->>'organization_type', 'organization') AS type,
          to_jsonb(o) AS raw
        FROM public.organizations o
        WHERE o.tenant_id=$1
          AND ($2='' OR COALESCE(to_jsonb(o)->>'name','') ILIKE '%'||$2||'%' OR o.id ILIKE '%'||$2||'%')
        ORDER BY COALESCE(to_jsonb(o)->>'name', o.id)
        LIMIT 200
      `, [ctx.tenantId, query]);
      return result.rows;
    });
  }

  async function listSkus(req, url) {
    const query = text(url.searchParams.get("query"));
    return transaction(req, async (client, ctx) => {
      const result = await client.query(`
        SELECT s.id, to_jsonb(s) AS raw
        FROM public.skus s
        WHERE s.tenant_id=$1
          AND ($2='' OR to_jsonb(s)::text ILIKE '%'||$2||'%')
        ORDER BY COALESCE(to_jsonb(s)->>'name', to_jsonb(s)->>'external_code', s.id)
        LIMIT 500
      `, [ctx.tenantId, query]);
      return result.rows.map(normalizeSku);
    });
  }

  async function listArticles(req, url) {
    const query = text(url.searchParams.get("query"));
    const vertical = optionalText(url.searchParams.get("vertical"));
    const materialId = optionalText(url.searchParams.get("material_id"));
    const status = optionalText(url.searchParams.get("status"));
    const limit = integer(url.searchParams.get("limit"), 100, { minimum: 1, maximum: 200 });
    if (vertical && !VERTICALS.has(vertical)) throw new MaterialsApiError(400, "INVALID_VERTICAL", "Vertical inválida");
    return transaction(req, async (client, ctx) => {
      const result = await articleQuery(client, ctx.tenantId, { query, vertical, materialId, status, limit });
      return result.rows;
    });
  }

  async function getArticle(req, articleId) {
    return transaction(req, async (client, ctx) => {
      const result = await articleQuery(client, ctx.tenantId, { articleId, limit: 1 });
      if (!result.rows[0]) throw new MaterialsApiError(404, "ARTICLE_NOT_FOUND", "Artigo comercial não encontrado");
      return result.rows[0];
    });
  }

  async function createArticle(req, input) {
    const activeContext = context(req);
    requireRole(activeContext, WRITE_ROLES);
    const requestId = required(req.headers?.["idempotency-key"], "Idempotency-Key");
    const supplierOrganizationId = required(input.supplierOrganizationId, "supplierOrganizationId");
    const primaryMaterialId = required(input.primaryMaterialId, "primaryMaterialId");
    const commercialCode = required(input.commercialCode, "commercialCode");
    const initialPercentage = numberOrNull(input.primaryPercentage, "primaryPercentage", { minimum: 0.0001, maximum: 100 });
    const confidence = optionalText(input.confidence) || "unknown";
    if (!CONFIDENCE_STATES.has(confidence)) throw new MaterialsApiError(400, "INVALID_CONFIDENCE", "Confiança inválida");

    return transaction(req, async (client, ctx) => {
      const existing = await client.query(`
        SELECT id FROM materials.commercial_article
        WHERE tenant_id=$1 AND client_request_id=$2
      `, [ctx.tenantId, requestId]);
      if (existing.rows[0]) {
        return (await articleQuery(client, ctx.tenantId, { articleId: existing.rows[0].id, limit: 1 })).rows[0];
      }
      const insert = await client.query(`
        INSERT INTO materials.commercial_article (
          tenant_id, supplier_organization_id, primary_material_id,
          commercial_code, commercial_name, gtin, hs_code, pefcr_category,
          weight_gsm, width_cm, color, finish, status, created_by, client_request_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        RETURNING id
      `, [
        ctx.tenantId, supplierOrganizationId, primaryMaterialId, commercialCode,
        optionalText(input.commercialName), optionalText(input.gtin), optionalText(input.hsCode), optionalText(input.pefcrCategory),
        numberOrNull(input.weightGsm, "weightGsm"), numberOrNull(input.widthCm, "widthCm"),
        optionalText(input.color), optionalText(input.finish), APPLICATION_STATUSES.has(input.status) ? input.status : "draft",
        ctx.userId, requestId,
      ]);
      const articleId = insert.rows[0].id;
      if (initialPercentage) {
        await client.query(`
          INSERT INTO materials.article_composition (
            tenant_id, commercial_article_id, constituent_material_id, percentage,
            tolerance_pct, feedstock_type, declaration_basis, confidence, created_by
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (commercial_article_id, constituent_material_id, feedstock_type)
          DO UPDATE SET percentage=EXCLUDED.percentage, confidence=EXCLUDED.confidence, updated_at=now()
        `, [
          ctx.tenantId, articleId, primaryMaterialId, initialPercentage,
          numberOrNull(input.tolerancePct, "tolerancePct", { minimum: 0, maximum: 100 }) || 0,
          optionalText(input.feedstockType) || "unknown", optionalText(input.declarationBasis), confidence, ctx.userId,
        ]);
      }
      return (await articleQuery(client, ctx.tenantId, { articleId, limit: 1 })).rows[0];
    });
  }

  async function addComposition(req, articleId, input) {
    const activeContext = context(req);
    requireRole(activeContext, WRITE_ROLES);
    const materialId = required(input.constituentMaterialId, "constituentMaterialId");
    const percentage = numberOrNull(input.percentage, "percentage", { minimum: 0.0001, maximum: 100 });
    const confidence = optionalText(input.confidence) || "unknown";
    if (!CONFIDENCE_STATES.has(confidence)) throw new MaterialsApiError(400, "INVALID_CONFIDENCE", "Confiança inválida");
    return transaction(req, async (client, ctx) => {
      const result = await client.query(`
        INSERT INTO materials.article_composition (
          tenant_id, commercial_article_id, constituent_material_id, percentage,
          tolerance_pct, feedstock_type, declaration_basis, confidence, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (commercial_article_id, constituent_material_id, feedstock_type)
        DO UPDATE SET percentage=EXCLUDED.percentage, tolerance_pct=EXCLUDED.tolerance_pct,
                      declaration_basis=EXCLUDED.declaration_basis, confidence=EXCLUDED.confidence,
                      updated_at=now()
        RETURNING *
      `, [
        ctx.tenantId, articleId, materialId, percentage,
        numberOrNull(input.tolerancePct, "tolerancePct", { minimum: 0, maximum: 100 }) || 0,
        optionalText(input.feedstockType) || "unknown", optionalText(input.declarationBasis), confidence, ctx.userId,
      ]);
      return result.rows[0];
    });
  }

  async function listApplications(req, skuId, url) {
    const includeArchived = url.searchParams.get("include_archived") === "true";
    return transaction(req, async (client, ctx) => {
      const result = await client.query(`
        SELECT * FROM materials.v_material_application_api
        WHERE tenant_id=$1 AND sku_id=$2 AND ($3 OR status <> 'archived')
        ORDER BY is_critical DESC, component_name_pt, updated_at DESC
      `, [ctx.tenantId, skuId, includeArchived]);
      return result.rows;
    });
  }

  async function createApplication(req, skuId, input) {
    const activeContext = context(req);
    requireRole(activeContext, WRITE_ROLES);
    const requestId = required(req.headers?.["idempotency-key"], "Idempotency-Key");
    const componentTypeId = required(input.componentTypeId, "componentTypeId");
    const commercialArticleId = required(input.commercialArticleId, "commercialArticleId");
    const confidence = optionalText(input.confidence) || "unknown";
    if (!CONFIDENCE_STATES.has(confidence)) throw new MaterialsApiError(400, "INVALID_CONFIDENCE", "Confiança inválida");
    return transaction(req, async (client, ctx) => {
      const existing = await client.query(`
        SELECT id FROM materials.material_application
        WHERE tenant_id=$1 AND client_request_id=$2
      `, [ctx.tenantId, requestId]);
      if (existing.rows[0]) return fetchApplicationRow(client, ctx.tenantId, existing.rows[0].id);
      const article = await articleQuery(client, ctx.tenantId, { articleId: commercialArticleId, limit: 1 });
      if (!article.rows[0]) throw new MaterialsApiError(404, "ARTICLE_NOT_FOUND", "Artigo comercial não encontrado");
      const snapshot = snapshotFromArticle(article.rows[0]);
      const insert = await client.query(`
        INSERT INTO materials.material_application (
          tenant_id, sku_id, component_type_id, commercial_article_id,
          batch_reference, quantity, quantity_unit, confidence, status,
          created_by, application_snapshot, notes_pt, client_request_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13)
        RETURNING id
      `, [
        ctx.tenantId, skuId, componentTypeId, commercialArticleId,
        optionalText(input.batchReference), numberOrNull(input.quantity, "quantity"), optionalText(input.quantityUnit),
        confidence, APPLICATION_STATUSES.has(input.status) ? input.status : "active", ctx.userId,
        JSON.stringify(snapshot), optionalText(input.notesPt), requestId,
      ]);
      const applicationId = insert.rows[0].id;
      await setFrontendEvidence(client, ctx, applicationId, input.evidenceReference, idFactory);
      return fetchApplicationRow(client, ctx.tenantId, applicationId);
    });
  }

  async function updateApplication(req, skuId, applicationId, input) {
    const activeContext = context(req);
    requireRole(activeContext, WRITE_ROLES);
    const expectedVersion = Number(String(req.headers?.["if-match"] || input.version || "").replace(/^W\//, "").replace(/^"|"$/g, ""));
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw new MaterialsApiError(428, "EXPECTED_VERSION_REQUIRED", "If-Match ou version é obrigatório");
    }
    const confidence = optionalText(input.confidence);
    if (confidence && !CONFIDENCE_STATES.has(confidence)) throw new MaterialsApiError(400, "INVALID_CONFIDENCE", "Confiança inválida");
    return transaction(req, async (client, ctx) => {
      const current = await fetchApplicationRow(client, ctx.tenantId, applicationId);
      if (!current || current.sku_id !== skuId) throw new MaterialsApiError(404, "APPLICATION_NOT_FOUND", "Aplicação não encontrada");
      if (Number(current.version) !== expectedVersion) {
        throw new MaterialsApiError(409, "APPLICATION_VERSION_CONFLICT", "A aplicação foi alterada por outra operação", {
          expected_version: expectedVersion, current_version: Number(current.version),
        });
      }
      const nextArticleId = optionalText(input.commercialArticleId) || current.commercial_article_id;
      let snapshot = current.application_snapshot || {};
      if (nextArticleId !== current.commercial_article_id) {
        const article = await articleQuery(client, ctx.tenantId, { articleId: nextArticleId, limit: 1 });
        if (!article.rows[0]) throw new MaterialsApiError(404, "ARTICLE_NOT_FOUND", "Artigo comercial não encontrado");
        snapshot = snapshotFromArticle(article.rows[0]);
      }
      const update = await client.query(`
        UPDATE materials.material_application
        SET component_type_id=COALESCE($4, component_type_id),
            commercial_article_id=$5,
            batch_reference=$6,
            quantity=$7,
            quantity_unit=$8,
            confidence=COALESCE($9::materials.confidence_state, confidence),
            status=COALESCE($10, status),
            notes_pt=$11,
            application_snapshot=$12::jsonb,
            version=version+1,
            archived_at=CASE WHEN COALESCE($10,status)='archived' THEN COALESCE(archived_at,now()) ELSE NULL END,
            updated_at=now()
        WHERE tenant_id=$1 AND sku_id=$2 AND id=$3 AND version=$13
        RETURNING id
      `, [
        ctx.tenantId, skuId, applicationId, optionalText(input.componentTypeId), nextArticleId,
        input.batchReference === undefined ? current.batch_reference : optionalText(input.batchReference),
        input.quantity === undefined ? current.quantity : numberOrNull(input.quantity, "quantity"),
        input.quantityUnit === undefined ? current.quantity_unit : optionalText(input.quantityUnit),
        confidence, APPLICATION_STATUSES.has(input.status) ? input.status : null,
        input.notesPt === undefined ? current.notes_pt : optionalText(input.notesPt),
        JSON.stringify(snapshot), expectedVersion,
      ]);
      if (!update.rows[0]) throw new MaterialsApiError(409, "APPLICATION_VERSION_CONFLICT", "A aplicação mudou durante a atualização");
      if (Object.hasOwn(input, "evidenceReference")) {
        await setFrontendEvidence(client, ctx, applicationId, input.evidenceReference, idFactory);
      }
      return fetchApplicationRow(client, ctx.tenantId, applicationId);
    });
  }

  async function archiveApplication(req, skuId, applicationId, input = {}) {
    return updateApplication(req, skuId, applicationId, { ...input, status: "archived" });
  }

  async function listClaims(req) {
    return transaction(req, async (client) => {
      const result = await client.query(`
        SELECT id, code, name_pt, name_en, category, description_pt
        FROM materials.claim_type WHERE is_active ORDER BY category, name_pt
      `);
      return result.rows;
    }, { catalogOnly: true });
  }

  async function createApplicationClaim(req, applicationId, input) {
    const activeContext = context(req);
    requireRole(activeContext, WRITE_ROLES);
    const claimTypeId = required(input.claimTypeId, "claimTypeId");
    return transaction(req, async (client, ctx) => {
      const result = await client.query(`
        INSERT INTO materials.application_claim (
          tenant_id, material_application_id, claim_type_id,
          claim_text_pt, claim_text_en, status, limitations_pt,
          valid_from, valid_until, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6::materials.claim_status,$7,$8,$9,$10)
        ON CONFLICT (material_application_id, claim_type_id)
        DO UPDATE SET claim_text_pt=EXCLUDED.claim_text_pt, claim_text_en=EXCLUDED.claim_text_en,
                      status=EXCLUDED.status, limitations_pt=EXCLUDED.limitations_pt,
                      valid_from=EXCLUDED.valid_from, valid_until=EXCLUDED.valid_until, updated_at=now()
        RETURNING *
      `, [
        ctx.tenantId, applicationId, claimTypeId, optionalText(input.claimTextPt), optionalText(input.claimTextEn),
        optionalText(input.status) || "draft", optionalText(input.limitationsPt),
        optionalText(input.validFrom), optionalText(input.validUntil), ctx.userId,
      ]);
      return result.rows[0];
    });
  }

  async function reviewClaim(req, claimId, input) {
    const activeContext = context(req);
    requireRole(activeContext, REVIEW_ROLES);
    const status = required(input.status, "status");
    return transaction(req, async (client, ctx) => {
      const approved = ["approved_for_buyer", "approved_for_publication"].includes(status);
      const result = await client.query(`
        UPDATE materials.application_claim
        SET status=$3::materials.claim_status,
            limitations_pt=$4,
            reviewed_by=CASE WHEN $5 THEN $2 ELSE reviewed_by END,
            reviewed_at=CASE WHEN $5 THEN now() ELSE reviewed_at END,
            updated_at=now()
        WHERE tenant_id=$1 AND id=$6
        RETURNING *
      `, [ctx.tenantId, ctx.userId, status, optionalText(input.limitationsPt), approved, claimId]);
      if (!result.rows[0]) throw new MaterialsApiError(404, "CLAIM_NOT_FOUND", "Claim não encontrado");
      return result.rows[0];
    });
  }

  async function handle({ req, res, url, json }) {
    if (!url.pathname.startsWith(API_PREFIX)) return false;
    try {
      if (req.method === "GET" && url.pathname === `${API_PREFIX}/status`) {
        json(res, 200, await schemaStatus(req)); return true;
      }
      if (req.method === "GET" && url.pathname === `${API_PREFIX}/filters`) {
        json(res, 200, await listFilters(req)); return true;
      }
      if (req.method === "GET" && url.pathname === `${API_PREFIX}/families`) {
        json(res, 200, { items: await listFamilies(req, url) }); return true;
      }
      if (req.method === "GET" && url.pathname === `${API_PREFIX}/component-types`) {
        json(res, 200, { items: await listComponents(req, url) }); return true;
      }
      if (req.method === "GET" && url.pathname === `${API_PREFIX}/catalog`) {
        json(res, 200, await searchCatalog(req, url)); return true;
      }
      const catalogDetail = url.pathname.match(/^\/api\/v1\/materials\/catalog\/([^/]+)$/);
      if (req.method === "GET" && catalogDetail) {
        json(res, 200, await materialDetail(req, decodeURIComponent(catalogDetail[1]))); return true;
      }
      if (req.method === "GET" && url.pathname === `${API_PREFIX}/organizations`) {
        json(res, 200, { items: await listOrganizations(req, url) }); return true;
      }
      if (req.method === "GET" && url.pathname === `${API_PREFIX}/skus`) {
        json(res, 200, { items: await listSkus(req, url) }); return true;
      }
      if (req.method === "GET" && url.pathname === `${API_PREFIX}/commercial-articles`) {
        json(res, 200, { items: await listArticles(req, url) }); return true;
      }
      if (req.method === "POST" && url.pathname === `${API_PREFIX}/commercial-articles`) {
        json(res, 201, await createArticle(req, await readBody(req))); return true;
      }
      const articleDetail = url.pathname.match(/^\/api\/v1\/materials\/commercial-articles\/([^/]+)$/);
      if (req.method === "GET" && articleDetail) {
        json(res, 200, await getArticle(req, articleDetail[1])); return true;
      }
      const articleComposition = url.pathname.match(/^\/api\/v1\/materials\/commercial-articles\/([^/]+)\/composition$/);
      if (req.method === "POST" && articleComposition) {
        json(res, 201, await addComposition(req, articleComposition[1], await readBody(req))); return true;
      }
      const skuApplications = url.pathname.match(/^\/api\/v1\/materials\/skus\/([^/]+)\/applications$/);
      if (req.method === "GET" && skuApplications) {
        json(res, 200, { items: await listApplications(req, decodeURIComponent(skuApplications[1]), url) }); return true;
      }
      if (req.method === "POST" && skuApplications) {
        json(res, 201, await createApplication(req, decodeURIComponent(skuApplications[1]), await readBody(req))); return true;
      }
      const applicationDetail = url.pathname.match(/^\/api\/v1\/materials\/skus\/([^/]+)\/applications\/([^/]+)$/);
      if (req.method === "PATCH" && applicationDetail) {
        json(res, 200, await updateApplication(req, decodeURIComponent(applicationDetail[1]), applicationDetail[2], await readBody(req))); return true;
      }
      if (req.method === "DELETE" && applicationDetail) {
        json(res, 200, await archiveApplication(req, decodeURIComponent(applicationDetail[1]), applicationDetail[2], await readBody(req))); return true;
      }
      if (req.method === "GET" && url.pathname === `${API_PREFIX}/claim-types`) {
        json(res, 200, { items: await listClaims(req) }); return true;
      }
      const applicationClaims = url.pathname.match(/^\/api\/v1\/materials\/applications\/([^/]+)\/claims$/);
      if (req.method === "POST" && applicationClaims) {
        json(res, 201, await createApplicationClaim(req, applicationClaims[1], await readBody(req))); return true;
      }
      const claimReview = url.pathname.match(/^\/api\/v1\/materials\/application-claims\/([^/]+)$/);
      if (req.method === "PATCH" && claimReview) {
        json(res, 200, await reviewClaim(req, claimReview[1], await readBody(req))); return true;
      }
      throw new MaterialsApiError(404, "ENDPOINT_NOT_FOUND", "Endpoint da Materials API não encontrado");
    } catch (error) {
      const mapped = mapPgError(error);
      json(res, mapped.status, { error: mapped.code, message: mapped.message, ...mapped.details });
      return true;
    }
  }

  return {
    handle,
    close: async () => { if (ownsPool && pool) await pool.end(); },
    status: schemaStatus,
    _test: { context, searchCatalog, createApplication, updateApplication, mapPgError },
  };
}

function trustDescription(env) {
  return env.MATERIALS_API_TRUST_HEADERS === "true"
    ? "trusted_headers_enabled"
    : "server_environment_context";
}

async function articleQuery(client, tenantId, {
  query = "", vertical = null, materialId = null, status = null, articleId = null, limit = 100,
} = {}) {
  return client.query(`
    SELECT
      ca.id, ca.tenant_id, ca.supplier_organization_id,
      COALESCE(to_jsonb(org)->>'name', ca.supplier_organization_id) AS supplier_name,
      ca.primary_material_id, m.canonical_name_pt AS material_name_pt,
      mf.name_pt AS family_name_pt, m.base_origin::text, m.structure,
      ca.commercial_code, ca.commercial_name, ca.gtin, ca.hs_code, ca.pefcr_category,
      ca.weight_gsm, ca.width_cm, ca.color, ca.finish, ca.status,
      ca.created_by, ca.created_at, ca.updated_at,
      COALESCE(comp.composition, '[]'::jsonb) AS composition,
      COALESCE(comp.composition_total_pct, 0) AS composition_total_pct,
      COALESCE(ev.evidence_count, 0)::int AS evidence_count,
      COALESCE(array_agg(DISTINCT mv.vertical::text) FILTER (WHERE mv.vertical IS NOT NULL), ARRAY[]::text[]) AS verticals
    FROM materials.commercial_article ca
    JOIN materials.material m ON m.id=ca.primary_material_id
    JOIN materials.material_family mf ON mf.id=m.family_id
    LEFT JOIN public.organizations org ON org.tenant_id=ca.tenant_id AND org.id=ca.supplier_organization_id
    LEFT JOIN materials.material_vertical mv ON mv.material_id=m.id
    LEFT JOIN LATERAL (
      SELECT
        jsonb_agg(jsonb_build_object(
          'id', ac.id,
          'material_id', ac.constituent_material_id,
          'material_name', cm.canonical_name_pt,
          'percentage', ac.percentage,
          'feedstock_type', ac.feedstock_type,
          'confidence', ac.confidence,
          'declaration_basis', ac.declaration_basis
        ) ORDER BY ac.percentage DESC, cm.canonical_name_pt) AS composition,
        sum(ac.percentage) AS composition_total_pct
      FROM materials.article_composition ac
      JOIN materials.material cm ON cm.id=ac.constituent_material_id
      WHERE ac.tenant_id=ca.tenant_id AND ac.commercial_article_id=ca.id
    ) comp ON true
    LEFT JOIN LATERAL (
      SELECT count(*) AS evidence_count
      FROM materials.evidence_binding eb
      WHERE eb.tenant_id=ca.tenant_id AND eb.subject_type='commercial_article' AND eb.subject_id=ca.id
    ) ev ON true
    WHERE ca.tenant_id=$1
      AND ($2='' OR ca.commercial_code ILIKE '%'||$2||'%' OR COALESCE(ca.commercial_name,'') ILIKE '%'||$2||'%'
           OR COALESCE(to_jsonb(org)->>'name','') ILIKE '%'||$2||'%' OR m.canonical_name_pt ILIKE '%'||$2||'%'
           OR COALESCE(comp.composition::text,'') ILIKE '%'||$2||'%')
      AND ($3::materials.product_vertical IS NULL OR EXISTS (
        SELECT 1 FROM materials.material_vertical x WHERE x.material_id=m.id AND x.vertical=$3::materials.product_vertical
      ))
      AND ($4::uuid IS NULL OR ca.primary_material_id=$4::uuid)
      AND ($5::text IS NULL OR ca.status=$5)
      AND ($6::uuid IS NULL OR ca.id=$6::uuid)
    GROUP BY ca.id, org.id, m.id, mf.id, comp.composition, comp.composition_total_pct, ev.evidence_count
    ORDER BY ca.updated_at DESC, ca.commercial_code
    LIMIT $7
  `, [tenantId, query, vertical, materialId, status, articleId, limit]);
}

async function fetchApplicationRow(client, tenantId, applicationId) {
  const result = await client.query(`
    SELECT * FROM materials.v_material_application_api
    WHERE tenant_id=$1 AND id=$2
  `, [tenantId, applicationId]);
  return result.rows[0] || null;
}

async function setFrontendEvidence(client, context, applicationId, evidenceReference, idFactory) {
  await client.query(`
    DELETE FROM materials.evidence_binding
    WHERE tenant_id=$1 AND subject_type='material_application' AND subject_id=$2
      AND evidence_id LIKE 'frontend:%'
  `, [context.tenantId, applicationId]);
  const reference = optionalText(evidenceReference);
  if (!reference) return;
  const evidenceId = `frontend:${idFactory()}`;
  const scope = {
    reference,
    source: "materials_frontend",
    limitation: "Referência textual; Evidence Store canônico ainda não possui FK PostgreSQL.",
    request_hash: stableHash({ applicationId, reference }),
  };
  await client.query(`
    INSERT INTO materials.evidence_binding (
      tenant_id, subject_type, subject_id, evidence_id,
      relationship, scope, created_by
    ) VALUES ($1,'material_application',$2,$3,'supports',$4::jsonb,$5)
  `, [context.tenantId, applicationId, evidenceId, JSON.stringify(scope), context.userId]);
}
