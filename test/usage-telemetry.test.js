import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileUsageRepository, normalizeUsageEvent } from "../src/usage-telemetry.js";

const input = (overrides = {}) => ({
  eventId: "event-1", sessionId: "session-1", name: "ui_action",
  page: "/", component: "refresh", action: "activate",
  metadata: { targetType: "button" }, occurredAt: "2026-07-21T20:00:00.000Z",
  ...overrides,
});

test("telemetria minimiza metadados e rejeita conteúdo livre", () => {
  const event = normalizeUsageEvent(input({ metadata: {
    fieldType: "textarea", value: "conteúdo confidencial", email: "pessoa@example.com",
  } }));
  assert.deepEqual(event.metadata, { fieldType: "textarea" });
});

test("telemetria rejeita eventos fora do contrato", () => {
  assert.throws(() => normalizeUsageEvent(input({ name: "raw_input_capture" })), /não permitido/);
});

test("repositório local é append-only e idempotente", async () => {
  const dir = await mkdtemp(join(tmpdir(), "usage-events-"));
  try {
    const repository = new FileUsageRepository({ dataDir: dir });
    await repository.append(input());
    const duplicate = await repository.append(input());
    assert.equal(duplicate.duplicate, true);
    assert.equal((await repository.list()).length, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
