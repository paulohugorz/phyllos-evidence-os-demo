import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FilePI5Repository } from "../src/pi5-persistence.js";
import { PI5MLOpsStore } from "../src/pi5-mlops.js";

test("repositório local preserva eventos e idempotência", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pi5-persistence-"));
  try {
    const repository = new FilePI5Repository({ dataDir: dir });
    const event = { id: "event-1", eventType: "production_event", occurredAt: "2026-07-17T12:00:00.000Z", entityId: "piece-1" };
    await repository.append(event);
    await repository.append(event);
    const events = await repository.list();
    assert.equal(events.length, 1);
    assert.equal(events[0].id, "event-1");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("PI5MLOpsStore calcula, persiste e resume feedback validado", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pi5-store-"));
  try {
    const repository = new FilePI5Repository({ dataDir: dir });
    const store = new PI5MLOpsStore({ repository, modelPath: join(dir, "missing-model.json") });
    const prediction = await store.predict({ entityId: "piece-2", category: "camisa", carbonKg: 3.2, waterL: 2000, wastePct: 10, coverage: 82, confidence: 75 });
    assert.ok(prediction.predictionId);
    await store.feedback({ predictionId: prediction.predictionId, expertScore: 3.7, validatedBy: "especialista-1" });
    const summary = await store.summary();
    assert.equal(summary.predictions, 1);
    assert.equal(summary.validatedFeedback, 1);
    assert.equal(summary.readyForTraining, false);
    const exported = await store.exportJsonl();
    assert.match(exported, /expert_feedback/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
