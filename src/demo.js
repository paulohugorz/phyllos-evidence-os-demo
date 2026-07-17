import { createHash } from "node:crypto";
import { EvidenceStore } from "./store.js";

const store = new EvidenceStore();
const tenant = store.createTenant({ name: "Marca Piloto", slug: "marca-piloto" });
const ctx = { tenantId: tenant.id, userId: "user-admin", role: "client_admin" };
const buyer = store.createOrganization(ctx, { name: "Marca Piloto", externalCode: "BUY-1" });
const product = store.createProduct(ctx, { externalCode: "SKU-001", name: "Camiseta Horizonte", ownerOrganizationId: buyer.id });
const fact = store.createFact(ctx, { entityType: "product", entityId: product.id, semanticKey: "composition", value: [{ material: "algodão", percentage: 100 }], sourceType: "supplier_declaration", epistemicStatus: "declared" });
const document = store.registerDocument(ctx, { title: "Ficha de composição", sha256: createHash("sha256").update("fixture").digest("hex"), validTo: "2027-07-17" });
store.linkEvidence(ctx, { factId: fact.id, documentId: document.id });
const findings = store.runCompletenessRule(ctx, { productId: product.id, requiredSemanticKeys: ["composition", "supplier_origin"] });
const dossier = store.freezeDossier(ctx, { name: "Dossiê piloto", productIds: [product.id] });

console.log(JSON.stringify({ tenant, product, findings, dossier: { id: dossier.id, sha256: dossier.sha256 } }, null, 2));
