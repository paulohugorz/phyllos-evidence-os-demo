import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { detectLeakage, sha256, validateTrainingRecord } from "../src/pi5-training-data.js";

const directory = resolve(process.argv[2] || "data/pi5/datasets/latest");
const manifest = JSON.parse(await readFile(`${directory}/manifest.json`, "utf8"));
const rowsBySplit = {};
for (const split of ["train", "validation", "test"]) {
  const text = await readFile(`${directory}/${split}.jsonl`, "utf8");
  rowsBySplit[split] = text.split("\n").filter(Boolean).map((line) => ({ ...JSON.parse(line), split }));
  const expected = manifest.files?.[`${split}.jsonl`]?.sha256;
  if (expected && sha256(text) !== expected) throw new Error(`Hash divergente: ${split}.jsonl`);
}
const rows = Object.values(rowsBySplit).flat();
const invalid = rows.map((row) => ({ recordId: row.recordId, ...validateTrainingRecord(row) })).filter((item) => !item.valid);
const leakage = detectLeakage(rows);
const categoryCounts = rows.reduce((acc, row) => {
  acc[row.category] = (acc[row.category] || 0) + 1;
  return acc;
}, {});
const lineageCounts = Object.fromEntries(Object.entries(rowsBySplit).map(([split, splitRows]) => [split, new Set(splitRows.map((row) => row.lineageGroupKey)).size]));
const checks = {
  hashesValid: true,
  records: rows.length,
  invalidRecords: invalid.length,
  leakageIssues: leakage.length,
  splitCounts: Object.fromEntries(Object.entries(rowsBySplit).map(([key, value]) => [key, value.length])),
  lineageCounts,
  categoryCounts,
  manifestContentHash: manifest.contentHash,
};
checks.reportHash = sha256(checks);
console.log(JSON.stringify({ passed: !invalid.length && !leakage.length, checks, invalid, leakage }, null, 2));
if (invalid.length || leakage.length) process.exitCode = 1;
