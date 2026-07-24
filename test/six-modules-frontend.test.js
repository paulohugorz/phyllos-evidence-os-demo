import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const moduleScript = await readFile(new URL("../public/module-architecture.js", import.meta.url), "utf8");
const moduleCss = await readFile(new URL("../public/module-architecture.css", import.meta.url), "utf8");
const indexHtml = await readFile(new URL("../public/index.html", import.meta.url), "utf8");

test("declares the six architectural modules", () => {
  for (const label of ["Produto", "Materiais", "Produção", "Evidências", "Inteligência", "Compliance"]) {
    assert.match(moduleScript, new RegExp(`label: "${label}"`));
  }
  assert.equal((moduleScript.match(/label: "/g) || []).length, 6);
});

test("preserves existing frontend views", () => {
  for (const view of ["operations", "overview", "products", "findings", "dossier", "identify", "measure", "impact", "iam"]) {
    assert.match(indexHtml, new RegExp(`id="${view}"|data-view="${view}"`));
  }
});

test("adds responsive module architecture", () => {
  assert.match(moduleScript, /rebuildNavigation/);
  assert.match(moduleScript, /ensureGeneratedViews/);
  assert.match(moduleCss, /\.evidence-flow/);
  assert.match(moduleCss, /@media \(max-width:760px\)/);
});
