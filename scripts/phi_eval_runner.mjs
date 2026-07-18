#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      args[key] = value;
    }
  }
  return args;
}

function mean(xs) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

function percentile(xs, q) {
  if (!xs.length) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const index = (sorted.length - 1) * q;
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo);
}

function wilson(successes, total, z = 1.959963984540054) {
  if (!total) return { lower: null, upper: null };
  const p = successes / total;
  const denominator = 1 + (z ** 2) / total;
  const center = (p + (z ** 2) / (2 * total)) / denominator;
  const half = z * Math.sqrt((p * (1 - p)) / total + (z ** 2) / (4 * total ** 2)) / denominator;
  return { lower: Math.max(0, center - half), upper: Math.min(1, center + half) };
}

function binaryCalibration(rows, bins = 10) {
  const known = rows.filter(r => Number.isFinite(r.confidence) && typeof r.correct === "boolean");
  if (!known.length) return { brierScore: null, expectedCalibrationError: null, bins: [] };
  const brierScore = mean(known.map(r => (r.confidence - (r.correct ? 1 : 0)) ** 2));
  const bucketRows = [];
  for (let i = 0; i < bins; i += 1) {
    const lower = i / bins;
    const upper = (i + 1) / bins;
    const items = known.filter(r => r.confidence >= lower && (i === bins - 1 ? r.confidence <= upper : r.confidence < upper));
    if (!items.length) continue;
    const confidence = mean(items.map(r => r.confidence));
    const accuracy = mean(items.map(r => r.correct ? 1 : 0));
    bucketRows.push({ lower, upper, count: items.length, confidence, accuracy, gap: Math.abs(confidence - accuracy) });
  }
  const expectedCalibrationError = bucketRows.reduce((sum, b) => sum + (b.count / known.length) * b.gap, 0);
  return { brierScore, expectedCalibrationError, bins: bucketRows };
}

function groupBy(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

function rate(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

function summarize(rows) {
  const total = rows.length;
  const valid = rows.filter(r => r.valid !== false);
  const successes = valid.filter(r => r.success_level === "integral_success" && r.critical_error !== true);
  const responded = valid.filter(r => r.responded === true && r.abstained !== true);
  const wrongResponded = responded.filter(r => r.correct === false);
  const expectedAbstention = valid.filter(r => r.expected_abstention === true);
  const abstained = valid.filter(r => r.abstained === true);
  const correctAbstentions = valid.filter(r => r.expected_abstention === true && r.abstained === true);
  const criticalKnown = valid.filter(r => typeof r.critical_error === "boolean");
  const hallucinationKnown = valid.filter(r => typeof r.hallucination === "boolean");
  const claimKnown = valid.filter(r => Number.isFinite(r.claims_evaluated) && Number.isFinite(r.unsupported_claims));
  const latencies = valid.map(r => r.latency_ms).filter(Number.isFinite);
  const confidence = binaryCalibration(valid);
  const interval = wilson(successes.length, valid.length);
  const labels = valid.filter(r => r.actual_label != null && r.predicted_label != null);
  const top1 = labels.filter(r => r.actual_label === r.predicted_label).length;
  const top3 = labels.filter(r => Array.isArray(r.top_k) && r.top_k.includes(r.actual_label)).length;

  return {
    n_total: total,
    n_valid: valid.length,
    n_success: successes.length,
    observed_success: rate(successes.length, valid.length),
    wilson_lower_95: interval.lower,
    wilson_upper_95: interval.upper,
    conservative_reliability: interval.lower,
    response_coverage: rate(responded.length, valid.length),
    selective_risk: rate(wrongResponded.length, responded.length),
    abstention_recall: rate(correctAbstentions.length, expectedAbstention.length),
    abstention_precision: rate(correctAbstentions.length, abstained.length),
    critical_error_rate: rate(criticalKnown.filter(r => r.critical_error).length, criticalKnown.length),
    hallucination_run_rate: rate(hallucinationKnown.filter(r => r.hallucination).length, hallucinationKnown.length),
    unsupported_claim_rate: rate(
      claimKnown.reduce((a, r) => a + r.unsupported_claims, 0),
      claimKnown.reduce((a, r) => a + r.claims_evaluated, 0)
    ),
    brier_score: confidence.brierScore,
    expected_calibration_error: confidence.expectedCalibrationError,
    calibration_bins: confidence.bins,
    latency_ms: {
      p50: percentile(latencies, 0.50),
      p95: percentile(latencies, 0.95),
      p99: percentile(latencies, 0.99),
    },
    classification: {
      n: labels.length,
      top1_accuracy: rate(top1, labels.length),
      top3_accuracy: rate(top3, labels.length),
    },
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.input) {
    throw new Error("Uso: node phi_eval_runner.mjs --input runs.jsonl --out-dir output");
  }
  const inputPath = resolve(String(args.input));
  const outDir = resolve(String(args["out-dir"] || dirname(inputPath)));
  const lines = (await readFile(inputPath, "utf8")).split(/\r?\n/).filter(Boolean);
  const rows = lines.map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`JSON inválido na linha ${index + 1}: ${error.message}`); }
  });
  const required = ["run_id", "case_id", "configuration_id", "scenario_id", "success_level"];
  for (const [index, row] of rows.entries()) {
    for (const key of required) {
      if (row[key] == null) throw new Error(`Campo ${key} ausente na linha ${index + 1}`);
    }
  }

  const overall = summarize(rows);
  const groups = groupBy(rows, r => `${r.configuration_id}|||${r.scenario_id}|||${r.task_family || "unknown"}`);
  const byGroup = [...groups.entries()].map(([key, items]) => {
    const [configuration_id, scenario_id, task_family] = key.split("|||");
    return { configuration_id, scenario_id, task_family, ...summarize(items) };
  });

  const payload = {
    metric_version: "phi-reliability-v1",
    generated_at: new Date().toISOString(),
    input_path: inputPath,
    overall,
    groups: byGroup,
  };
  const canonical = JSON.stringify(payload);
  payload.report_hash = createHash("sha256").update(canonical).digest("hex");

  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, "phi_reliability_metrics.json");
  await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const columns = [
    "configuration_id","scenario_id","task_family","n_valid","n_success",
    "observed_success","wilson_lower_95","wilson_upper_95","response_coverage",
    "selective_risk","critical_error_rate","hallucination_run_rate",
    "brier_score","expected_calibration_error","latency_p50_ms","latency_p95_ms","latency_p99_ms"
  ];
  const csv = [columns.join(",")];
  for (const g of byGroup) {
    const values = [
      g.configuration_id,g.scenario_id,g.task_family,g.n_valid,g.n_success,
      g.observed_success,g.wilson_lower_95,g.wilson_upper_95,g.response_coverage,
      g.selective_risk,g.critical_error_rate,g.hallucination_run_rate,
      g.brier_score,g.expected_calibration_error,
      g.latency_ms.p50,g.latency_ms.p95,g.latency_ms.p99
    ].map(v => v == null ? "" : JSON.stringify(v));
    csv.push(values.join(","));
  }
  await writeFile(join(outDir, "phi_reliability_metrics.csv"), `${csv.join("\n")}\n`, "utf8");
  console.log(JSON.stringify({ jsonPath, groups: byGroup.length, reportHash: payload.report_hash }, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
