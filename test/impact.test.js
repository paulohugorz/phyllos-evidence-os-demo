import assert from "node:assert/strict";
import test from "node:test";
import { estimateImpact, materialKey } from "../public/impact.js";

test("reconhece famílias de material vindas de outros módulos", () => {
  assert.equal(materialKey("55% linho, 45% viscose"), "linen-viscose");
  assert.equal(materialKey("Poliéster reciclado"), "recycled-polyester");
  assert.equal(materialKey("Algodão rastreável"), "cotton");
});

test("estima impacto incluindo perda, energia e transporte", () => {
  const result = estimateImpact({ material: "cotton", massGrams: 200, quantity: 10, wastePercent: 10, energyKwh: 1, distanceKm: 100 });
  assert.equal(result.materialMassKg, 2.2);
  assert.ok(result.carbon > result.components.material);
  assert.equal(result.water, 22000);
  assert.equal(result.range.low, result.carbon * 0.75);
  assert.equal(result.range.high, result.carbon * 1.25);
});

test("usa fator genérico quando o material ainda é hipótese", () => {
  const result = estimateImpact({ material: "unknown", massGrams: 500, quantity: 1, wastePercent: 0, energyKwh: 0, distanceKm: 0 });
  assert.equal(result.factor.label, "Material não confirmado");
  assert.equal(result.carbon, 3.5);
});
