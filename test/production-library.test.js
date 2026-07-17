import test from "node:test";
import assert from "node:assert/strict";
import {
  createSuggestedSpecification,
  deriveGaps,
  estimateProductionImpact,
  specificityScore,
} from "../public/production-library.js";

test("creates a suggested structure from an existing piece", () => {
  const spec = createSuggestedSpecification({ id: "piece-1", category: "Camisa", material: "100% linho", mass: 250, waste: 9 });
  assert.equal(spec.pieceId, "piece-1");
  assert.ok(spec.components.length >= 5);
  assert.ok(spec.processes.length >= 8);
  assert.equal(spec.components[0].materialId, "linen-woven");
});

test("documented data increases specificity", () => {
  const spec = createSuggestedSpecification({ id: "piece-1", category: "Camisa" });
  const initial = specificityScore(spec);
  spec.components = spec.components.map((item) => ({ ...item, source: "documented", supplier: "Fornecedor A", origin: "Brasil", evidence: "Ficha técnica 01" }));
  spec.processes = spec.processes.map((item) => ({ ...item, source: "measured", facility: "Ateliê A", responsible: "Operação", evidence: "OP-01" }));
  const improved = specificityScore(spec);
  assert.ok(improved > initial);
  assert.ok(improved >= 70);
});

test("estimates unit and batch impact transparently", () => {
  const spec = createSuggestedSpecification({ id: "piece-1", category: "Calça", material: "algodão", mass: 500, waste: 12 });
  const result = estimateProductionImpact(spec, 20);
  assert.ok(result.carbonPerUnit > 0);
  assert.equal(result.carbonBatch, result.carbonPerUnit * 20);
  assert.ok(result.waterBatch > result.waterPerUnit);
  assert.ok(result.totalMassG > 500);
});

test("derives gaps from reference-only information", () => {
  const spec = createSuggestedSpecification({ id: "piece-1", category: "Vestido" });
  const gaps = deriveGaps(spec);
  assert.ok(gaps.length > 0);
  assert.ok(gaps.some((gap) => gap.text.includes("referência")));
});
