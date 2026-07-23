import assert from "node:assert/strict";
import test from "node:test";
import { createMaterialsApi } from "../src/materials-api.js";

class FakeClient {
  constructor(handler = () => ({ rows: [] })) {
    this.handler = handler;
    this.calls = [];
    this.released = false;
  }
  async query(sql, values = []) {
    this.calls.push({ sql, values });
    return this.handler(sql, values, this.calls);
  }
  release() { this.released = true; }
}

class FakePool {
  constructor(client, directHandler = null) {
    this.client = client;
    this.directHandler = directHandler || ((sql, values) => client.handler(sql, values, client.calls));
    this.directCalls = [];
  }
  async connect() { return this.client; }
  async query(sql, values = []) {
    this.directCalls.push({ sql, values });
    return this.directHandler(sql, values);
  }
  async end() {}
}

const env = {
  MATERIALS_TENANT_ID: "tenant-a",
  MATERIALS_USER_ID: "user-a",
  MATERIALS_ROLE: "client_admin",
};

function responseCapture() {
  const calls = [];
  return {
    calls,
    json: (_res, status, payload) => calls.push({ status, payload }),
  };
}

function request(method = "GET", headers = {}, body = null) {
  const chunks = body === null ? [] : [Buffer.from(JSON.stringify(body))];
  return {
    method,
    headers,
    async *[Symbol.asyncIterator]() { for (const chunk of chunks) yield chunk; },
  };
}

test("ignora rotas fora da Materials API", async () => {
  const materials = createMaterialsApi({ env: {} });
  const capture = responseCapture();
  const handled = await materials.handle({
    req: request(), res: {}, url: new URL("http://localhost/api/v1/dashboard"), json: capture.json,
  });
  assert.equal(handled, false);
  assert.equal(capture.calls.length, 0);
});

test("status sem DATABASE_URL é explícito e não derruba o servidor", async () => {
  const materials = createMaterialsApi({ env: {}, connectionString: null });
  const capture = responseCapture();
  await materials.handle({
    req: request(), res: {}, url: new URL("http://localhost/api/v1/materials/status"), json: capture.json,
  });
  assert.equal(capture.calls[0].status, 200);
  assert.equal(capture.calls[0].payload.available, false);
  assert.equal(capture.calls[0].payload.database_connected, false);
});

test("catálogo configura contexto de leitura e usa parâmetros", async () => {
  const client = new FakeClient((sql, values) => {
    if (sql.includes("WITH catalog AS")) {
      return { rows: [{ id: "mat-1", canonical_name_pt: "Linho", total_count: 1 }] };
    }
    return { rows: [] };
  });
  const materials = createMaterialsApi({ pool: new FakePool(client), env: {} });
  const capture = responseCapture();
  await materials.handle({
    req: request(), res: {},
    url: new URL("http://localhost/api/v1/materials/catalog?query=linho%27%3Bdrop%20table&vertical=apparel"),
    json: capture.json,
  });
  assert.equal(capture.calls[0].status, 200);
  assert.equal(capture.calls[0].payload.items[0].canonical_name_pt, "Linho");
  const catalogCall = client.calls.find((call) => call.sql.includes("WITH catalog AS"));
  assert.ok(catalogCall.sql.includes("$1"));
  assert.equal(catalogCall.values[0], "linho';drop table");
  assert.equal(catalogCall.sql.includes("drop table"), false);
  assert.deepEqual(client.calls[1].values, ["catalog-public"]);
  assert.equal(client.released, true);
});

test("operações tenant-aware falham quando o contexto não está configurado", async () => {
  const client = new FakeClient();
  const materials = createMaterialsApi({ pool: new FakePool(client), env: {} });
  const capture = responseCapture();
  await materials.handle({
    req: request(), res: {}, url: new URL("http://localhost/api/v1/materials/skus"), json: capture.json,
  });
  assert.equal(capture.calls[0].status, 503);
  assert.equal(capture.calls[0].payload.error, "MATERIALS_CONTEXT_REQUIRED");
  assert.equal(client.calls.length, 0);
});

test("lista SKUs sem assumir colunas além de tenant_id e id", async () => {
  const client = new FakeClient((sql) => {
    if (sql.includes("FROM public.skus")) {
      return { rows: [{ id: "sku-1", raw: { id: "sku-1", external_code: "SKU-001", name: "Camisa Horizonte" } }] };
    }
    return { rows: [] };
  });
  const materials = createMaterialsApi({ pool: new FakePool(client), env });
  const capture = responseCapture();
  await materials.handle({
    req: request(), res: {}, url: new URL("http://localhost/api/v1/materials/skus"), json: capture.json,
  });
  assert.equal(capture.calls[0].status, 200);
  assert.deepEqual(capture.calls[0].payload.items[0], {
    id: "sku-1", code: "SKU-001", name: "Camisa Horizonte", category: null,
    vertical: "apparel", raw: { id: "sku-1", external_code: "SKU-001", name: "Camisa Horizonte" },
  });
});

test("cria aplicação persistente com snapshot, idempotência e evidência textual", async () => {
  const applicationId = "00000000-0000-4000-8000-000000000099";
  const articleId = "00000000-0000-4000-8000-000000000010";
  const componentId = "00000000-0000-4000-8000-000000000020";
  const client = new FakeClient((sql) => {
    if (sql.includes("WHERE tenant_id=$1 AND client_request_id=$2")) return { rows: [] };
    if (sql.includes("FROM materials.commercial_article ca")) {
      return { rows: [{
        id: articleId, primary_material_id: "00000000-0000-4000-8000-000000000030",
        commercial_code: "LIN-240", commercial_name: "Linho 240", supplier_organization_id: "supplier-1",
        supplier_name: "Tecelagem A", material_name_pt: "Linho", family_name_pt: "Linho",
        base_origin: "plant", structure: "fibra liberiana", composition: [{ percentage: 100, material_name: "Linho" }],
        status: "active", verticals: ["apparel"],
      }] };
    }
    if (sql.includes("INSERT INTO materials.material_application")) return { rows: [{ id: applicationId }] };
    if (sql.includes("FROM materials.v_material_application_api")) {
      return { rows: [{ id: applicationId, sku_id: "sku-1", version: 1, application_snapshot: { snapshot_version: 1 } }] };
    }
    return { rows: [] };
  });
  const materials = createMaterialsApi({
    pool: new FakePool(client), env, idFactory: () => "evidence-fixed",
  });
  const capture = responseCapture();
  await materials.handle({
    req: request("POST", { "idempotency-key": "command-1" }, {
      componentTypeId: componentId,
      commercialArticleId: articleId,
      quantity: 1.8,
      quantityUnit: "m",
      confidence: "documented",
      evidenceReference: "Ficha FT-2026",
    }),
    res: {}, url: new URL("http://localhost/api/v1/materials/skus/sku-1/applications"), json: capture.json,
  });
  assert.equal(capture.calls[0].status, 201);
  const insert = client.calls.find((call) => call.sql.includes("INSERT INTO materials.material_application"));
  assert.ok(insert);
  assert.equal(insert.values.at(-1), "command-1");
  const snapshot = JSON.parse(insert.values[10]);
  assert.equal(snapshot.commercial_article.commercial_code, "LIN-240");
  const evidence = client.calls.find((call) => call.sql.includes("INSERT INTO materials.evidence_binding"));
  assert.ok(evidence);
  assert.equal(evidence.values[2], "frontend:evidence-fixed");
  assert.equal(JSON.parse(evidence.values[3]).reference, "Ficha FT-2026");
});

test("atualização usa versão otimista e retorna conflito sem sobrescrever", async () => {
  const client = new FakeClient((sql) => {
    if (sql.includes("FROM materials.v_material_application_api")) {
      return { rows: [{ id: "app-1", sku_id: "sku-1", version: 2, commercial_article_id: "article-1", application_snapshot: {} }] };
    }
    return { rows: [] };
  });
  const materials = createMaterialsApi({ pool: new FakePool(client), env });
  const capture = responseCapture();
  await materials.handle({
    req: request("PATCH", { "if-match": "1" }, { quantity: 2 }),
    res: {}, url: new URL("http://localhost/api/v1/materials/skus/sku-1/applications/app-1"), json: capture.json,
  });
  assert.equal(capture.calls[0].status, 409);
  assert.equal(capture.calls[0].payload.error, "APPLICATION_VERSION_CONFLICT");
  assert.equal(client.calls.some((call) => call.sql.includes("UPDATE materials.material_application")), false);
});

test("perfil viewer não cria artigo comercial", async () => {
  const client = new FakeClient();
  const materials = createMaterialsApi({ pool: new FakePool(client), env: { ...env, MATERIALS_ROLE: "viewer" } });
  const capture = responseCapture();
  await materials.handle({
    req: request("POST", { "idempotency-key": "article-1" }, {
      supplierOrganizationId: "supplier-1",
      primaryMaterialId: "00000000-0000-4000-8000-000000000001",
      commercialCode: "A-1",
    }),
    res: {}, url: new URL("http://localhost/api/v1/materials/commercial-articles"), json: capture.json,
  });
  assert.equal(capture.calls[0].status, 403);
  assert.equal(client.calls.length, 0);
});
