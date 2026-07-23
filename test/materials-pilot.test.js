import assert from "node:assert/strict";
import test from "node:test";
import {
  getMaterialDetail,
  handleMaterialsPilotApi,
  listComponentTypes,
  listMaterialFilters,
  searchCommercialArticles,
  searchMaterials,
} from "../src/materials-pilot.js";

test("busca encontra material por sinônimo sem acento", () => {
  const items = searchMaterials({ query: "nylon" });
  assert.equal(items.length, 1);
  assert.equal(items[0].canonical_name_pt, "Poliamida");
});

test("filtro por vertical separa confecção e calçados", () => {
  const footwear = searchMaterials({ vertical: "footwear", limit: 200 });
  const apparel = searchMaterials({ vertical: "apparel", limit: 200 });
  assert.ok(footwear.some((item) => item.id === "mat-eva"));
  assert.ok(!apparel.some((item) => item.id === "mat-eva"));
  assert.ok(apparel.some((item) => item.id === "mat-algodao"));
});

test("detalhe preserva diferença entre material e artigo comercial", () => {
  const detail = getMaterialDetail("mat-linho");
  assert.equal(detail.canonical_name_pt, "Linho");
  assert.ok(detail.commercial_articles.length >= 2);
  assert.ok(detail.commercial_articles.every((item) => item.material_id === detail.id));
});

test("claims não nascem aprovados automaticamente", () => {
  const materials = searchMaterials({ claim: "reciclado", limit: 200 });
  assert.ok(materials.length > 0);
  assert.ok(materials.every((material) => material.claims
    .filter((claim) => claim.code === "reciclado")
    .every((claim) => !["approved_for_buyer", "approved_for_publication"].includes(claim.status))));
});

test("filtros e componentes retornam vocabulário controlado", () => {
  const filters = listMaterialFilters();
  assert.ok(filters.verticals.some((item) => item.value === "apparel"));
  assert.ok(filters.origins.some((item) => item.value === "plant"));
  const footwear = listComponentTypes("footwear");
  assert.ok(footwear.some((item) => item.code === "cabedal" && item.required));
  assert.ok(footwear.every((item) => item.vertical === "footwear"));
});

test("artigos podem ser pesquisados por fornecedor e composição", () => {
  const bySupplier = searchCommercialArticles({ query: "Solados Nordeste" });
  assert.ok(bySupplier.length >= 2);
  const byComposition = searchCommercialArticles({ query: "55%" });
  assert.ok(Array.isArray(byComposition));
});

function captureResponse() {
  const calls = [];
  return {
    calls,
    json: (_res, status, payload) => calls.push({ status, payload }),
  };
}

test("API piloto ignora rotas externas e publica status explícito", async () => {
  const capture = captureResponse();
  const ignored = await handleMaterialsPilotApi({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/v1/dashboard"),
    json: capture.json,
  });
  assert.equal(ignored, false);
  assert.equal(capture.calls.length, 0);

  const handled = await handleMaterialsPilotApi({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/v1/materials-demo/status"),
    json: capture.json,
  });
  assert.equal(handled, true);
  assert.equal(capture.calls[0].status, 200);
  assert.equal(capture.calls[0].payload.production_ready, false);
  assert.ok(capture.calls[0].payload.canonical_materials >= 20);
});

test("API aplica busca e filtros combinados", async () => {
  const capture = captureResponse();
  await handleMaterialsPilotApi({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/v1/materials-demo/catalog?query=reciclado&vertical=footwear"),
    json: capture.json,
  });
  assert.equal(capture.calls[0].status, 200);
  assert.ok(capture.calls[0].payload.items.length > 0);
  assert.ok(capture.calls[0].payload.items.every((item) => item.verticals.includes("footwear")));
});
