import test from "node:test";
import assert from "node:assert/strict";
import { maturityGates, requiredSampleSize, stratifiedPlan } from "../src/pi5-sampling-plan.js";

test("amostra necessária cresce quando a margem diminui", () => {
  const broad = requiredSampleSize({ margin: 0.20 });
  const precise = requiredSampleSize({ margin: 0.10 });
  assert.ok(precise.collected > broad.collected);
});

test("plano estratificado preserva total e mínimo", () => {
  const plan = stratifiedPlan({ categories: ["camisa", "camiseta", "calca"], total: 180, minimumPerCategory: 40 });
  assert.equal(Object.values(plan.perCategory).reduce((sum, item) => sum + item.total, 0), 180);
  assert.ok(Object.values(plan.perCategory).every((item) => item.total >= 40));
});

test("gates aumentam progressivamente", () => {
  const gates = maturityGates({ categories: 6 });
  assert.ok(gates.firstCategoryEvaluation.goldSamples > gates.protocolPilot.goldSamples);
  assert.ok(gates.matureEvidenceBase.goldSamples > gates.reliableCalibration.goldSamples);
});
