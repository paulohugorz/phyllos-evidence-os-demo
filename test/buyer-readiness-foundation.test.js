import assert from "node:assert/strict";
import test from "node:test";
import { EvidenceStore } from "../src/store.js";

function setup() {
  const store = new EvidenceStore();
  const tenantA = store.createTenant({ name: "Tenant A", slug: "tenant-a" });
  const tenantB = store.createTenant({ name: "Tenant B", slug: "tenant-b" });
  const ctxA = { tenantId: tenantA.id, userId: "admin-a", role: "client_admin" };
  const ctxB = { tenantId: tenantB.id, userId: "admin-b", role: "client_admin" };
  const orgA = store.createOrganization(ctxA, { name: "Marca A", externalCode: "ORG-A" });
  const orgB = store.createOrganization(ctxB, { name: "Marca B", externalCode: "ORG-B" });
  return { store, ctxA, ctxB, orgA, orgB };
}

test("cria coleção, produto e SKU preservando pertencimento", () => {
  const { store, ctxA, orgA } = setup();
  const collection = store.createCollection(ctxA, {
    externalCode: "COL-01",
    name: "Coleção 01",
    ownerOrganizationId: orgA.id,
    status: "active",
  });
  const product = store.createProduct(ctxA, {
    externalCode: "PROD-01",
    name: "Camisa",
    ownerOrganizationId: orgA.id,
    collectionId: collection.id,
    category: "shirt",
  });
  const sku = store.createSku(ctxA, {
    productId: product.id,
    externalCode: "SKU-01-P",
    variant: { size: "P", color: "cru" },
    gtin: "7891234567890",
    status: "active",
  });

  assert.equal(store.listCollections(ctxA)[0].id, collection.id);
  assert.equal(store.listProducts(ctxA, { collectionId: collection.id })[0].id, product.id);
  assert.equal(store.listSkus(ctxA, { productId: product.id })[0].id, sku.id);
  assert.equal(sku.variant.size, "P");
});

test("impede coleção de outra organização no produto", () => {
  const { store, ctxA, orgA } = setup();
  const otherOrg = store.createOrganization(ctxA, { name: "Outra", externalCode: "ORG-OTHER" });
  const collection = store.createCollection(ctxA, {
    externalCode: "COL-OTHER",
    name: "Outra coleção",
    ownerOrganizationId: otherOrg.id,
  });

  assert.throws(
    () =>
      store.createProduct(ctxA, {
        externalCode: "PROD-LEAK",
        name: "Produto inválido",
        ownerOrganizationId: orgA.id,
        collectionId: collection.id,
      }),
    (error) => error.code === "COLLECTION_ORGANIZATION_MISMATCH",
  );
});

test("impede referências cruzadas e listagem entre tenants", () => {
  const { store, ctxA, ctxB, orgA, orgB } = setup();
  const collectionA = store.createCollection(ctxA, {
    externalCode: "COL-A",
    name: "Coleção A",
    ownerOrganizationId: orgA.id,
  });
  store.createCollection(ctxB, {
    externalCode: "COL-B",
    name: "Coleção B",
    ownerOrganizationId: orgB.id,
  });

  assert.deepEqual(store.listCollections(ctxA).map((item) => item.externalCode), ["COL-A"]);
  assert.throws(
    () =>
      store.createProduct(ctxB, {
        externalCode: "PROD-X",
        name: "Produto X",
        ownerOrganizationId: orgB.id,
        collectionId: collectionA.id,
      }),
    (error) => error.code === "NOT_FOUND",
  );
});

test("valida GTIN e duplicidade de SKU", () => {
  const { store, ctxA, orgA } = setup();
  const product = store.createProduct(ctxA, {
    externalCode: "PROD-GTIN",
    name: "Produto",
    ownerOrganizationId: orgA.id,
  });

  assert.throws(
    () =>
      store.createSku(ctxA, {
        productId: product.id,
        externalCode: "SKU-GTIN",
        gtin: "ABC",
      }),
    (error) => error.code === "INVALID_GTIN",
  );

  store.createSku(ctxA, { productId: product.id, externalCode: "SKU-UNIQUE" });
  assert.throws(
    () => store.createSku(ctxA, { productId: product.id, externalCode: "SKU-UNIQUE" }),
    (error) => error.code === "DUPLICATE_SKU",
  );
});

test("inclui SKUs no snapshot congelado do dossiê", () => {
  const { store, ctxA, orgA } = setup();
  const product = store.createProduct(ctxA, {
    externalCode: "PROD-DOSSIER",
    name: "Produto",
    ownerOrganizationId: orgA.id,
  });
  store.createSku(ctxA, { productId: product.id, externalCode: "SKU-DOSSIER" });
  const dossier = store.freezeDossier(ctxA, {
    name: "Buyer Data Pack base",
    productIds: [product.id],
    cutoffAt: "2026-07-22T00:00:00.000Z",
  });
  assert.equal(dossier.snapshot.skus.length, 1);
  assert.equal(dossier.snapshot.skus[0].externalCode, "SKU-DOSSIER");
});
