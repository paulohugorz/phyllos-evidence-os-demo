import assert from "node:assert/strict";
import test from "node:test";
import { dueState, explainAlerts, materialNeed, operationalItems, priorityScore } from "../public/operations.js";

test("separa compromissos operacionais de itens somente de portfólio", () => {
  assert.deepEqual(operationalItems([{ mode: "portfolio" }, { mode: "custom" }, { mode: "batch" }]).map(x => x.mode), ["custom", "batch"]);
});

test("explica atraso, bloqueio e falta de material", () => {
  const item = { mode: "batch", dueDate: "2026-07-10", blocked: "yes", blockReason: "aprovação", quantity: 10, mass: 500, waste: 10, materialAvailable: 2 };
  const alerts = explainAlerts(item, new Date("2026-07-17T12:00:00"));
  assert.ok(alerts.some(x => x.code === "late"));
  assert.ok(alerts.some(x => x.code === "blocked"));
  assert.ok(alerts.some(x => x.code === "material"));
  assert.ok(priorityScore(item, new Date("2026-07-17T12:00:00")) >= 20);
});

test("calcula necessidade de material incluindo perda", () => {
  assert.deepEqual(materialNeed({ quantity: 10, mass: 200, waste: 10, materialAvailable: 1 }), { required: 2.2, available: 1, shortage: 1.2000000000000002 });
});

test("classifica prazo próximo sem tratar entregue como risco", () => {
  const today = new Date("2026-07-17T12:00:00");
  assert.equal(dueState({ dueDate: "2026-07-19", stage: "sewing" }, today), "risk");
  assert.equal(dueState({ dueDate: "2026-07-10", stage: "delivered" }, today), "none");
});
