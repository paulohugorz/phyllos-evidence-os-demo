import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { buildDataset, sha256 } from "../src/pi5-training-data.js";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || true];
}));
const inputPath = resolve(String(args.input || "data/pi5/training/eligible-records.jsonl"));
const outputDir = resolve(String(args.output || "data/pi5/datasets/latest"));
const salt = String(args.salt || process.env.PI5_SPLIT_SALT || "development-only-salt");
const datasetName = String(args.name || "phyllos-pi5-gold");
const version = String(args.version || new Date().toISOString().slice(0, 10));

const text = await readFile(inputPath, "utf8");
const records = text.split("\n").filter(Boolean).map((line, index) => {
  try { return JSON.parse(line); }
  catch (error) { throw new Error(`JSON inválido em ${basename(inputPath)}:${index + 1}: ${error.message}`); }
});
const result = buildDataset(records, { datasetName, version, salt });
await mkdir(outputDir, { recursive: true });
for (const [split, rows] of Object.entries(result.splits)) {
  const content = rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : "");
  const file = `${split}.jsonl`;
  await writeFile(join(outputDir, file), content, "utf8");
  result.manifest.files[file] = { records: rows.length, sha256: sha256(content) };
}
const quarantineContent = result.quarantine.map((row) => JSON.stringify(row)).join("\n") + (result.quarantine.length ? "\n" : "");
await writeFile(join(outputDir, "quarantine.jsonl"), quarantineContent, "utf8");
result.manifest.files["quarantine.jsonl"] = { records: result.quarantine.length, sha256: sha256(quarantineContent) };
result.manifest.manifestHash = sha256({ ...result.manifest, manifestHash: undefined });
await writeFile(join(outputDir, "manifest.json"), JSON.stringify(result.manifest, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ outputDir, ...result.manifest }, null, 2));
if (result.leakage.length) process.exitCode = 2;
