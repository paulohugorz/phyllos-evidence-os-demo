#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.PI5_TRAINING_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("PI5_TRAINING_DATABASE_URL não definida.");

const metricsPath = new URL("../data/phi_smoke_v3_metrics.json", import.meta.url);
const registryPath = new URL("../config/phi_configuration_registry.json", import.meta.url);
const metrics = JSON.parse(await readFile(metricsPath, "utf8"));
const registry = JSON.parse(await readFile(registryPath, "utf8"));
const config = registry.configurations.find(c => c.configuration_id === metrics.configuration_id);
if (!config) throw new Error("Configuração sintética não encontrada.");

const configHash = createHash("sha256").update(JSON.stringify(config)).digest("hex");
const snapshotHash = createHash("sha256").update(JSON.stringify(metrics)).digest("hex");
const decision = {
  configuration_id: config.configuration_id,
  scope: "PI5 smoke test sintético v3",
  decision: "experimental",
  rationale: "Aprova a infraestrutura, mas bloqueia alegações empíricas e produção autônoma.",
  blocking_failures: [
    "dataset totalmente sintético",
    "sem avaliação de abstinência",
    "sem telemetria operacional",
    "classificação Top-1 insuficiente",
    "intervalo preditivo abaixo da cobertura nominal"
  ]
};
const decisionHash = createHash("sha256").update(JSON.stringify(decision)).digest("hex");

const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query(`
    INSERT INTO pi5_experiment_configurations (
      configuration_id, official_model_name, model_family, repository_or_catalog,
      checkpoint_version_or_hash, runtime, library_versions, quantization, hardware,
      generation_parameters, tools, prompt_version, validators_version,
      postprocessors_version, execution_condition, dataset_version,
      completeness_status, promotion_scope, configuration_hash
    ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$14,$15,$16,$17,$18,$19)
    ON CONFLICT (configuration_id) DO UPDATE SET
      official_model_name = EXCLUDED.official_model_name,
      checkpoint_version_or_hash = EXCLUDED.checkpoint_version_or_hash,
      configuration_hash = EXCLUDED.configuration_hash
  `, [
    config.configuration_id, config.official_model_name, config.model_family,
    config.repository_or_catalog, config.checkpoint_version_or_hash, config.runtime,
    JSON.stringify(config.libraries), config.quantization, JSON.stringify(config.hardware),
    JSON.stringify(config.generation), JSON.stringify(config.tools), config.prompt_version,
    config.validators_version, config.postprocessors_version, config.execution_condition,
    config.dataset_version, config.completeness_status, config.promotion_scope, configHash
  ]);

  await client.query(`
    INSERT INTO pi5_scenario_reliability_snapshots (
      configuration_id, scenario_id, metric_version, success_definition,
      n_total, n_valid, n_success, observed_success, wilson_lower_95,
      wilson_upper_95, conservative_reliability, response_coverage,
      selective_risk, hallucination_rate, critical_error_rate, ece, brier_score,
      latency_p50_ms, latency_p95_ms, latency_p99_ms, additional_metrics,
      synthetic, snapshot_hash
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb,$22,$23
    )
    ON CONFLICT (configuration_id, scenario_id, metric_version, snapshot_hash) DO NOTHING
  `, [
    metrics.configuration_id, metrics.scenario_id, metrics.metric_version,
    metrics.success_definition, metrics.n_total, metrics.n_valid, metrics.n_success,
    metrics.observed_success, metrics.wilson_lower_95, metrics.wilson_upper_95,
    metrics.conservative_reliability, metrics.response_coverage, metrics.selective_risk,
    metrics.hallucination_rate, metrics.critical_error_rate, metrics.ece,
    metrics.brier_score, metrics.latency_p50_ms, metrics.latency_p95_ms,
    metrics.latency_p99_ms, JSON.stringify(metrics.additional_metrics),
    metrics.synthetic, snapshotHash
  ]);

  await client.query(`
    INSERT INTO pi5_promotion_decisions (
      configuration_id, scope, decision, rationale, blocking_failures, decision_hash
    ) VALUES ($1,$2,$3,$4,$5::jsonb,$6)
    ON CONFLICT (decision_hash) DO NOTHING
  `, [
    decision.configuration_id, decision.scope, decision.decision, decision.rationale,
    JSON.stringify(decision.blocking_failures), decisionHash
  ]);
  await client.query("COMMIT");
  console.log(JSON.stringify({ registered: true, configurationId: config.configuration_id, snapshotHash, decision: decision.decision }, null, 2));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
