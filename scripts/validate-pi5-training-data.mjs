import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { detectLeakage, validateTrainingRecord } from "../src/pi5-training-data.js";

const inputPath = resolve(process.argv[2] || "data/pi5/training/eligible-records.jsonl");
const text = await readFile(inputPath, "utf8");
const rows = text.split("\n").filter(Boolean).map((line, index) => {
  try { return JSON.parse(line); }
  catch (error) { throw new Error(`JSON inválido na linha ${index + 1}: ${error.message}`); }
});
const invalid = rows.map((record) => ({ recordId: record.recordId, ...validateTrainingRecord(record) })).filter((item) => !item.valid);
const leakage = detectLeakage(rows);
console.log(JSON.stringify({ records: rows.length, valid: rows.length - invalid.length, invalid, leakage }, null, 2));
if (invalid.length || leakage.length) process.exitCode = 1;
