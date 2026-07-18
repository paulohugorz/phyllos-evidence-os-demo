import pg from "pg";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { sha256 } from "../src/pi5-training-data.js";

const { Pool } = pg;
function args(argv) { return Object.fromEntries(argv.slice(2).map((item) => { const [key, ...rest] = item.replace(/^--/, "").split("="); return [key, rest.join("=") || true]; })); }
async function readJsonl(path) { const text = await readFile(path, "utf8"); return text.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)); }
function uuidFrom(text) { const h = sha256(text); return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`; }

const options = args(process.argv);
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não definida");
const root = resolve(String(options.root || "data/pi5/agent-execution/v3-synthetic"));
const version = String(options.version || "3.0.0-synthetic");
const manifest = JSON.parse(await readFile(resolve(root, "dataset/manifest.json"), "utf8"));
const metrics = JSON.parse(await readFile(resolve(root, "evaluation/metrics.json"), "utf8"));
const splits = {};
for (const split of ["train", "validation", "test"]) splits[split] = await readJsonl(resolve(root, `dataset/${split}.jsonl`));
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const org = (await client.query(`INSERT INTO pi5_organizations (canonical_key,name,organization_type,country_code) VALUES ('phyllos-synthetic-lab','PHYLLOS Synthetic Lab','phyllos','BR') ON CONFLICT (canonical_key) DO UPDATE SET name=EXCLUDED.name RETURNING id`)).rows[0];
  const actor = (await client.query(`INSERT INTO pi5_actors (organization_id,canonical_key,display_name,actor_type,active) VALUES ($1,'system:pi5-agent-executor-v3','PI5 Agent Executor v3','system',TRUE) ON CONFLICT (canonical_key) DO UPDATE SET active=TRUE RETURNING id`, [org.id])).rows[0];
  const products = new Map();
  for (const category of [...new Set(Object.values(splits).flat().map((record) => record.category))]) {
    const product = (await client.query(`INSERT INTO pi5_products (organization_id,canonical_key,product_family_key,sku,category,name) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (organization_id,canonical_key) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [org.id, `synthetic-product:${category}`, `synthetic-family:${category}`, `SYN-${category.toUpperCase()}`, category, `Fixture sintético ${category}`])).rows[0];
    products.set(category, product.id);
  }
  const datasetId = uuidFrom(`dataset:${manifest.datasetName}:${version}`);
  const existing = (await client.query("SELECT manifest_hash, manifest->>'contentHash' AS content_hash FROM pi5_dataset_versions WHERE id=$1", [datasetId])).rows[0];
  if (existing && existing.content_hash !== manifest.contentHash) throw new Error("Versão de dataset já existe com conteúdo diferente");
  await client.query(`INSERT INTO pi5_dataset_versions (id,dataset_name,version,status,purpose,protocol_version,query_definition,split_salt_hash,manifest,manifest_hash,created_by,frozen_at) VALUES ($1,$2,$3,'frozen','synthetic infrastructure validation','pi5-synthetic-labeling-v3',$4::jsonb,$5,$6::jsonb,$7,$8,NOW()) ON CONFLICT (id) DO NOTHING`, [datasetId, manifest.datasetName, version, JSON.stringify({ synthetic: true, source: "agent-execution-v3" }), manifest.splitSaltHash, JSON.stringify(manifest), sha256(manifest), actor.id]);
  for (const [split, records] of Object.entries(splits)) {
    for (const record of records) {
      const sampleId = uuidFrom(record.sampleId);
      const predictionId = uuidFrom(`prediction:${record.recordId}`);
      const sessionId = uuidFrom(`session:${record.recordId}`);
      await client.query(`INSERT INTO pi5_physical_samples (id,product_id,canonical_key,lineage_group_key,sample_kind,collection_status,collected_at,collected_by,storage_location,synthetic) VALUES ($1,$2,$3,$4,'synthetic_fixture','accepted',NOW(),$5,'virtual:pi5-agent-v3',TRUE) ON CONFLICT (canonical_key) DO NOTHING`, [sampleId, products.get(record.category), record.sampleId, record.lineageGroupKey, actor.id]);
      await client.query(`INSERT INTO pi5_predictions_v2 (id,sample_id,prediction_key,methodology_version,benchmark_version,model_version,input_snapshot,result_snapshot,input_hash,methodology_hash,benchmark_hash,model_hash,result_hash,coverage,confidence,publication_status,calculated_at) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13,100,95,'experimental',NOW()) ON CONFLICT (prediction_key) DO NOTHING`, [predictionId, sampleId, `prediction:${record.recordId}`, record.provenance.methodologyVersion, record.provenance.benchmarkVersion, record.provenance.modelVersion, JSON.stringify(record.features), JSON.stringify(record.target), record.provenance.inputHash, sha256(record.provenance.methodologyVersion), sha256(record.provenance.benchmarkVersion), sha256(record.provenance.modelVersion), record.provenance.labelHash]);
      await client.query(`INSERT INTO pi5_labeling_sessions (id,sample_id,prediction_id,protocol_version,blind_review,required_reviewers,session_status,opened_at,closed_at,created_by) VALUES ($1,$2,$3,'pi5-synthetic-labeling-v3',TRUE,2,'closed',NOW(),NOW(),$4) ON CONFLICT (id) DO NOTHING`, [sessionId, sampleId, predictionId, actor.id]);
      await client.query(`INSERT INTO pi5_dataset_split_groups (dataset_version_id,lineage_group_key,split,assignment_hash) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [datasetId, record.lineageGroupKey, split, sha256(`${datasetId}:${record.lineageGroupKey}:${split}`)]);
      await client.query(`INSERT INTO pi5_dataset_members (dataset_version_id,sample_id,prediction_id,labeling_session_id,split,label_tier,feature_snapshot,target_snapshot,record_hash,lineage_group_key) VALUES ($1,$2,$3,$4,$5,'silver',$6::jsonb,$7::jsonb,$8,$9) ON CONFLICT DO NOTHING`, [datasetId, sampleId, predictionId, sessionId, split, JSON.stringify({ ...record.features, synthetic: true }), JSON.stringify({ ...record.target, synthetic: true }), record.recordHash, record.lineageGroupKey]);
    }
  }
  const runKey = `pi5-agent-v3:${version}`;
  await client.query(`INSERT INTO pi5_model_runs (dataset_version_id,run_key,algorithm,code_version,model_config,metrics,slice_metrics,artifact_hash,run_status,completed_at) VALUES ($1,$2,'multi_output_ridge+nearest_centroid','pi5-agent-execution-v3',$3::jsonb,$4::jsonb,$5::jsonb,$6,'evaluated',NOW()) ON CONFLICT (run_key) DO UPDATE SET metrics=EXCLUDED.metrics,slice_metrics=EXCLUDED.slice_metrics,artifact_hash=EXCLUDED.artifact_hash,run_status='evaluated',completed_at=NOW()`, [datasetId, runKey, JSON.stringify({ synthetic: true, confidenceTolerance: 0.5 }), JSON.stringify(metrics), JSON.stringify(metrics.byCategory), metrics.metricsHash]);
  await client.query("COMMIT");
  console.log(JSON.stringify({ registered: true, datasetId, runKey, splitCounts: manifest.splitCounts, metricsHash: metrics.metricsHash }, null, 2));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
