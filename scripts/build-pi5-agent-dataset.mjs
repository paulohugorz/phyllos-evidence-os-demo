import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildDataset, sha256 } from "../src/pi5-training-data.js";

function args(argv) { return Object.fromEntries(argv.slice(2).map((item) => { const [key, ...rest] = item.replace(/^--/, "").split("="); return [key, rest.join("=") || true]; })); }
const options = args(process.argv);
const input = resolve(String(options.input || "data/pi5/agent-execution/v3-synthetic/raw/synthetic-records.jsonl"));
const outputDir = resolve(String(options.output || "data/pi5/agent-execution/v3-synthetic/dataset"));
const version = String(options.version || "3.0.0-synthetic");
const salt = String(process.env.PI5_SPLIT_SALT || options.salt || "pi5-synthetic-v3-local-only");
const content = await readFile(input, "utf8");
const records = content.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const dataset = buildDataset(records, { datasetName: "phyllos-pi5-synthetic-validation", version, protocolVersion: "pi5-synthetic-labeling-v3", salt });
await mkdir(outputDir, { recursive: true });
for (const [split, values] of Object.entries(dataset.splits)) await writeFile(resolve(outputDir, `${split}.jsonl`), values.map((value) => JSON.stringify(value)).join("\n") + (values.length ? "\n" : ""));
await writeFile(resolve(outputDir, "quarantine.jsonl"), dataset.quarantine.map((value) => JSON.stringify(value)).join("\n") + (dataset.quarantine.length ? "\n" : ""));
const manifest = {
  ...dataset.manifest,
  synthetic: true,
  empiricalPerformanceClaimAllowed: false,
  splitSaltHash: sha256(salt),
  sourceHash: sha256(content),
  recommendedUses: [
    "Validação da infraestrutura de dados e MLOps",
    "Teste de splits, quarentena, métricas e relatórios",
    "Ensaio de integração com o PostgreSQL privado"
  ],
  prohibitedUses: [
    "Claims de desempenho empírico do PI5",
    "Mistura com o conjunto ouro físico",
    "Certificação ou decisão ambiental sobre produtos reais"
  ]
};
await writeFile(resolve(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify(manifest, null, 2));
