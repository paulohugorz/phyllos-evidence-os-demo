import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { sha256 } from "../src/pi5-training-data.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL é obrigatória");
const { Pool } = await import("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: false } : undefined });

const qualityRules = [
  ["EVIDENCE_HASH_VALID", "1.0", "evidence", "critical", "Evidência deve possuir hash SHA-256 válido"],
  ["REAL_SAMPLE_NOT_SYNTHETIC", "1.0", "sample", "critical", "Amostra real não pode estar marcada como sintética"],
  ["MINIMUM_COVERAGE_80", "1.0", "sample", "error", "Cobertura mínima para conjunto ouro é 80%"],
  ["MINIMUM_CONFIDENCE_70", "1.0", "sample", "error", "Confiança mínima para conjunto ouro é 70%"],
  ["TWO_INDEPENDENT_REVIEWERS", "1.0", "label", "critical", "Conjunto ouro exige dois revisores independentes"],
  ["NO_LINEAGE_SPLIT_LEAKAGE", "1.0", "split", "critical", "Uma linhagem não pode aparecer em splits diferentes"],
  ["NO_ASSET_SPLIT_LEAKAGE", "1.0", "split", "critical", "O mesmo ativo não pode aparecer em splits diferentes"],
  ["VALID_INSTRUMENT_CALIBRATION", "1.0", "measurement", "error", "Medições instrumentais exigem calibração válida"],
  ["CONFLICTS_ADJUDICATED", "1.0", "label", "critical", "Conflitos relevantes precisam de adjudicação"],
  ["GOLD_SNAPSHOT_IMMUTABLE", "1.0", "dataset", "critical", "Rótulo ouro precisa ser congelado e imutável"],
];

const methods = [
  ["MASS_SCALE", "Massa por balança", "1.0", "g", 0.5],
  ["FABRIC_AREA_MANUAL", "Área de tecido por medição manual", "1.0", "m2", 0.01],
  ["WASTE_WEIGHING", "Resíduo de corte por pesagem", "1.0", "g", 1.0],
  ["DURABILITY_DECLARED", "Durabilidade declarada e documentada", "1.0", "uses", 5.0],
  ["LAB_COMPOSITION", "Composição por laudo laboratorial", "1.0", "%", 1.0],
];

const protocolPath = resolve("docs/pi5/LABELING-PROTOCOL.md");
const protocolContent = await readFile(protocolPath, "utf8");
const captureInstructions = {
  views: ["frente", "costas", "etiqueta_composicao", "macro_trama", "elasticidade", "transparencia"],
  measurements: ["mass_g", "fabric_area_m2", "waste_pct"],
  rule: "captura deve preservar imagem original, hash, dispositivo, operador e momento",
};

try {
  await pool.query("BEGIN");
  for (const [code, version, scope, severity, description] of qualityRules) {
    await pool.query(`
      INSERT INTO pi5_quality_rules (rule_code, rule_version, scope, severity, description, active)
      VALUES ($1,$2,$3,$4,$5,TRUE)
      ON CONFLICT (rule_code, rule_version) DO UPDATE SET description=EXCLUDED.description, severity=EXCLUDED.severity, active=TRUE
    `, [code, version, scope, severity, description]);
  }
  for (const [code, name, version, unit, uncertainty] of methods) {
    await pool.query(`
      INSERT INTO pi5_measurement_methods (method_code, name, method_version, default_unit, expected_uncertainty, active)
      VALUES ($1,$2,$3,$4,$5,TRUE)
      ON CONFLICT (method_code) DO UPDATE SET name=EXCLUDED.name, method_version=EXCLUDED.method_version, default_unit=EXCLUDED.default_unit, expected_uncertainty=EXCLUDED.expected_uncertainty, active=TRUE
    `, [code, name, version, unit, uncertainty]);
  }
  await pool.query(`
    INSERT INTO pi5_capture_protocols (
      protocol_code, version, category_scope, required_views, required_metrics,
      minimum_evidence_count, instructions, content_hash, status, approved_at
    ) VALUES ('PI5-PHYSICAL-CAPTURE','1.0','{}'::text[],$1,$2,6,$3::jsonb,$4,'approved',NOW())
    ON CONFLICT (protocol_code, version) DO NOTHING
  `, [captureInstructions.views, captureInstructions.measurements, JSON.stringify(captureInstructions), sha256(captureInstructions)]);
  await pool.query(`
    INSERT INTO pi5_reference_versions (
      reference_type, reference_key, version, content_hash, effective_from, status, approved_at, metadata
    ) VALUES ('labeling_protocol','PI5-LABELING','1.0',$1,NOW(),'approved',NOW(),$2::jsonb)
    ON CONFLICT (reference_type, reference_key, version) DO NOTHING
  `, [sha256(protocolContent), JSON.stringify({ source: protocolPath })]);
  await pool.query("COMMIT");
  console.log(JSON.stringify({ seeded: true, qualityRules: qualityRules.length, measurementMethods: methods.length, captureProtocol: "PI5-PHYSICAL-CAPTURE@1.0" }, null, 2));
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
