import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { detectLeakage, sha256, validateTrainingRecord } from "../src/pi5-training-data.js";

function args(argv) { return Object.fromEntries(argv.slice(2).map((item) => { const [key, ...rest] = item.replace(/^--/, "").split("="); return [key, rest.join("=") || true]; })); }
const options = args(process.argv);
const directory = resolve(String(options.dataset || "data/pi5/agent-execution/v3-synthetic/dataset"));
const output = resolve(String(options.output || `${directory}/audit.json`));
const manifest = JSON.parse(await readFile(resolve(directory, "manifest.json"), "utf8"));
const rowsBySplit = {};
for (const split of ["train", "validation", "test"]) {
  const text = await readFile(resolve(directory, `${split}.jsonl`), "utf8");
  rowsBySplit[split] = text.split("\n").filter(Boolean).map((line) => ({ ...JSON.parse(line), split }));
}
const rows = Object.values(rowsBySplit).flat();
const invalid = rows.map((row) => ({ recordId: row.recordId, ...validateTrainingRecord(row) })).filter((item) => !item.valid);
const leakage = detectLeakage(rows);
const checks = {
  synthetic: manifest.synthetic === true,
  empiricalPerformanceClaimAllowed: manifest.empiricalPerformanceClaimAllowed === true,
  records: rows.length,
  invalidRecords: invalid.length,
  leakageIssues: leakage.length,
  splitCounts: Object.fromEntries(Object.entries(rowsBySplit).map(([key, value]) => [key, value.length])),
  lineageCounts: Object.fromEntries(Object.entries(rowsBySplit).map(([key, value]) => [key, new Set(value.map((row) => row.lineageGroupKey)).size])),
  categoryCounts: rows.reduce((acc, row) => { acc[row.category] = (acc[row.category] || 0) + 1; return acc; }, {}),
  manifestContentHash: manifest.contentHash,
};
checks.reportHash = sha256(checks);
const audit = { passed: checks.synthetic && !checks.empiricalPerformanceClaimAllowed && !invalid.length && !leakage.length, checks, invalid, leakage, auditedAt: new Date().toISOString() };
await writeFile(output, JSON.stringify(audit, null, 2) + "\n");
console.log(JSON.stringify(audit, null, 2));
if (!audit.passed) process.exitCode = 1;
