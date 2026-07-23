const WRITE_ROLES = new Set(["phyllos_admin", "client_admin", "analyst"]);
const REVIEW_ROLES = new Set(["phyllos_admin", "client_admin", "reviewer"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class MaterialsRepositoryError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "MaterialsRepositoryError";
    this.code = code;
    this.details = details;
  }
}

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new MaterialsRepositoryError("INVALID_INPUT", `${field} é obrigatório`, { field });
  }
  return value.trim();
}

function optionalText(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") {
    throw new MaterialsRepositoryError("INVALID_INPUT", "Valor textual inválido");
  }
  return value.trim() || null;
}

function requireUuid(value, field) {
  const normalized = requireText(value, field);
  if (!UUID_PATTERN.test(normalized)) {
    throw new MaterialsRepositoryError("INVALID_INPUT", `${field} deve ser UUID`, { field });
  }
  return normalized;
}

function normalizeContext(context) {
  const tenantId = requireText(context?.tenantId, "tenantId");
  const userId = requireText(context?.userId, "userId");
  const role = requireText(context?.role, "role");
  return { tenantId, userId, role };
}

function requireRole(role, allowedRoles) {
  if (!allowedRoles.has(role)) {
    throw new MaterialsRepositoryError("ACCESS_DENIED", "Perfil sem permissão para esta operação", { role });
  }
}

function clampLimit(limit, fallback = 50, maximum = 100) {
  if (limit === undefined || limit === null) return fallback;
  const parsed = Number(limit);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new MaterialsRepositoryError("INVALID_INPUT", "limit deve ser inteiro positivo");
  }
  return Math.min(parsed, maximum);
}

export class MaterialsRepository {
  constructor(pool) {
    if (!pool || typeof pool.connect !== "function") {
      throw new TypeError("MaterialsRepository exige um Pool compatível com pg");
    }
    this.pool = pool;
  }

  async withTenantTransaction(context, operation) {
    const ctx = normalizeContext(context);
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [ctx.tenantId]);
      await client.query("SELECT set_config('app.user_id', $1, true)", [ctx.userId]);
      await client.query("SELECT set_config('app.role', $1, true)", [ctx.role]);
      const result = await operation(client, ctx);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original error. Connection disposal is handled below.
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async listFamilies(context, { vertical = null } = {}) {
    const normalizedVertical = optionalText(vertical);

    return this.withTenantTransaction(context, async (client) => {
      const result = await client.query(
        `SELECT DISTINCT
           mf.id,
           mf.code,
           mf.name_pt,
           mf.name_en,
           mf.description_pt
         FROM materials.material_family mf
         LEFT JOIN materials.material m ON m.family_id = mf.id AND m.is_active
         LEFT JOIN materials.material_vertical mv ON mv.material_id = m.id
         WHERE mf.is_active
           AND ($1::materials.product_vertical IS NULL OR mv.vertical = $1::materials.product_vertical)
         ORDER BY mf.name_pt`,
        [normalizedVertical],
      );
      return result.rows;
    });
  }

  async searchMaterials(context, { query = "", vertical = null, limit = 50 } = {}) {
    const normalizedQuery = typeof query === "string" ? query.trim() : "";
    const normalizedVertical = optionalText(vertical);
    const normalizedLimit = clampLimit(limit);

    return this.withTenantTransaction(context, async (client) => {
      const result = await client.query(
        `SELECT DISTINCT
           m.id,
           mf.code AS family_code,
           mf.name_pt AS family_name_pt,
           m.canonical_name_pt,
           m.canonical_name_en,
           m.technical_name,
           m.base_origin,
           m.structure
         FROM materials.material m
         JOIN materials.material_family mf ON mf.id = m.family_id
         LEFT JOIN materials.material_alias ma ON ma.material_id = m.id
         LEFT JOIN materials.material_vertical mv ON mv.material_id = m.id
         WHERE m.is_active
           AND mf.is_active
           AND ($1 = '' OR
                m.canonical_name_pt ILIKE '%' || $1 || '%' OR
                COALESCE(m.canonical_name_en, '') ILIKE '%' || $1 || '%' OR
                COALESCE(ma.alias, '') ILIKE '%' || $1 || '%')
           AND ($2::materials.product_vertical IS NULL OR mv.vertical = $2::materials.product_vertical)
         ORDER BY m.canonical_name_pt
         LIMIT $3`,
        [normalizedQuery, normalizedVertical, normalizedLimit],
      );
      return result.rows;
    });
  }

  async createCommercialArticle(context, input) {
    const ctx = normalizeContext(context);
    requireRole(ctx.role, WRITE_ROLES);

    const supplierOrganizationId = requireText(input?.supplierOrganizationId, "supplierOrganizationId");
    const primaryMaterialId = requireUuid(input?.primaryMaterialId, "primaryMaterialId");
    const commercialCode = requireText(input?.commercialCode, "commercialCode");
    const gtin = optionalText(input?.gtin);

    if (gtin && !/^\d{8,14}$/.test(gtin)) {
      throw new MaterialsRepositoryError("INVALID_GTIN", "GTIN deve conter de 8 a 14 dígitos");
    }

    return this.withTenantTransaction(ctx, async (client, activeContext) => {
      const result = await client.query(
        `INSERT INTO materials.commercial_article (
           tenant_id,
           supplier_organization_id,
           primary_material_id,
           commercial_code,
           commercial_name,
           gtin,
           hs_code,
           weight_gsm,
           width_cm,
           color,
           finish,
           created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          activeContext.tenantId,
          supplierOrganizationId,
          primaryMaterialId,
          commercialCode,
          optionalText(input?.commercialName),
          gtin,
          optionalText(input?.hsCode),
          input?.weightGsm ?? null,
          input?.widthCm ?? null,
          optionalText(input?.color),
          optionalText(input?.finish),
          activeContext.userId,
        ],
      );
      return result.rows[0];
    });
  }

  async addArticleComposition(context, input) {
    const ctx = normalizeContext(context);
    requireRole(ctx.role, WRITE_ROLES);

    const commercialArticleId = requireUuid(input?.commercialArticleId, "commercialArticleId");
    const constituentMaterialId = requireUuid(input?.constituentMaterialId, "constituentMaterialId");
    const percentage = Number(input?.percentage);

    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      throw new MaterialsRepositoryError("INVALID_PERCENTAGE", "percentage deve estar entre 0 e 100");
    }

    return this.withTenantTransaction(ctx, async (client, activeContext) => {
      const result = await client.query(
        `INSERT INTO materials.article_composition (
           tenant_id,
           commercial_article_id,
           constituent_material_id,
           percentage,
           tolerance_pct,
           feedstock_type,
           declaration_basis,
           confidence,
           created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [
          activeContext.tenantId,
          commercialArticleId,
          constituentMaterialId,
          percentage,
          input?.tolerancePct ?? 0,
          optionalText(input?.feedstockType) || "unknown",
          optionalText(input?.declarationBasis),
          optionalText(input?.confidence) || "unknown",
          activeContext.userId,
        ],
      );
      return result.rows[0];
    });
  }

  async applyMaterialToSku(context, input) {
    const ctx = normalizeContext(context);
    requireRole(ctx.role, WRITE_ROLES);

    const skuId = requireText(input?.skuId, "skuId");
    const componentTypeId = requireUuid(input?.componentTypeId, "componentTypeId");
    const commercialArticleId = requireUuid(input?.commercialArticleId, "commercialArticleId");

    return this.withTenantTransaction(ctx, async (client, activeContext) => {
      const result = await client.query(
        `INSERT INTO materials.material_application (
           tenant_id,
           sku_id,
           component_type_id,
           commercial_article_id,
           batch_reference,
           quantity,
           quantity_unit,
           confidence,
           created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [
          activeContext.tenantId,
          skuId,
          componentTypeId,
          commercialArticleId,
          optionalText(input?.batchReference),
          input?.quantity ?? null,
          optionalText(input?.quantityUnit),
          optionalText(input?.confidence) || "unknown",
          activeContext.userId,
        ],
      );
      return result.rows[0];
    });
  }

  async bindEvidence(context, input) {
    const ctx = normalizeContext(context);
    requireRole(ctx.role, WRITE_ROLES);

    const subjectType = requireText(input?.subjectType, "subjectType");
    const subjectId = requireUuid(input?.subjectId, "subjectId");
    const evidenceId = requireText(input?.evidenceId, "evidenceId");

    return this.withTenantTransaction(ctx, async (client, activeContext) => {
      const result = await client.query(
        `INSERT INTO materials.evidence_binding (
           tenant_id,
           subject_type,
           subject_id,
           evidence_id,
           document_id,
           relationship,
           scope,
           created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
         RETURNING *`,
        [
          activeContext.tenantId,
          subjectType,
          subjectId,
          evidenceId,
          optionalText(input?.documentId),
          optionalText(input?.relationship) || "supports",
          JSON.stringify(input?.scope || {}),
          activeContext.userId,
        ],
      );
      return result.rows[0];
    });
  }

  async setApplicationClaimStatus(context, input) {
    const ctx = normalizeContext(context);
    requireRole(ctx.role, REVIEW_ROLES);

    const applicationClaimId = requireUuid(input?.applicationClaimId, "applicationClaimId");
    const status = requireText(input?.status, "status");
    const approvedStatuses = new Set(["approved_for_buyer", "approved_for_publication"]);

    return this.withTenantTransaction(ctx, async (client, activeContext) => {
      const result = await client.query(
        `UPDATE materials.application_claim
            SET status = $3::materials.claim_status,
                limitations_pt = $4,
                reviewed_by = CASE WHEN $5 THEN $2 ELSE reviewed_by END,
                reviewed_at = CASE WHEN $5 THEN now() ELSE reviewed_at END,
                updated_at = now()
          WHERE tenant_id = $1
            AND id = $6
         RETURNING *`,
        [
          activeContext.tenantId,
          activeContext.userId,
          status,
          optionalText(input?.limitationsPt),
          approvedStatuses.has(status),
          applicationClaimId,
        ],
      );

      if (!result.rows[0]) {
        throw new MaterialsRepositoryError("NOT_FOUND", "Claim de aplicação não encontrado");
      }
      return result.rows[0];
    });
  }
}
