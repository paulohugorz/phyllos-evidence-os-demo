import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { generateSyntheticRecords, DEFAULT_CATEGORIES } from "../src/pi5-synthetic-fixtures.js";
import { sha256 } from "../src/pi5-training-data.js";

function args(argv) {
  return Object.fromEntries(argv.slice(2).map((item) => {
    const [key, ...rest] = item.replace(/^--/, "").split("=");
    return [key, rest.join("=") || true];
  }));
}

const options = args(process.argv);
const count = Number(options.count || 720);
const seed = String(options.seed || "pi5-synthetic-v3");
const invalidRate = Number(options.invalidRate ?? 0.08);
const outputDir = resolve(String(options.output || "data/pi5/agent-execution/v3-synthetic/raw"));
const records = generateSyntheticRecords({ count, seed, invalidRate });
await mkdir(outputDir, { recursive: true });
const content = records.map((record) => JSON.stringify(record)).join("\n") + "\n";
await writeFile(resolve(outputDir, "synthetic-records.jsonl"), content);
const manifest = {
  type: "synthetic_fixture_generation",
  synthetic: true,
  empiricalPerformanceClaimAllowed: false,
  count: records.length,
  categories: DEFAULT_CATEGORIES,
  seed,
  invalidRate,
  contentHash: sha256(content),
  generatedAt: new Date().toISOString(),
};
await writeFile(resolve(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify(manifest, null, 2));
