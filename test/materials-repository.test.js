import assert from "node:assert/strict";
import test from "node:test";
import { MaterialsRepository, MaterialsRepositoryError } from "../src/materials-repository.js";

class FakeClient {
  constructor({ failOn = null } = {}) {
    this.calls = [];
    this.failOn = failOn;
    this.released = false;
  }

  async query(text, values = []) {
    this.calls.push({ text, values });
    if (this.failOn && text.includes(this.failOn)) throw new Error("database failure");
    if (/SELECT DISTINCT/.test(text)) return { rows: [{ id: "material-1" }] };
    if (/RETURNING \*/.test(text)) return { rows: [{ id: "00000000-0000-4000-8000-000000000001" }] };
    return { rows: [] };
  }

  release() {
    this.released = true;
  }
}

class FakePool {
  constructor(client) {
    this.client = client;
  }

  async connect() {
    return this.client;
  }
}

const context = {
  tenantId: "tenant-1",
  userId: "user-1",
  role: "client_admin",
};

test("configura tenant, usuário e role dentro da transação", async () => {
  const client = new FakeClient();
  const repository = new MaterialsRepository(new FakePool(client));

  const rows = await repository.listFamilies(context, { vertical: "apparel" });
  assert.equal(rows.length, 1);
  assert.equal(client.calls[0].text, "BEGIN");
  assert.deepEqual(client.calls[1].values, ["tenant-1"]);
  assert.deepEqual(client.calls[2].values, ["user-1"]);
  assert.deepEqual(client.calls[3].values, ["client_admin"]);
  assert.equal(client.calls.at(-1).text, "COMMIT");
  assert.equal(client.released, true);
});

test("faz rollback e libera a conexão quando a operação falha", async () => {
  const client = new FakeClient({ failOn: "SELECT DISTINCT" });
  const repository = new MaterialsRepository(new FakePool(client));

  await assert.rejects(() => repository.listFamilies(context), /database failure/);
  assert.equal(client.calls.at(-1).text, "ROLLBACK");
  assert.equal(client.released, true);
});

test("bloqueia aprovação de claim para perfil sem revisão", async () => {
  const client = new FakeClient();
  const repository = new MaterialsRepository(new FakePool(client));

  await assert.rejects(
    () => repository.setApplicationClaimStatus(
      { ...context, role: "analyst" },
      {
        applicationClaimId: "00000000-0000-4000-8000-000000000001",
        status: "approved_for_publication",
      },
    ),
    (error) => error instanceof MaterialsRepositoryError && error.code === "ACCESS_DENIED",
  );
  assert.equal(client.calls.length, 0);
});

test("usa parâmetros para criar artigo comercial", async () => {
  const client = new FakeClient();
  const repository = new MaterialsRepository(new FakePool(client));

  await repository.createCommercialArticle(context, {
    supplierOrganizationId: "supplier-1",
    primaryMaterialId: "00000000-0000-4000-8000-000000000001",
    commercialCode: "XZ-410'; DROP TABLE materials.material; --",
    commercialName: "Tecido teste",
  });

  const insertCall = client.calls.find((call) => call.text.includes("INSERT INTO materials.commercial_article"));
  assert.ok(insertCall);
  assert.ok(insertCall.text.includes("VALUES ($1,$2,$3"));
  assert.equal(insertCall.values[3], "XZ-410'; DROP TABLE materials.material; --");
  assert.equal(insertCall.text.includes("DROP TABLE"), false);
});
