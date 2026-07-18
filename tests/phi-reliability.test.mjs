import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("runner produces Wilson metrics and preserves synthetic status", async () => {
  const dir = await mkdtemp(join(tmpdir(), "phi-reliability-"));
  const result = spawnSync(process.execPath, [
    new URL("../scripts/phi_eval_runner.mjs", import.meta.url).pathname,
    "--input",
    new URL("./fixtures/phi-smoke-v3-runs.jsonl", import.meta.url).pathname,
    "--out-dir",
    dir
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(await readFile(join(dir, "phi_reliability_metrics.json"), "utf8"));
  assert.equal(payload.overall.n_valid, 101);
  assert.equal(payload.overall.n_success, 74);
  assert.ok(payload.overall.wilson_lower_95 < payload.overall.observed_success);
  assert.ok(payload.overall.wilson_upper_95 > payload.overall.observed_success);
  assert.equal(payload.groups.length, 1);
});
