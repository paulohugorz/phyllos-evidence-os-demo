import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { PI5TrainingPostgresStore } from "../src/pi5-training-postgres.js";
import { sha256 } from "../src/pi5-training-data.js";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || true];
}));
const output = resolve(String(args.output || "data/pi5/training/eligible-records.jsonl"));
const store = new PI5TrainingPostgresStore();
try {
  const rows = await store.exportEligibleRecords();
  const content = rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : "");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, content, "utf8");
  console.log(JSON.stringify({ output, records: rows.length, sha256: sha256(content) }, null, 2));
} finally {
  await store.close();
}
