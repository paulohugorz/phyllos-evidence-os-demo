import { createHash } from "node:crypto";
import { DomainError, invariant } from "./errors.js";
import { assertEpistemicTransition } from "./epistemics.js";
import { id, now } from "./ids.js";

const clone = (value) => structuredClone(value);
const freeze = (value) => Object.freeze(clone(value));
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export class EvidenceStore {
  #tenants = new Map();
  #organizations = new Map();
  #memberships = new Map();
  #products = new Map();
  #facts = new Map();
  #documents = new Map();
  #evidence = new Map();
  #findings = new Map();
  #tasks = new Map();
  #dossiers = new Map();
  #imports = new Map();
  #audit = [];

  createTenant({ name, slug, actor = "system" }) {
    invariant(name?.trim() && slug?.trim(), "INVALID_TENANT", "Nome e slug são obrigatórios");
    invariant(![...this.#tenants.values()].some((x) => x.slug === slug), "DUPLICATE_TENANT", "Slug já existe");
    const tenant = freeze({ id: id(), name: name.trim(), slug, createdAt: now() });
    this.#tenants.set(tenant.id, tenant);
    this.#record(tenant.id, actor, "tenant.created", "tenant", tenant.id);
    return clone(tenant);
  }

  createOrganization(ctx, { name, externalCode, type = "buyer" }) {
    this.#require(ctx, ["phyllos_admin", "client_admin"]);
    invariant(name?.trim(), "INVALID_ORGANIZATION", "Nome obrigatório");
    const row = freeze({ id: id(), tenantId: ctx.tenantId, name: name.trim(), externalCode, type, createdAt: now() });
    this.#organizations.set(row.id, row);
    this.#record(ctx.tenantId, ctx.userId, "organization.created", "organization", row.id);
    return clone(row);
  }

  addMembership(ctx, { userId, organizationId, role }) {
    this.#require(ctx, ["phyllos_admin", "client_admin"]);
    this.#owned(this.#organizations, organizationId, ctx.tenantId);
    const row = freeze({ id: id(), tenantId: ctx.tenantId, userId, organizationId, role, active: true, createdAt: now() });
    this.#memberships.set(row.id, row);
    this.#record(ctx.tenantId, ctx.userId, "membership.created", "membership", row.id);
    return clone(row);
  }

  createProduct(ctx, { externalCode, name, ownerOrganizationId }) {
    this.#require(ctx, ["client_admin", "analyst"]);
    this.#owned(this.#organizations, ownerOrganizationId, ctx.tenantId);
    invariant(externalCode && name, "INVALID_PRODUCT", "Código e nome obrigatórios");
    invariant(![...this.#products.values()].some((x) => x.tenantId === ctx.tenantId && x.externalCode === externalCode), "DUPLICATE_PRODUCT", "Produto duplicado");
    const row = freeze({ id: id(), tenantId: ctx.tenantId, externalCode, name, ownerOrganizationId, createdAt: now() });
    this.#products.set(row.id, row);
    this.#record(ctx.tenantId, ctx.userId, "product.created", "product", row.id);
    return clone(row);
  }

  listProducts(ctx) {
    this.#require(ctx, ["client_admin", "analyst", "reviewer", "viewer"]);
    return [...this.#products.values()].filter((x) => x.tenantId === ctx.tenantId).map(clone);
  }

  createFact(ctx, { entityType, entityId, semanticKey, value, sourceType, epistemicStatus, validTo = null }) {
    this.#require(ctx, ["client_admin", "analyst", "supplier"]);
    this.#assertEntity(ctx, entityType, entityId);
    assertEpistemicTransition(null, epistemicStatus, { actorRole: ctx.role });
    invariant(epistemicStatus !== "proven", "PROVEN_REQUIRES_REVIEW", "Fato não nasce comprovado");
    const factId = id();
    const version = freeze({ id: id(), version: 1, value: clone(value), sourceType, epistemicStatus, validTo, createdBy: ctx.userId, createdAt: now() });
    const fact = { id: factId, tenantId: ctx.tenantId, entityType, entityId, semanticKey, versions: [version] };
    this.#facts.set(factId, fact);
    this.#record(ctx.tenantId, ctx.userId, "fact.asserted", "fact", factId, { epistemicStatus });
    return clone(fact);
  }

  addFactVersion(ctx, factId, { value, sourceType, epistemicStatus, validTo = null, ruleRunId, reviewId }) {
    this.#require(ctx, ["client_admin", "analyst", "supplier", "reviewer"]);
    const fact = this.#owned(this.#facts, factId, ctx.tenantId);
    const current = fact.versions.at(-1);
    assertEpistemicTransition(current.epistemicStatus, epistemicStatus, { actorRole: ctx.role, ruleRunId, reviewId });
    const version = freeze({ id: id(), version: current.version + 1, value: clone(value), sourceType, epistemicStatus, validTo, ruleRunId, reviewId, createdBy: ctx.userId, createdAt: now() });
    fact.versions.push(version);
    this.#record(ctx.tenantId, ctx.userId, "fact.versioned", "fact", factId, { from: current.epistemicStatus, to: epistemicStatus });
    return clone(version);
  }

  registerDocument(ctx, { title, sha256, validTo = null, issuer = null }) {
    this.#require(ctx, ["client_admin", "analyst", "supplier"]);
    invariant(/^[a-f0-9]{64}$/.test(sha256), "INVALID_HASH", "SHA-256 inválido");
    const duplicate = [...this.#documents.values()].find((x) => x.tenantId === ctx.tenantId && x.sha256 === sha256);
    if (duplicate) return { ...clone(duplicate), duplicate: true };
    const row = freeze({ id: id(), tenantId: ctx.tenantId, title, sha256, validTo, issuer, createdBy: ctx.userId, createdAt: now() });
    this.#documents.set(row.id, row);
    this.#record(ctx.tenantId, ctx.userId, "document.registered", "document", row.id);
    return clone(row);
  }

  linkEvidence(ctx, { factId, documentId, role = "supports", scope = {} }) {
    this.#require(ctx, ["client_admin", "analyst", "supplier"]);
    this.#owned(this.#facts, factId, ctx.tenantId);
    this.#owned(this.#documents, documentId, ctx.tenantId);
    invariant(["supports", "contradicts", "contextualizes"].includes(role), "INVALID_EVIDENCE_ROLE", "Papel de evidência inválido");
    const row = freeze({ id: id(), tenantId: ctx.tenantId, factId, documentId, role, scope: clone(scope), createdAt: now() });
    this.#evidence.set(row.id, row);
    this.#record(ctx.tenantId, ctx.userId, "evidence.linked", "evidence", row.id);
    return clone(row);
  }

  runCompletenessRule(ctx, { productId, requiredSemanticKeys }) {
    this.#require(ctx, ["client_admin", "analyst", "reviewer"]);
    this.#owned(this.#products, productId, ctx.tenantId);
    const facts = [...this.#facts.values()].filter((x) => x.tenantId === ctx.tenantId && x.entityType === "product" && x.entityId === productId);
    const findings = [];
    for (const key of requiredSemanticKeys) {
      const fact = facts.find((x) => x.semanticKey === key);
      const current = fact?.versions.at(-1);
      const hasValidEvidence = fact && [...this.#evidence.values()].some((x) => x.tenantId === ctx.tenantId && x.factId === fact.id && x.role === "supports");
      if (!current || current.epistemicStatus === "missing" || !hasValidEvidence) {
        const row = freeze({ id: id(), tenantId: ctx.tenantId, productId, semanticKey: key, severity: 3, reason: !current ? "Fato ausente" : !hasValidEvidence ? "Evidência válida ausente" : "Dado ausente", status: "open", createdAt: now() });
        this.#findings.set(row.id, row); findings.push(row);
        this.#record(ctx.tenantId, ctx.userId, "finding.opened", "finding", row.id, { reason: row.reason });
      }
    }
    return findings.map(clone);
  }

  createTask(ctx, { findingId, ownerOrganizationId, dueAt, expectedEvidence }) {
    this.#require(ctx, ["client_admin", "analyst"]);
    this.#owned(this.#findings, findingId, ctx.tenantId);
    this.#owned(this.#organizations, ownerOrganizationId, ctx.tenantId);
    invariant(Date.parse(dueAt) > Date.now(), "INVALID_DUE_DATE", "Prazo deve estar no futuro");
    invariant(expectedEvidence?.trim(), "EXPECTED_EVIDENCE_REQUIRED", "Evidência esperada é obrigatória");
    const row = { id: id(), tenantId: ctx.tenantId, findingId, ownerOrganizationId, dueAt, expectedEvidence, status: "open", history: [{ status: "open", at: now(), by: ctx.userId }] };
    this.#tasks.set(row.id, row);
    this.#record(ctx.tenantId, ctx.userId, "task.created", "task", row.id);
    return clone(row);
  }

  submitTaskResolution(ctx, taskId, { evidenceId, justification }) {
    this.#require(ctx, ["client_admin", "analyst", "supplier"]);
    const task = this.#owned(this.#tasks, taskId, ctx.tenantId);
    invariant(evidenceId || justification?.trim(), "RESOLUTION_EVIDENCE_REQUIRED", "Resolução exige evidência ou justificativa");
    if (evidenceId) this.#owned(this.#evidence, evidenceId, ctx.tenantId);
    task.status = "submitted"; task.history.push({ status: "submitted", evidenceId, justification, at: now(), by: ctx.userId });
    this.#record(ctx.tenantId, ctx.userId, "task.resolution_submitted", "task", task.id);
    return clone(task);
  }

  freezeDossier(ctx, { name, productIds, cutoffAt = now() }) {
    this.#require(ctx, ["client_admin", "analyst", "reviewer"]);
    for (const productId of productIds) this.#owned(this.#products, productId, ctx.tenantId);
    const snapshot = {
      tenantId: ctx.tenantId, name, cutoffAt,
      products: [...this.#products.values()].filter((x) => productIds.includes(x.id) && x.tenantId === ctx.tenantId).map(clone),
      facts: [...this.#facts.values()].filter((x) => productIds.includes(x.entityId) && x.tenantId === ctx.tenantId).map(clone),
      evidence: [...this.#evidence.values()].filter((x) => x.tenantId === ctx.tenantId).map(clone),
      findings: [...this.#findings.values()].filter((x) => productIds.includes(x.productId) && x.tenantId === ctx.tenantId).map(clone),
      limitations: "Estados epistemológicos e lacunas devem ser interpretados no escopo e data de corte.",
    };
    const row = freeze({ id: id(), tenantId: ctx.tenantId, name, snapshot, sha256: hash(snapshot), frozenAt: now(), frozenBy: ctx.userId });
    this.#dossiers.set(row.id, row);
    this.#record(ctx.tenantId, ctx.userId, "dossier.frozen", "dossier", row.id, { sha256: row.sha256 });
    return clone(row);
  }

  importProducts(ctx, { idempotencyKey, rows, ownerOrganizationId }) {
    this.#require(ctx, ["client_admin", "analyst"]);
    this.#owned(this.#organizations, ownerOrganizationId, ctx.tenantId);
    const importKey = `${ctx.tenantId}:${idempotencyKey}`;
    if (this.#imports.has(importKey)) return { ...clone(this.#imports.get(importKey)), replayed: true };
    const errors = rows.flatMap((row, index) => {
      const messages = [];
      if (!row.externalCode) messages.push("externalCode obrigatório");
      if (!row.name) messages.push("name obrigatório");
      return messages.map((message) => ({ row: index + 1, message }));
    });
    invariant(errors.length === 0, "IMPORT_VALIDATION_FAILED", JSON.stringify(errors));
    const created = rows.map((row) => this.createProduct(ctx, { ...row, ownerOrganizationId }));
    const result = freeze({ id: id(), tenantId: ctx.tenantId, idempotencyKey, createdIds: created.map((x) => x.id), committedAt: now() });
    this.#imports.set(importKey, result);
    this.#record(ctx.tenantId, ctx.userId, "import.committed", "import", result.id, { count: created.length });
    return clone(result);
  }

  audit(ctx) {
    this.#require(ctx, ["client_admin", "reviewer", "phyllos_admin"]);
    return this.#audit.filter((x) => x.tenantId === ctx.tenantId).map(clone);
  }

  #assertEntity(ctx, type, entityId) {
    const stores = { product: this.#products, organization: this.#organizations };
    invariant(stores[type], "UNSUPPORTED_ENTITY", `Entidade não suportada: ${type}`);
    this.#owned(stores[type], entityId, ctx.tenantId);
  }

  #require(ctx, roles) {
    invariant(ctx?.tenantId && ctx?.userId && ctx?.role, "MISSING_CONTEXT", "Contexto ativo obrigatório");
    invariant(this.#tenants.has(ctx.tenantId), "TENANT_NOT_FOUND", "Tenant inexistente");
    invariant(roles.includes(ctx.role), "ACCESS_DENIED", "Acesso negado");
  }

  #owned(store, resourceId, tenantId) {
    const row = store.get(resourceId);
    if (!row || row.tenantId !== tenantId) throw new DomainError("NOT_FOUND", "Recurso não encontrado");
    return row;
  }

  #record(tenantId, actor, action, resourceType, resourceId, metadata = {}) {
    this.#audit.push(freeze({ id: id(), tenantId, actor, action, resourceType, resourceId, metadata, at: now() }));
  }
}
