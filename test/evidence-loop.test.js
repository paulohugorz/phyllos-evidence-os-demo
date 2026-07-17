import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { EvidenceStore } from "../src/store.js";

function setup() {
  const store = new EvidenceStore();
  const tenantA = store.createTenant({ name: "Tenant A", slug: "tenant-a" });
  const tenantB = store.createTenant({ name: "Tenant B", slug: "tenant-b" });
  const adminA = { tenantId: tenantA.id, userId: "admin-a", role: "client_admin" };
  const analystA = { tenantId: tenantA.id, userId: "analyst-a", role: "analyst" };
  const reviewerA = { tenantId: tenantA.id, userId: "reviewer-a", role: "reviewer" };
  const adminB = { tenantId: tenantB.id, userId: "admin-b", role: "client_admin" };
  const orgA = store.createOrganization(adminA, { name: "Org A", externalCode: "A" });
  const orgB = store.createOrganization(adminB, { name: "Org B", externalCode: "B" });
  return { store, adminA, analystA, reviewerA, adminB, orgA, orgB };
}

test("isola listagem entre tenants", () => {
  const { store, analystA, adminB, orgA, orgB } = setup();
  store.createProduct(analystA, { externalCode: "SKU-A", name: "Produto A", ownerOrganizationId: orgA.id });
  store.createProduct(adminB, { externalCode: "SKU-B", name: "Produto B", ownerOrganizationId: orgB.id });
  assert.deepEqual(store.listProducts(analystA).map((x) => x.externalCode), ["SKU-A"]);
  assert.deepEqual(store.listProducts(adminB).map((x) => x.externalCode), ["SKU-B"]);
});

test("impede referência cruzada de organização", () => {
  const { store, analystA, orgB } = setup();
  assert.throws(
    () => store.createProduct(analystA, { externalCode: "LEAK", name: "Inválido", ownerOrganizationId: orgB.id }),
    (error) => error.code === "NOT_FOUND",
  );
});

test("nega operação sem contexto e papel permitido", () => {
  const { store, analystA } = setup();
  assert.throws(() => store.listProducts({}), (error) => error.code === "MISSING_CONTEXT");
  assert.throws(() => store.addMembership(analystA, { userId: "x", organizationId: "x", role: "viewer" }), (error) => error.code === "ACCESS_DENIED");
});

test("não permite que fato nasça comprovado", () => {
  const { store, analystA, orgA } = setup();
  const product = store.createProduct(analystA, { externalCode: "SKU-1", name: "Produto", ownerOrganizationId: orgA.id });
  assert.throws(
    () => store.createFact(analystA, { entityType: "product", entityId: product.id, semanticKey: "composition", value: {}, sourceType: "declared", epistemicStatus: "proven" }),
    (error) => error.code === "PROVEN_REQUIRES_RULE" || error.code === "PROVEN_REQUIRES_REVIEW",
  );
});

test("comprovado exige regra, revisão e papel reviewer", () => {
  const { store, analystA, reviewerA, orgA } = setup();
  const product = store.createProduct(analystA, { externalCode: "SKU-2", name: "Produto", ownerOrganizationId: orgA.id });
  const fact = store.createFact(analystA, { entityType: "product", entityId: product.id, semanticKey: "composition", value: {}, sourceType: "document", epistemicStatus: "submitted" });
  store.addFactVersion(reviewerA, fact.id, { value: {}, sourceType: "document", epistemicStatus: "validated" });
  assert.throws(() => store.addFactVersion(analystA, fact.id, { value: {}, sourceType: "document", epistemicStatus: "proven", ruleRunId: "r", reviewId: "v" }), (error) => error.code === "PROVEN_REQUIRES_REVIEWER");
  const version = store.addFactVersion(reviewerA, fact.id, { value: {}, sourceType: "document", epistemicStatus: "proven", ruleRunId: "r", reviewId: "v" });
  assert.equal(version.epistemicStatus, "proven");
});

test("documento duplicado por hash é sinalizado", () => {
  const { store, analystA } = setup();
  const sha256 = createHash("sha256").update("same").digest("hex");
  const first = store.registerDocument(analystA, { title: "Doc 1", sha256 });
  const second = store.registerDocument(analystA, { title: "Doc 2", sha256 });
  assert.equal(second.id, first.id);
  assert.equal(second.duplicate, true);
});

test("regra gera finding explicável somente para lacuna", () => {
  const { store, analystA, orgA } = setup();
  const product = store.createProduct(analystA, { externalCode: "SKU-3", name: "Produto", ownerOrganizationId: orgA.id });
  const fact = store.createFact(analystA, { entityType: "product", entityId: product.id, semanticKey: "composition", value: {}, sourceType: "declaration", epistemicStatus: "declared" });
  const doc = store.registerDocument(analystA, { title: "Doc", sha256: createHash("sha256").update("doc").digest("hex") });
  store.linkEvidence(analystA, { factId: fact.id, documentId: doc.id });
  const findings = store.runCompletenessRule(analystA, { productId: product.id, requiredSemanticKeys: ["composition", "origin"] });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].semanticKey, "origin");
  assert.equal(findings[0].reason, "Fato ausente");
});

test("tarefa exige prazo futuro e evidência esperada", () => {
  const { store, analystA, orgA } = setup();
  const product = store.createProduct(analystA, { externalCode: "SKU-4", name: "Produto", ownerOrganizationId: orgA.id });
  const [finding] = store.runCompletenessRule(analystA, { productId: product.id, requiredSemanticKeys: ["composition"] });
  assert.throws(() => store.createTask(analystA, { findingId: finding.id, ownerOrganizationId: orgA.id, dueAt: "2020-01-01", expectedEvidence: "Ficha" }), (error) => error.code === "INVALID_DUE_DATE");
  const task = store.createTask(analystA, { findingId: finding.id, ownerOrganizationId: orgA.id, dueAt: "2099-01-01", expectedEvidence: "Ficha" });
  assert.equal(task.status, "open");
});

test("resolução de tarefa exige evidência ou justificativa", () => {
  const { store, analystA, orgA } = setup();
  const product = store.createProduct(analystA, { externalCode: "SKU-5", name: "Produto", ownerOrganizationId: orgA.id });
  const [finding] = store.runCompletenessRule(analystA, { productId: product.id, requiredSemanticKeys: ["composition"] });
  const task = store.createTask(analystA, { findingId: finding.id, ownerOrganizationId: orgA.id, dueAt: "2099-01-01", expectedEvidence: "Ficha" });
  assert.throws(() => store.submitTaskResolution(analystA, task.id, {}), (error) => error.code === "RESOLUTION_EVIDENCE_REQUIRED");
  assert.equal(store.submitTaskResolution(analystA, task.id, { justification: "Não aplicável, sujeito à revisão" }).status, "submitted");
});

test("importação é idempotente", () => {
  const { store, analystA, orgA } = setup();
  const args = { idempotencyKey: "batch-1", ownerOrganizationId: orgA.id, rows: [{ externalCode: "IMP-1", name: "Importado" }] };
  const first = store.importProducts(analystA, args);
  const second = store.importProducts(analystA, args);
  assert.equal(second.id, first.id);
  assert.equal(second.replayed, true);
  assert.equal(store.listProducts(analystA).length, 1);
});

test("importação inválida não grava parcialmente", () => {
  const { store, analystA, orgA } = setup();
  assert.throws(() => store.importProducts(analystA, { idempotencyKey: "bad", ownerOrganizationId: orgA.id, rows: [{ externalCode: "OK", name: "Ok" }, { externalCode: "", name: "Ruim" }] }), (error) => error.code === "IMPORT_VALIDATION_FAILED");
  assert.equal(store.listProducts(analystA).length, 0);
});

test("dossiê é cópia congelada e reproduzível", () => {
  const { store, analystA, orgA } = setup();
  const product = store.createProduct(analystA, { externalCode: "SKU-6", name: "Original", ownerOrganizationId: orgA.id });
  const dossier = store.freezeDossier(analystA, { name: "Dossiê", productIds: [product.id], cutoffAt: "2026-07-17T00:00:00.000Z" });
  assert.match(dossier.sha256, /^[a-f0-9]{64}$/);
  dossier.snapshot.products[0].name = "Tentativa de mutação";
  const secondCopy = store.freezeDossier(analystA, { name: "Dossiê", productIds: [product.id], cutoffAt: "2026-07-17T00:00:00.000Z" });
  assert.equal(secondCopy.snapshot.products[0].name, "Original");
  assert.equal(secondCopy.sha256, dossier.sha256);
});

test("audit log é segregado por tenant", () => {
  const { store, adminA, adminB } = setup();
  const auditA = store.audit(adminA);
  const auditB = store.audit(adminB);
  assert.ok(auditA.length > 0 && auditB.length > 0);
  assert.ok(auditA.every((x) => x.tenantId === adminA.tenantId));
  assert.ok(auditB.every((x) => x.tenantId === adminB.tenantId));
});
