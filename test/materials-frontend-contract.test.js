import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const frontendPath = new URL("../public/materials-knowledge.js", import.meta.url);

test("frontend consome /api/v1/materials e não persiste aplicações no localStorage", async () => {
  const source = await readFile(frontendPath, "utf8");
  assert.ok(source.includes('const API_BASE = "/api/v1/materials"'));
  assert.equal(source.includes("phyllos-material-applications-v1"), false);
  assert.equal(/localStorage\.(setItem|getItem)/.test(source), false);
  assert.ok(source.includes('method: "POST"'));
  assert.ok(source.includes('method: "PATCH"'));
  assert.ok(source.includes('method: "DELETE"'));
});

test("frontend exige artigo comercial para aplicar material ao SKU", async () => {
  const source = await readFile(frontendPath, "utf8");
  assert.ok(source.includes("commercialArticleId"));
  assert.ok(source.includes("Nenhum SKU persistente disponível"));
  assert.ok(source.includes("Cadastrar artigo"));
});
