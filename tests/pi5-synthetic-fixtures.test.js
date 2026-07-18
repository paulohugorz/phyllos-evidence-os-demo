import test from "node:test";
import assert from "node:assert/strict";
import { generateSyntheticRecords } from "../src/pi5-synthetic-fixtures.js";
import { buildDataset, detectLeakage } from "../src/pi5-training-data.js";

test("gerador é determinístico e segrega sintéticos", () => {
  const a = generateSyntheticRecords({ count: 120, seed: "same" });
  const b = generateSyntheticRecords({ count: 120, seed: "same" });
  assert.deepEqual(a, b);
  assert.ok(a.every((record) => record.metadata.synthetic === true));
});

test("dataset cria splits e quarentena sem vazamento", () => {
  const records = generateSyntheticRecords({ count: 360, seed: "dataset", invalidRate: 0.1 });
  const dataset = buildDataset(records, { salt: "private-test-salt", version: "test" });
  assert.ok(dataset.splits.train.length > 0);
  assert.ok(dataset.splits.validation.length > 0);
  assert.ok(dataset.splits.test.length > 0);
  assert.ok(dataset.quarantine.length > 0);
  assert.equal(detectLeakage(Object.values(dataset.splits).flat()).length, 0);
});
